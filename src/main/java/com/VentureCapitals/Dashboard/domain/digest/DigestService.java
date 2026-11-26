package com.VentureCapitals.Dashboard.domain.digest;

import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.domain.ai.AIService;
import com.VentureCapitals.Dashboard.domain.ai.DigestDraft;
import com.VentureCapitals.Dashboard.domain.ai.DigestFacts;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitmentRepository;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycle;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycleRepository;
import com.VentureCapitals.Dashboard.domain.investment.Investment;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRepository;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentStatus;
import com.VentureCapitals.Dashboard.domain.signals.SignalRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Portfolio Pulse: a written digest of how the portfolio stands, on demand. */
@Slf4j
@Service
@Transactional
public class DigestService {
    /** A digest covers the last month — long enough for a quiet portfolio to have something to say. */
    static final Duration PERIOD = Duration.ofDays(30);

    private final DigestRepository digests;
    private final InvestmentRepository investments;
    private final FundingCycleRepository cycles;
    private final FundingCommitmentRepository commitments;
    private final SignalRepository signals;
    private final FirmAccessPolicy firmAccessPolicy;
    private final AIService ai;
    private final Clock clock;

    public DigestService(DigestRepository digests, InvestmentRepository investments, FundingCycleRepository cycles,
                         FundingCommitmentRepository commitments, SignalRepository signals,
                         FirmAccessPolicy firmAccessPolicy, AIService ai, Clock clock) {
        this.digests = digests;
        this.investments = investments;
        this.cycles = cycles;
        this.commitments = commitments;
        this.signals = signals;
        this.firmAccessPolicy = firmAccessPolicy;
        this.ai = ai;
        this.clock = clock;
    }

    /** "SERIES_A" → "Series A": the enum's name is an identifier, not something to print in a sentence. */
    static String roundLabel(String name) {
        return java.util.Arrays.stream(name.split("_"))
                .map(word -> word.length() <= 1 ? word : word.charAt(0) + word.substring(1).toLowerCase(java.util.Locale.ROOT))
                .collect(Collectors.joining(" "));
    }

    @Transactional(readOnly = true)
    public List<Digest> list(User actor) {
        UUID firmId = firmAccessPolicy.requireAnyMembership(actor).getFirm().getId();
        return digests.findByVcFirmIdOrderByCreatedAtDesc(firmId);
    }

    @Transactional(readOnly = true)
    public Digest get(User actor, UUID id) {
        UUID firmId = firmAccessPolicy.requireAnyMembership(actor).getFirm().getId();
        return digests.findByIdAndVcFirmId(id, firmId)
                .orElseThrow(() -> new EntityNotFoundException("That digest no longer exists."));
    }

    /** Writes a digest of the last month from what the platform already knows. Any member may ask for one. */
    public Digest generate(User actor) {
        VCFirm firm = firmAccessPolicy.requireAnyMembership(actor).getFirm();
        // Serialise per firm: three quick presses used to race on the one-digest-per-day index, and two
        // of them failed with a 500. Now they take turns and each simply refreshes the day's digest.
        digests.lockFirm("digest:" + firm.getId());
        Instant now = Instant.now(clock);
        Instant since = now.minus(PERIOD);

        List<Investment> active = investments.findByVcFirmIdAndStatus(firm.getId(), InvestmentStatus.ACTIVE);
        Set<UUID> companyIds = active.stream().map(i -> i.getStartup().getId()).collect(Collectors.toSet());
        // Looked up per company, so an investment id for each alert can link back to the position.
        var investmentByCompany = active.stream().collect(Collectors.toMap(
                i -> i.getStartup().getId(), Investment::getId, (first, second) -> first));

        List<DigestFacts.Holding> holdings = active.stream()
                .map(i -> new DigestFacts.Holding(i.getId(), i.getStartup().getName(), i.getStartup().getSector(),
                        i.getAmount(), i.getCurrency()))
                .toList();

        List<DigestFacts.OpenRound> rounds = companyIds.isEmpty() ? List.of()
                : cycles.findOpenAmong(companyIds).stream()
                .map((FundingCycle c) -> new DigestFacts.OpenRound(investmentByCompany.get(c.getStartup().getId()),
                        c.getStartup().getName(), roundLabel(c.getRoundType().name())))
                .toList();

        List<DigestFacts.SignalFact> news = companyIds.isEmpty() ? List.of()
                : signals.findAboutStartupsSince(companyIds, since).stream()
                .map(s -> new DigestFacts.SignalFact(investmentByCompany.get(s.getRelatedStartup().getId()),
                        s.getRelatedStartup().getName(), s.getHeadline(), s.getSignalType(), s.getSentiment()))
                .toList();

        List<DigestFacts.UnrecordedPledge> pledges = commitments.findUnrecordedClosedPledges(firm.getId()).stream()
                .map(p -> new DigestFacts.UnrecordedPledge(p.getFundingCycle().getStartup().getName(),
                        p.getAmount(), p.getCurrency()))
                .toList();

        LocalDate from = LocalDate.ofInstant(since, ZoneOffset.UTC);
        LocalDate to = LocalDate.ofInstant(now, ZoneOffset.UTC);
        DigestDraft draft = ai.composeDigest(new DigestFacts(firm.getName(), from, to, holdings, rounds, news, pledges));

        Digest digest = Digest.builder()
                .vcFirm(firm)
                .periodStart(from)
                .periodEnd(to)
                .summaryMarkdown(draft.summaryMarkdown())
                .companyCount(companyIds.size())
                .build();
        draft.alerts().forEach(a -> digest.getAlerts()
                .add(new Digest.Alert(a.investmentId(), a.company(), a.severity(), a.message())));

        // One digest per firm per day. "Generate now" twice used to leave two identical entries; the second
        // press now refreshes the day's digest with whatever changed in between.
        List<Digest> sameDay = digests.findByVcFirmIdAndPeriodEnd(firm.getId(), to);
        if (!sameDay.isEmpty()) {
            digests.deleteAll(sameDay);
            digests.flush();
        }

        Digest saved = digests.save(digest);
        log.info("Digest generated: firmId={}, alerts={}", firm.getId(), saved.getAlerts().size());
        return saved;
    }
}
