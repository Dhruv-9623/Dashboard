package com.VentureCapitals.Dashboard.domain.investment;

import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * The signed-in VC's portfolio. Every method is scoped to the actor's own firm through
 * {@link FirmAccessPolicy}; reads need any membership, writes need OWNER or PORTFOLIO_MANAGER.
 */
@Slf4j
@Service
@Transactional
public class InvestmentService {
    private final InvestmentRepository investmentRepository;
    private final StartupRepository startupRepository;
    private final FirmAccessPolicy accessPolicy;

    public InvestmentService(InvestmentRepository investmentRepository, StartupRepository startupRepository,
                             FirmAccessPolicy accessPolicy) {
        this.investmentRepository = investmentRepository;
        this.startupRepository = startupRepository;
        this.accessPolicy = accessPolicy;
    }

    public Investment createInvestment(User actor, InvestmentRequest request) {
        VCMember membership = accessPolicy.requireAnyMembership(actor);
        accessPolicy.require(actor, membership.getFirm().getId(), FirmAccessPolicy.INVESTMENT_EDITORS);

        Investment investment = Investment.builder()
                .vcFirm(membership.getFirm())
                .startup(findStartup(request.getStartupId()))
                .status(request.getStatus() != null ? request.getStatus() : InvestmentStatus.ACTIVE)
                .build();
        apply(investment, request);

        Investment saved = investmentRepository.save(investment);
        log.info("Investment created: firmId={}, investmentId={}", membership.getFirm().getId(), saved.getId());
        return saved;
    }

    public Investment updateInvestment(User actor, UUID investmentId, InvestmentRequest request) {
        Investment investment = findInvestment(investmentId);
        accessPolicy.require(actor, investment.getVcFirm().getId(), FirmAccessPolicy.INVESTMENT_EDITORS);

        if (!investment.getStartup().getId().equals(request.getStartupId())) {
            investment.setStartup(findStartup(request.getStartupId()));
        }
        if (request.getStatus() != null) {
            investment.setStatus(request.getStatus());
        }
        apply(investment, request);

        log.info("Investment updated: investmentId={}", investmentId);
        return investmentRepository.save(investment);
    }

    public void deleteInvestment(User actor, UUID investmentId) {
        Investment investment = findInvestment(investmentId);
        accessPolicy.require(actor, investment.getVcFirm().getId(), FirmAccessPolicy.INVESTMENT_EDITORS);
        investmentRepository.delete(investment);
        log.info("Investment deleted: investmentId={}", investmentId);
    }

    @Transactional(readOnly = true)
    public Investment getInvestment(User actor, UUID investmentId) {
        Investment investment = findInvestment(investmentId);
        accessPolicy.requireMember(actor, investment.getVcFirm().getId());
        return investment;
    }

    /** The actor's firm's investments, optionally filtered by status. */
    @Transactional(readOnly = true)
    public Page<Investment> listInvestments(User actor, InvestmentStatus status, Pageable pageable) {
        UUID firmId = accessPolicy.requireAnyMembership(actor).getFirm().getId();
        return status == null
                ? investmentRepository.findByVcFirmId(firmId, pageable)
                : investmentRepository.findByVcFirmIdAndStatus(firmId, status, pageable);
    }

    @Transactional(readOnly = true)
    public InvestmentSummary summarize(User actor) {
        UUID firmId = accessPolicy.requireAnyMembership(actor).getFirm().getId();

        Map<String, Long> totals = new LinkedHashMap<>();
        investmentRepository.sumAmountByCurrency(firmId)
                .forEach(row -> totals.put(row.getCurrency(), row.getTotal()));

        Map<InvestmentStatus, Long> counts = new LinkedHashMap<>();
        investmentRepository.countByStatus(firmId).forEach(row -> counts.put(row.getStatus(), row.getCount()));

        return InvestmentSummary.builder()
                .totalsByCurrency(totals)
                .totalCount(counts.values().stream().mapToLong(Long::longValue).sum())
                .activeCount(counts.getOrDefault(InvestmentStatus.ACTIVE, 0L))
                .exitedCount(counts.getOrDefault(InvestmentStatus.EXITED, 0L))
                .writtenOffCount(counts.getOrDefault(InvestmentStatus.WRITTEN_OFF, 0L))
                .build();
    }

    private void apply(Investment investment, InvestmentRequest request) {
        investment.setInvestmentDate(request.getInvestmentDate());
        investment.setAmount(request.getAmount());
        investment.setCurrency(request.getCurrency());
        investment.setRound(request.getRound());
        investment.setEquityPercentage(request.getEquityPercentage());
        investment.setNotes(request.getNotes());
    }

    private Investment findInvestment(UUID investmentId) {
        return investmentRepository.findWithStartupById(investmentId)
                .orElseThrow(() -> new EntityNotFoundException("Investment not found: " + investmentId));
    }

    private Startup findStartup(UUID startupId) {
        return startupRepository.findById(startupId)
                .orElseThrow(() -> new EntityNotFoundException("Startup not found: " + startupId));
    }
}
