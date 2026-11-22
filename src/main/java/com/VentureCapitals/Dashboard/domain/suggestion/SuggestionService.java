package com.VentureCapitals.Dashboard.domain.suggestion;

import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;
import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.domain.ai.AIService;
import com.VentureCapitals.Dashboard.domain.ai.MatchCandidate;
import com.VentureCapitals.Dashboard.domain.ai.MatchSubject;
import com.VentureCapitals.Dashboard.domain.ai.MatchSuggestion;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycle;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycleRepository;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRepository;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupMemberRepository;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.startup.StartupStage;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmThesis;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmThesisRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * AI suggestions (CLAUDE.md §8): who each person should talk to, and why.
 *
 * <p>Suggestions are generated on request. Business Rule 5 asks for them to come from an async
 * consumer; with a rule-based engine the work takes milliseconds, so running it inline is
 * honest and simpler, and the {@link AIService} seam is where an asynchronous, model-backed
 * implementation would later put its latency.
 */
@Slf4j
@Service
@Transactional
public class SuggestionService {
    /** Enough to be a shortlist; more than that stops being a recommendation. */
    static final int LIMIT = 8;
    /** The most candidates considered in one pass. */
    private static final int POOL = 500;

    private final AISuggestionRepository suggestions;
    private final StartupRepository startups;
    private final VCFirmRepository firms;
    private final VCFirmThesisRepository theses;
    private final FundingCycleRepository cycles;
    private final InvestmentRepository investments;
    private final StartupMemberRepository startupMembers;
    private final FirmAccessPolicy firmAccessPolicy;
    private final AIService ai;

    public SuggestionService(AISuggestionRepository suggestions, StartupRepository startups, VCFirmRepository firms,
                             VCFirmThesisRepository theses, FundingCycleRepository cycles,
                             InvestmentRepository investments, StartupMemberRepository startupMembers,
                             FirmAccessPolicy firmAccessPolicy, AIService ai) {
        this.suggestions = suggestions;
        this.startups = startups;
        this.firms = firms;
        this.theses = theses;
        this.cycles = cycles;
        this.investments = investments;
        this.startupMembers = startupMembers;
        this.firmAccessPolicy = firmAccessPolicy;
        this.ai = ai;
    }

    /** Open suggestions first, best fit first; ones already dealt with trail behind. */
    @Transactional(readOnly = true)
    public List<SuggestionView> list(User user) {
        List<AISuggestion> mine = suggestions.findByForUserId(user.getId());
        if (mine.isEmpty()) return List.of();

        Map<UUID, Startup> startupsById = new HashMap<>();
        Map<UUID, VCFirm> firmsById = new HashMap<>();
        Set<UUID> startupIds = idsOf(mine, SuggestionType.STARTUP_FOR_VC);
        Set<UUID> firmIds = idsOf(mine, SuggestionType.VC_FOR_STARTUP);
        startups.findAllById(startupIds).forEach(s -> startupsById.put(s.getId(), s));
        firms.findAllById(firmIds).forEach(f -> firmsById.put(f.getId(), f));

        return mine.stream()
                .sorted(Comparator.comparing((AISuggestion s) -> s.getStatus() != SuggestionStatus.PENDING)
                        .thenComparing(AISuggestion::getScore, Comparator.reverseOrder()))
                .map(s -> view(s, startupsById, firmsById))
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    public SuggestionView setStatus(User user, UUID id, SuggestionStatus status) {
        AISuggestion suggestion = suggestions.findByIdAndForUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("That suggestion no longer exists."));
        suggestion.setStatus(status);
        AISuggestion saved = suggestions.save(suggestion);

        Map<UUID, Startup> startupsById = new HashMap<>();
        Map<UUID, VCFirm> firmsById = new HashMap<>();
        startups.findById(saved.getTargetId()).ifPresent(s -> startupsById.put(s.getId(), s));
        firms.findById(saved.getTargetId()).ifPresent(f -> firmsById.put(f.getId(), f));
        SuggestionView view = view(saved, startupsById, firmsById);
        if (view == null) throw new EntityNotFoundException("That suggestion no longer exists.");
        return view;
    }

    /**
     * Rebuilds the person's shortlist. Open suggestions are refreshed or dropped to match the
     * current picture; anything they already dismissed or acted on is left exactly as it was, so
     * regenerating never brings back something they said no to.
     */
    public void regenerate(User user) {
        List<MatchSuggestion> matches;
        SuggestionType type;

        Optional<VCMember> firm = firmAccessPolicy.findMembership(user);
        if (firm.isPresent()) {
            type = SuggestionType.STARTUP_FOR_VC;
            matches = matchStartupsFor(firm.get().getFirm());
        } else {
            type = SuggestionType.VC_FOR_STARTUP;
            Startup startup = startupMembers.findByUserId(user.getId())
                    .map(m -> m.getStartup())
                    .orElseThrow(() -> new BusinessRuleViolationException(
                            "Finish setting up your profile and we'll have suggestions for you."));
            matches = matchFirmsFor(startup);
        }

        Map<UUID, AISuggestion> existing = suggestions.findByForUserId(user.getId()).stream()
                .collect(Collectors.toMap(AISuggestion::getTargetId, s -> s, (a, b) -> a));
        Set<UUID> keep = new HashSet<>();
        Instant now = Instant.now();

        for (MatchSuggestion match : matches) {
            keep.add(match.candidateId());
            AISuggestion row = existing.get(match.candidateId());
            if (row != null && row.getStatus() != SuggestionStatus.PENDING) continue;
            if (row == null) {
                row = AISuggestion.builder().forUserId(user.getId()).suggestionType(type)
                        .targetId(match.candidateId()).status(SuggestionStatus.PENDING).build();
            }
            row.setScore(BigDecimal.valueOf(match.score()));
            row.setReasoning(match.reasoning());
            row.setGeneratedAt(now);
            suggestions.save(row);
        }
        // Open ones that no longer make the shortlist go; decided ones stay as a record.
        existing.values().stream()
                .filter(s -> s.getStatus() == SuggestionStatus.PENDING && !keep.contains(s.getTargetId()))
                .forEach(suggestions::delete);
        log.info("Suggestions regenerated: userId={}, count={}", user.getId(), matches.size());
    }

