package com.VentureCapitals.Dashboard.domain.opportunity;

import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.ValidationException;
import com.VentureCapitals.Dashboard.domain.ai.AIService;
import com.VentureCapitals.Dashboard.domain.ai.CompanyProfile;
import com.VentureCapitals.Dashboard.domain.ai.OpportunityScore;
import com.VentureCapitals.Dashboard.domain.ai.ThesisProfile;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmThesis;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmThesisRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Deal triage: log a company, have it scored against the firm's thesis, then approve or reject.
 *
 * <p>Everything is scoped to the caller's own firm. An opportunity id from another firm is a
 * not-found, never a forbidden, so ids can't be used to learn what another fund is looking at.
 */
@Slf4j
@Service
@Transactional
public class OpportunityService {
    /** The outcomes a person can record. SCORING and PENDING_REVIEW are states the system puts it in. */
    private static final Set<OpportunityStatus> DECISIONS =
            EnumSet.of(OpportunityStatus.APPROVED, OpportunityStatus.REJECTED, OpportunityStatus.NEEDS_MORE_INFO);

    private final OpportunityRepository opportunities;
    private final VCFirmThesisRepository theses;
    private final FirmAccessPolicy firmAccessPolicy;
    private final AIService ai;

    public OpportunityService(OpportunityRepository opportunities, VCFirmThesisRepository theses,
                              FirmAccessPolicy firmAccessPolicy, AIService ai) {
        this.opportunities = opportunities;
        this.theses = theses;
        this.firmAccessPolicy = firmAccessPolicy;
        this.ai = ai;
    }

    @Transactional(readOnly = true)
    public List<Opportunity> list(User actor, OpportunityStatus status) {
        UUID firmId = firmAccessPolicy.requireAnyMembership(actor).getFirm().getId();
        return status == null
                ? opportunities.findByVcFirmIdOrderByCreatedAtDesc(firmId)
                : opportunities.findByVcFirmIdAndStatusOrderByCreatedAtDesc(firmId, status);
    }

    @Transactional(readOnly = true)
    public Opportunity get(User actor, UUID id) {
        return ownOpportunity(actor, id);
    }

    /**
     * Logs a company and scores it on the spot. Any member can log one — spotting companies is
     * everyone's job; deciding on them is not (see {@link #decide}).
     */
    public Opportunity create(User actor, CreateOpportunityRequest request) {
        VCMember membership = firmAccessPolicy.requireAnyMembership(actor);

        Opportunity opportunity = Opportunity.builder()
                .vcFirm(membership.getFirm())
                .createdBy(membership)
                .companyName(request.getCompanyName().trim())
                .website(blankToNull(request.getWebsite()))
                .sector(request.getSector().trim())
                .stage(request.getStage())
                .askAmount(request.getAskAmount())
                .currency(request.getCurrency())
                .description(blankToNull(request.getDescription()))
                .contactEmail(blankToNull(request.getContactEmail()))
                .status(OpportunityStatus.SCORING)
                .build();

        score(opportunity, membership.getFirm().getId());
        Opportunity saved = opportunities.save(opportunity);
        log.info("Opportunity logged: id={}, firmId={}, score={}", saved.getId(), membership.getFirm().getId(), saved.getFitScore());
        return saved;
    }

    /** Scores again against the thesis as it stands now. A decision already taken is left alone. */
    public Opportunity rescore(User actor, UUID id) {
        Opportunity opportunity = ownOpportunity(actor, id);
        score(opportunity, opportunity.getVcFirm().getId());
        return opportunities.save(opportunity);
    }

    /**
     * Records the firm's decision. OWNER or PORTFOLIO_MANAGER only: approving a deal commits the
     * firm's attention and reputation, which is the same authority as writing a cheque.
     */
    public Opportunity decide(User actor, UUID id, DecideOpportunityRequest request) {
        Opportunity opportunity = ownOpportunity(actor, id);
        firmAccessPolicy.require(actor, opportunity.getVcFirm().getId(), FirmAccessPolicy.INVESTMENT_EDITORS);

        if (!DECISIONS.contains(request.getStatus())) {
            throw new ValidationException("A decision is approve, reject, or ask for more information.");
        }
        if (opportunity.getStatus() == OpportunityStatus.SCORING) {
            throw new com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException(
                    "This opportunity is still being scored.");
        }

        opportunity.setStatus(request.getStatus());
        opportunity.setDecisionNote(blankToNull(request.getDecisionNote()));
        return opportunities.save(opportunity);
    }

    // --- helpers ----------------------------------------------------------------------------

    private void score(Opportunity opportunity, UUID firmId) {
        ThesisProfile thesis = theses.findByVcFirmId(firmId).map(OpportunityService::toProfile).orElse(null);
        OpportunityScore result = ai.scoreOpportunity(thesis, new CompanyProfile(
                opportunity.getId(), opportunity.getCompanyName(), opportunity.getSector(), opportunity.getStage(),
                opportunity.getAskAmount(), opportunity.getCurrency(), opportunity.getDescription()));

        opportunity.setFitScore(result.fitScore());
        opportunity.setRationale(result.rationale());
        opportunity.setRecommendedAction(result.action());
        opportunity.getCitations().clear();
        result.citations().forEach(c -> opportunity.getCitations()
                .add(new Opportunity.Citation(c.claim(), c.thesisField(), c.supporting())));
        opportunity.setScoredAt(Instant.now());
        // Scoring finished, so the system-owned state moves on; a person's decision does not.
        if (opportunity.getStatus() == OpportunityStatus.SCORING) {
            opportunity.setStatus(OpportunityStatus.PENDING_REVIEW);
        }
    }

    private Opportunity ownOpportunity(User actor, UUID id) {
        UUID firmId = firmAccessPolicy.requireAnyMembership(actor).getFirm().getId();
        Opportunity opportunity = opportunities.findWithFirmById(id)
                .orElseThrow(() -> new EntityNotFoundException("That opportunity no longer exists."));
        if (!opportunity.getVcFirm().getId().equals(firmId)) {
            throw new EntityNotFoundException("That opportunity no longer exists.");
        }
        return opportunity;
    }

    static ThesisProfile toProfile(VCFirmThesis thesis) {
        return new ThesisProfile(new HashSet<>(thesis.getSectors()), new HashSet<>(thesis.getStages()),
                thesis.getChequeSizeMin(), thesis.getChequeSizeMax(), thesis.getCurrency());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
