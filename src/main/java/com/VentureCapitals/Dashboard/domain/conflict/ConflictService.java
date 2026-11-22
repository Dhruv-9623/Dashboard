package com.VentureCapitals.Dashboard.domain.conflict;

import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.domain.ai.AIService;
import com.VentureCapitals.Dashboard.domain.ai.CompanyProfile;
import com.VentureCapitals.Dashboard.domain.ai.ConflictAssessment;
import com.VentureCapitals.Dashboard.domain.investment.Investment;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRepository;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentStatus;
import com.VentureCapitals.Dashboard.domain.opportunity.Opportunity;
import com.VentureCapitals.Dashboard.domain.opportunity.OpportunityRepository;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Conflict Sentinel: does this candidate collide with what the firm already holds? */
@Slf4j
@Service
@Transactional
public class ConflictService {
    private final ConflictReportRepository reports;
    private final OpportunityRepository opportunities;
    private final InvestmentRepository investments;
    private final FirmAccessPolicy firmAccessPolicy;
    private final AIService ai;

    public ConflictService(ConflictReportRepository reports, OpportunityRepository opportunities,
                           InvestmentRepository investments, FirmAccessPolicy firmAccessPolicy, AIService ai) {
        this.reports = reports;
        this.opportunities = opportunities;
        this.investments = investments;
        this.firmAccessPolicy = firmAccessPolicy;
        this.ai = ai;
    }

    /**
     * Runs the check, or runs it again. There is one current report per opportunity: a fresh run
     * updates it in place, because a portfolio that has changed since the last run is exactly why
     * someone would run it twice, and two reports for one opportunity would disagree.
     */
    public ConflictReport run(User actor, UUID opportunityId) {
        VCMember membership = firmAccessPolicy.requireAnyMembership(actor);
        Opportunity opportunity = opportunities.findWithFirmById(opportunityId)
                .filter(o -> o.getVcFirm().getId().equals(membership.getFirm().getId()))
                .orElseThrow(() -> new EntityNotFoundException("That opportunity no longer exists."));

        List<CompanyProfile> holdings = activeHoldings(membership.getFirm().getId());
        ConflictAssessment assessment = ai.assessConflicts(new CompanyProfile(
                opportunity.getId(), opportunity.getCompanyName(), opportunity.getSector(), opportunity.getStage(),
                opportunity.getAskAmount(), opportunity.getCurrency(), opportunity.getDescription()), holdings);

        ConflictReport report = reports.findByOpportunityId(opportunityId).orElseGet(() ->
                ConflictReport.builder().opportunity(opportunity).vcFirm(membership.getFirm()).build());

        report.setOverallConfidence(BigDecimal.valueOf(assessment.overall()));
        report.setComparedCompanyCount(holdings.size());
        report.setGeneratedAt(Instant.now());
        // orphanRemoval deletes the old children when they leave the list.
        report.getDimensions().clear();
        int position = 0;
        for (ConflictAssessment.Dimension dimension : assessment.dimensions()) {
            ConflictDimension row = ConflictDimension.builder()
                    .report(report)
                    .position(position++)
                    .dimension(dimension.type())
                    .confidence(BigDecimal.valueOf(dimension.confidence()))
                    .summary(dimension.summary())
                    .build();
            dimension.matches().forEach(match -> row.getMatches().add(
                    new ConflictDimension.Match(match.companyId(), match.companyName(), match.note())));
            report.getDimensions().add(row);
        }

        ConflictReport saved = reports.save(report);
        log.info("Conflict check run: opportunityId={}, overall={}", opportunityId, assessment.overall());
        return saved;
    }

    /** The current report for an opportunity, if one has been run. Null data, not a 404: "not yet" is an answer. */
    @Transactional(readOnly = true)
    public Optional<ConflictReport> forOpportunity(User actor, UUID opportunityId) {
        UUID firmId = firmAccessPolicy.requireAnyMembership(actor).getFirm().getId();
        Opportunity opportunity = opportunities.findWithFirmById(opportunityId)
                .filter(o -> o.getVcFirm().getId().equals(firmId))
                .orElseThrow(() -> new EntityNotFoundException("That opportunity no longer exists."));
        return reports.findByOpportunityId(opportunity.getId());
    }

    @Transactional(readOnly = true)
    public List<ConflictReport> list(User actor) {
        UUID firmId = firmAccessPolicy.requireAnyMembership(actor).getFirm().getId();
        return reports.findByVcFirmIdOrderByGeneratedAtDesc(firmId);
    }

    /** One entry per company even when the firm has several cheques in it — it is companies that conflict. */
    private List<CompanyProfile> activeHoldings(UUID firmId) {
        Map<UUID, CompanyProfile> byCompany = new LinkedHashMap<>();
        for (Investment investment : investments.findByVcFirmIdAndStatus(firmId, InvestmentStatus.ACTIVE)) {
            Startup startup = investment.getStartup();
            byCompany.putIfAbsent(startup.getId(), new CompanyProfile(startup.getId(), startup.getName(),
                    startup.getSector(), startup.getStage() == null ? null : startup.getStage().name(),
                    null, investment.getCurrency(), startup.getDescription()));
        }
        return List.copyOf(byCompany.values());
    }
}