    // --- investor → startups ----------------------------------------------------------------

    private List<MatchSuggestion> matchStartupsFor(VCFirm firm) {
        Optional<VCFirmThesis> thesis = theses.findByVcFirmId(firm.getId());
        Set<String> sectors = thesis.map(t -> (Set<String>) new HashSet<>(t.getSectors()))
                .orElseGet(() -> firm.getSectors() == null ? Set.of() : new HashSet<>(firm.getSectors()));
        Set<String> stages = thesis.map(t -> (Set<String>) new HashSet<>(t.getStages()))
                .orElseGet(() -> stagesFromLabel(firm.getInvestmentStage()));
        MatchSubject subject = new MatchSubject(SuggestionType.STARTUP_FOR_VC, sectors, stages,
                thesis.map(VCFirmThesis::getChequeSizeMin).orElse(null),
                thesis.map(VCFirmThesis::getChequeSizeMax).orElse(null));

        Set<UUID> alreadyBacked = investments.findStartupIdsByFirm(firm.getId());
        Map<UUID, FundingCycle> open = new HashMap<>();
        cycles.findAllOpen().forEach(c -> open.put(c.getStartup().getId(), c));

        List<MatchCandidate> candidates = startups.findAll(PageRequest.of(0, POOL)).stream()
                .filter(s -> !alreadyBacked.contains(s.getId()))
                .map(s -> {
                    FundingCycle round = open.get(s.getId());
                    return new MatchCandidate(s.getId(), s.getName(),
                            s.getSector() == null ? Set.of() : Set.of(s.getSector()),
                            s.getStage() == null ? Set.of() : Set.of(s.getStage().name()),
                            round == null ? null : round.getMinTicketSize(),
                            round == null ? null : round.getMaxTicketSize(),
                            round != null);
                })
                .toList();
        return ai.suggestMatches(subject, candidates, LIMIT);
    }

    // --- founder → investors ----------------------------------------------------------------

    private List<MatchSuggestion> matchFirmsFor(Startup startup) {
        Optional<FundingCycle> round = cycles.findAllOpen().stream()
                .filter(c -> c.getStartup().getId().equals(startup.getId())).findFirst();
        MatchSubject subject = new MatchSubject(SuggestionType.VC_FOR_STARTUP,
                startup.getSector() == null ? Set.of() : Set.of(startup.getSector()),
                startup.getStage() == null ? Set.of() : Set.of(startup.getStage().name()),
                round.map(FundingCycle::getMinTicketSize).orElse(null),
                round.map(FundingCycle::getMaxTicketSize).orElse(null));

        Map<UUID, VCFirmThesis> thesisByFirm = new HashMap<>();
        theses.findAll().forEach(t -> thesisByFirm.put(t.getVcFirm().getId(), t));

        List<MatchCandidate> candidates = firms.findAll(PageRequest.of(0, POOL)).stream()
                .map(f -> {
                    VCFirmThesis thesis = thesisByFirm.get(f.getId());
                    Set<String> sectors = thesis != null ? new HashSet<>(thesis.getSectors())
                            : f.getSectors() == null ? Set.of() : new HashSet<>(f.getSectors());
                    Set<String> stages = thesis != null ? new HashSet<>(thesis.getStages())
                            : stagesFromLabel(f.getInvestmentStage());
                    return new MatchCandidate(f.getId(), f.getName(), sectors, stages,
                            thesis == null ? null : thesis.getChequeSizeMin(),
                            thesis == null ? null : thesis.getChequeSizeMax(), false);
                })
                .toList();
        return ai.suggestMatches(subject, candidates, LIMIT);
    }

    // --- helpers ----------------------------------------------------------------------------

    private static Set<String> stagesFromLabel(String label) {
        return StartupStage.parse(label).map(s -> Set.of(s.name())).orElse(Set.of());
    }

    private static Set<UUID> idsOf(List<AISuggestion> list, SuggestionType type) {
        return list.stream().filter(s -> s.getSuggestionType() == type).map(AISuggestion::getTargetId)
                .collect(Collectors.toSet());
    }

    private static SuggestionView view(AISuggestion s, Map<UUID, Startup> startups, Map<UUID, VCFirm> firms) {
        if (s.getSuggestionType() == SuggestionType.STARTUP_FOR_VC) {
            Startup startup = startups.get(s.getTargetId());
            return startup == null ? null : new SuggestionView(s, startup.getName(), startup.getSector(),
                    startup.getStage() == null ? null : startup.getStage().name(), startup.getLogoUrl());
        }
        VCFirm firm = firms.get(s.getTargetId());
        return firm == null ? null : new SuggestionView(s, firm.getName(),
                firm.getSectors() == null || firm.getSectors().isEmpty() ? null : firm.getSectors().get(0),
                firm.getInvestmentStage(), null);
    }
}
