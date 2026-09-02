package com.VentureCapitals.Dashboard.domain.investment;

import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCRole;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@Transactional
public class InvestmentService {
    private final InvestmentRepository investmentRepository;
    private final VCFirmRepository vcFirmRepository;
    private final VCMemberRepository vcMemberRepository;
    private final StartupRepository startupRepository;

    public InvestmentService(InvestmentRepository investmentRepository, VCFirmRepository vcFirmRepository,
                             VCMemberRepository vcMemberRepository, StartupRepository startupRepository) {
        this.investmentRepository = investmentRepository;
        this.vcFirmRepository = vcFirmRepository;
        this.vcMemberRepository = vcMemberRepository;
        this.startupRepository = startupRepository;
    }

    public Investment createInvestment(UUID vcFirmId, User actor, CreateInvestmentRequest request) {
        VCFirm firm = vcFirmRepository.findById(vcFirmId)
                .orElseThrow(() -> new EntityNotFoundException("VC Firm not found: " + vcFirmId));

        VCMember actorMembership = vcMemberRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new UnauthorizedException("User is not a member of any firm"));

        if (!actorMembership.getFirm().getId().equals(vcFirmId)) {
            throw new UnauthorizedException("User does not belong to this firm");
        }

        if (actorMembership.getRole() == VCRole.STAFF) {
            throw new UnauthorizedException("STAFF members cannot create investments");
        }

        Startup startup = startupRepository.findById(request.getStartupId())
                .orElseThrow(() -> new EntityNotFoundException("Startup not found: " + request.getStartupId()));

        Investment investment = Investment.builder()
                .vcFirm(firm)
                .startup(startup)
                .investmentDate(request.getInvestmentDate())
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .round(request.getRound())
                .equityPercentage(request.getEquityPercentage())
                .status(InvestmentStatus.ACTIVE)
                .notes(request.getNotes())
                .build();

        Investment saved = investmentRepository.save(investment);
        log.info("Investment created: firmId={}, startupId={}, amount={}", vcFirmId, request.getStartupId(), request.getAmount());

        return saved;
    }

    public Investment updateInvestment(UUID investmentId, User actor, UpdateInvestmentRequest request) {
        Investment investment = investmentRepository.findById(investmentId)
                .orElseThrow(() -> new EntityNotFoundException("Investment not found: " + investmentId));

        VCMember actorMembership = vcMemberRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new UnauthorizedException("User is not a member of any firm"));

        if (!actorMembership.getFirm().getId().equals(investment.getVcFirm().getId())) {
            throw new UnauthorizedException("User does not have access to this investment");
        }

        if (actorMembership.getRole() == VCRole.STAFF) {
            throw new UnauthorizedException("STAFF members cannot update investments");
        }

        investment.setInvestmentDate(request.getInvestmentDate());
        investment.setAmount(request.getAmount());
        investment.setCurrency(request.getCurrency());
        investment.setRound(request.getRound());
        investment.setEquityPercentage(request.getEquityPercentage());
        investment.setNotes(request.getNotes());

        Investment updated = investmentRepository.save(investment);
        log.info("Investment updated: investmentId={}", investmentId);

        return updated;
    }

    public void changeInvestmentStatus(UUID investmentId, User actor, InvestmentStatus newStatus) {
        Investment investment = investmentRepository.findById(investmentId)
                .orElseThrow(() -> new EntityNotFoundException("Investment not found: " + investmentId));

        VCMember actorMembership = vcMemberRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new UnauthorizedException("User is not a member of any firm"));

        if (!actorMembership.getFirm().getId().equals(investment.getVcFirm().getId())) {
            throw new UnauthorizedException("User does not have access to this investment");
        }

        if (actorMembership.getRole() == VCRole.STAFF) {
            throw new UnauthorizedException("STAFF members cannot change investment status");
        }

        investment.setStatus(newStatus);
        investmentRepository.save(investment);
        log.info("Investment status changed: investmentId={}, newStatus={}", investmentId, newStatus);
    }

    @Transactional(readOnly = true)
    public Investment getInvestment(UUID investmentId) {
        return investmentRepository.findById(investmentId)
                .orElseThrow(() -> new EntityNotFoundException("Investment not found: " + investmentId));
    }

    @Transactional(readOnly = true)
    public Page<Investment> listInvestmentsByFirm(UUID vcFirmId, Pageable pageable) {
        return investmentRepository.findByVcFirmId(vcFirmId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Investment> listInvestmentsByFirmAndStatus(UUID vcFirmId, InvestmentStatus status, Pageable pageable) {
        return investmentRepository.findByVcFirmIdAndStatus(vcFirmId, status, pageable);
    }
}
