package com.VentureCapitals.Dashboard.domain.vc;

import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;
import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserRepository;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@Transactional
public class VCFirmService {
    private final VCFirmRepository vcFirmRepository;
    private final VCMemberRepository vcMemberRepository;
    private final UserRepository userRepository;
    private final FirmAccessPolicy accessPolicy;

    public VCFirmService(VCFirmRepository vcFirmRepository, VCMemberRepository vcMemberRepository,
                         UserRepository userRepository, FirmAccessPolicy accessPolicy) {
        this.vcFirmRepository = vcFirmRepository;
        this.vcMemberRepository = vcMemberRepository;
        this.userRepository = userRepository;
        this.accessPolicy = accessPolicy;
    }

    public VCFirm createFirm(User owner, CreateVCFirmRequest request) {
        validateUserHasNoFirm(owner.getId());

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

        accessPolicy.requireOwner(actor, firmId);

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

    public VCMember addMember(UUID firmId, User actor, AddMemberRequest request) {
        VCFirm firm = vcFirmRepository.findById(firmId)
                .orElseThrow(() -> new EntityNotFoundException("VC Firm not found: " + firmId));

        accessPolicy.requireOwner(actor, firmId);

        if (request.getRole() == VCRole.OWNER) {
            // The schema allows exactly one owner per firm (uq_vc_firm_single_owner).
            throw new BusinessRuleViolationException("A firm has a single owner. Invite teammates as Portfolio Manager or Staff");
        }

        User targetUser = userRepository.findByEmail(request.getEmail().trim())
                .orElseThrow(() -> new EntityNotFoundException("No account found for that email. Ask them to sign up first"));

        if (targetUser.getUserType() != UserType.VC) {
            throw new BusinessRuleViolationException("Only VC accounts can join a firm");
        }

        validateUserHasNoFirm(targetUser.getId());

        VCMember member = VCMember.builder()
                .user(targetUser)
                .firm(firm)
                .role(request.getRole())
                .joinedAt(Instant.now())
                .build();

        VCMember saved = vcMemberRepository.save(member);
        log.info("Member added to firm: firmId={}, userId={}, role={}", firmId, targetUser.getId(), request.getRole());
        return saved;
    }

    public void removeMember(UUID firmId, User actor, UUID memberId) {
        VCFirm firm = vcFirmRepository.findById(firmId)
                .orElseThrow(() -> new EntityNotFoundException("VC Firm not found: " + firmId));

        accessPolicy.requireOwner(actor, firmId);

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

    public VCMember changeMemberRole(UUID firmId, User actor, UUID memberId, VCRole newRole) {
        vcFirmRepository.findById(firmId)
                .orElseThrow(() -> new EntityNotFoundException("VC Firm not found: " + firmId));

        accessPolicy.requireOwner(actor, firmId);

        VCMember member = vcMemberRepository.findById(memberId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + memberId));

        if (!member.getFirm().getId().equals(firmId)) {
            throw new UnauthorizedException("Member does not belong to this firm");
        }

        // The schema allows exactly one owner per firm, so ownership can't be granted or removed
        // through a role change. An explicit transfer-ownership operation is still to be designed.
        if (newRole == VCRole.OWNER && member.getRole() != VCRole.OWNER) {
            throw new BusinessRuleViolationException("Ownership transfer isn't supported yet");
        }
        if (member.getRole() == VCRole.OWNER && newRole != VCRole.OWNER) {
            throw new BusinessRuleViolationException("The firm owner's role can't be changed");
        }

        member.setRole(newRole);
        VCMember saved = vcMemberRepository.save(member);
        log.info("Member role changed: firmId={}, memberId={}, newRole={}", firmId, memberId, newRole);
        return saved;
    }

    /** Public firm profile. */
    @Transactional(readOnly = true)
    public VCFirm getFirm(UUID firmId) {
        return vcFirmRepository.findById(firmId)
                .orElseThrow(() -> new EntityNotFoundException("VC Firm not found: " + firmId));
    }

    /** Investor discovery by name; all firms when the search is blank. Capped to keep responses small. */
    @Transactional(readOnly = true)
    public List<VCFirm> searchFirms(String search) {
        String term = search == null ? "" : search.trim();
        return vcFirmRepository.findTop50ByNameContainingIgnoreCaseOrderByNameAsc(term);
    }

    /** The firm's members, if the actor is one of them. */
    @Transactional(readOnly = true)
    public List<VCMember> getFirmMembers(User actor, UUID firmId) {
        accessPolicy.requireMember(actor, firmId);
        return vcMemberRepository.findByFirmId(firmId);
    }

    /** The firm the user belongs to, if any — empty before firm setup. */
    @Transactional(readOnly = true)
    public Optional<VCFirm> findFirmForUser(UUID userId) {
        return vcMemberRepository.findByUserId(userId).map(VCMember::getFirm);
    }

    private void validateUserHasNoFirm(UUID userId) {
        vcMemberRepository.findByUserId(userId)
                .ifPresent(member -> {
                    throw new BusinessRuleViolationException("User already belongs to a firm");
                });
    }
}
