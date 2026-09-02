package com.VentureCapitals.Dashboard.domain.vc;

import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;
import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@Transactional
public class VCFirmService {
    private final VCFirmRepository vcFirmRepository;
    private final VCMemberRepository vcMemberRepository;
    private final UserRepository userRepository;

    public VCFirmService(VCFirmRepository vcFirmRepository, VCMemberRepository vcMemberRepository,
                         UserRepository userRepository) {
        this.vcFirmRepository = vcFirmRepository;
        this.vcMemberRepository = vcMemberRepository;
        this.userRepository = userRepository;
    }

    public VCFirm createFirm(User owner, CreateVCFirmRequest request) {
        validateOwnerHasNoFirm(owner.getId());

        VCFirm firm = VCFirm.builder()
                .name(request.getName())
                .description(request.getDescription())
                .website(request.getWebsite())
                .aum(request.getAum())
                .investmentStage(request.getInvestmentStage())
                .sectors(request.getSectors())
                .location(request.getLocation())
                .foundedYear(request.getFoundedYear())
                .build();

        VCFirm savedFirm = vcFirmRepository.save(firm);

        VCMember ownerMember = VCMember.builder()
                .user(owner)
                .firm(savedFirm)
                .role(VCRole.OWNER)
                .joinedAt(Instant.now())
                .build();

        vcMemberRepository.save(ownerMember);
        log.info("VC Firm created: firmId={}, owner={}", savedFirm.getId(), owner.getId());

        return savedFirm;
    }

    public VCFirm updateFirm(UUID firmId, User actor, UpdateVCFirmRequest request) {
        VCFirm firm = vcFirmRepository.findById(firmId)
                .orElseThrow(() -> new EntityNotFoundException("VC Firm not found: " + firmId));

        verifyActorIsOwner(firmId, actor.getId());

        firm.setName(request.getName());
        firm.setDescription(request.getDescription());
        firm.setWebsite(request.getWebsite());
        firm.setAum(request.getAum());
        firm.setInvestmentStage(request.getInvestmentStage());
        firm.setSectors(request.getSectors());
        firm.setLocation(request.getLocation());
        firm.setFoundedYear(request.getFoundedYear());

        VCFirm updated = vcFirmRepository.save(firm);
        log.info("VC Firm updated: firmId={}", firmId);

        return updated;
    }

    public void addMember(UUID firmId, User actor, AddMemberRequest request) {
        VCFirm firm = vcFirmRepository.findById(firmId)
                .orElseThrow(() -> new EntityNotFoundException("VC Firm not found: " + firmId));

        verifyActorIsOwner(firmId, actor.getId());

        User targetUser = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + request.getUserId()));

        validateUserHasNoFirm(targetUser.getId());

        VCMember member = VCMember.builder()
                .user(targetUser)
                .firm(firm)
                .role(request.getRole())
                .joinedAt(Instant.now())
                .build();

        vcMemberRepository.save(member);
        log.info("Member added to firm: firmId={}, userId={}, role={}", firmId, request.getUserId(), request.getRole());
    }

    public void removeMember(UUID firmId, User actor, UUID memberId) {
        VCFirm firm = vcFirmRepository.findById(firmId)
                .orElseThrow(() -> new EntityNotFoundException("VC Firm not found: " + firmId));

        verifyActorIsOwner(firmId, actor.getId());

        VCMember member = vcMemberRepository.findById(memberId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + memberId));

        if (!member.getFirm().getId().equals(firmId)) {
            throw new UnauthorizedException("Member does not belong to this firm");
        }

        if (member.getRole() == VCRole.OWNER) {
            throw new BusinessRuleViolationException("Cannot remove the firm owner");
        }

        vcMemberRepository.deleteById(memberId);
        log.info("Member removed from firm: firmId={}, memberId={}", firmId, memberId);
    }

    public void changeMemberRole(UUID firmId, User actor, UUID memberId, VCRole newRole) {
        VCFirm firm = vcFirmRepository.findById(firmId)
                .orElseThrow(() -> new EntityNotFoundException("VC Firm not found: " + firmId));

        verifyActorIsOwner(firmId, actor.getId());

        VCMember member = vcMemberRepository.findById(memberId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + memberId));

        if (!member.getFirm().getId().equals(firmId)) {
            throw new UnauthorizedException("Member does not belong to this firm");
        }

        if (member.getRole() == VCRole.OWNER && newRole != VCRole.OWNER) {
            VCMember anotherOwner = vcMemberRepository.findOwnerByFirmId(firmId)
                    .filter(m -> !m.getId().equals(memberId))
                    .orElse(null);

            if (anotherOwner == null) {
                throw new BusinessRuleViolationException("Cannot demote the sole owner without promoting another member");
            }
        }

        member.setRole(newRole);
        vcMemberRepository.save(member);
        log.info("Member role changed: firmId={}, memberId={}, newRole={}", firmId, memberId, newRole);
    }

    @Transactional(readOnly = true)
    public VCFirm getFirm(UUID firmId) {
        return vcFirmRepository.findById(firmId)
                .orElseThrow(() -> new EntityNotFoundException("VC Firm not found: " + firmId));
    }

    @Transactional(readOnly = true)
    public List<VCMember> getFirmMembers(UUID firmId) {
        return vcMemberRepository.findByFirmId(firmId);
    }

    @Transactional(readOnly = true)
    public VCMember getUserFirmMembership(UUID userId) {
        return vcMemberRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("User has no firm membership: " + userId));
    }

    private void verifyActorIsOwner(UUID firmId, UUID actorId) {
        VCMember actor = vcMemberRepository.findByUserId(actorId)
                .orElseThrow(() -> new UnauthorizedException("User is not a member of any firm"));

        if (!actor.getFirm().getId().equals(firmId)) {
            throw new UnauthorizedException("User does not belong to this firm");
        }

        if (actor.getRole() != VCRole.OWNER) {
            throw new UnauthorizedException("Only firm owner can perform this action");
        }
    }

    private void validateOwnerHasNoFirm(UUID userId) {
        vcMemberRepository.findByUserId(userId)
                .ifPresent(member -> {
                    throw new BusinessRuleViolationException("User already belongs to a firm");
                });
    }

    private void validateUserHasNoFirm(UUID userId) {
        vcMemberRepository.findByUserId(userId)
                .ifPresent(member -> {
                    throw new BusinessRuleViolationException("User already belongs to a firm");
                });
    }
}
