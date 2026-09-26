package com.VentureCapitals.Dashboard.domain.startup;

import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;
import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserRepository;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Startup profiles and their founding team. Profiles are visible to every signed-in user (that's
 * how VCs discover startups); only the startup's own members can edit it or manage the team.
 */
@Slf4j
@Service
@Transactional
public class StartupService {
    private final StartupRepository startupRepository;
    private final StartupMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final VCMemberRepository vcMemberRepository;

    public StartupService(StartupRepository startupRepository, StartupMemberRepository memberRepository,
                          UserRepository userRepository, VCMemberRepository vcMemberRepository) {
        this.startupRepository = startupRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.vcMemberRepository = vcMemberRepository;
    }

    /** Creates the profile and makes the creator its FOUNDER. */
    public Startup createStartup(User founder, StartupRequest request) {
        if (founder.getUserType() != UserType.STARTUP) {
            throw new UnauthorizedException("Only startup accounts can create a startup profile");
        }
        requireNoTeam(founder.getId(), "You already belong to a startup");

        Startup startup = new Startup();
        apply(startup, request);
        Startup saved = startupRepository.save(startup);

        memberRepository.save(StartupMember.builder()
                .user(founder)
                .startup(saved)
                .role(StartupRole.FOUNDER)
                .joinedAt(Instant.now())
                .build());

        log.info("Startup created: startupId={}, founder={}", saved.getId(), founder.getId());
        return saved;
    }

    public Startup updateStartup(User actor, UUID startupId, StartupRequest request) {
        Startup startup = getStartup(startupId);
        requireTeamMember(actor, startupId);
        apply(startup, request);
        log.info("Startup updated: startupId={}", startupId);
        return startupRepository.save(startup);
    }

    @Transactional(readOnly = true)
    public Startup getStartup(UUID startupId) {
        return startupRepository.findById(startupId)
                .orElseThrow(() -> new EntityNotFoundException("Startup not found: " + startupId));
    }

    /** The startup the user belongs to, if any — empty before profile setup. */
    @Transactional(readOnly = true)
    public Optional<Startup> findStartupForUser(UUID userId) {
        return memberRepository.findByUserId(userId).map(StartupMember::getStartup);
    }

    /**
     * Discovery. {@code raisingOnly} needs funding cycles, which aren't built yet, so it returns
     * nothing rather than pretending every startup is (or isn't) raising.
     */
    @Transactional(readOnly = true)
    public Page<Startup> searchStartups(String search, String sector, StartupStage stage,
                                        boolean raisingOnly, Pageable pageable) {
        if (raisingOnly) {
            return Page.empty(pageable);
        }
        return startupRepository.findAll(StartupRepository.matching(search, sector, stage), pageable);
    }

    @Transactional(readOnly = true)
    public List<StartupMember> getMembers(User actor, UUID startupId) {
        requireTeamMember(actor, startupId);
        return memberRepository.findByStartupIdOrderByJoinedAtAsc(startupId);
    }

    public StartupMember addMember(User actor, UUID startupId, AddStartupMemberRequest request) {
        Startup startup = getStartup(startupId);
        requireTeamMember(actor, startupId);

        User invitee = userRepository.findByEmail(request.getEmail().trim())
                .orElseThrow(() -> new EntityNotFoundException("No account found for that email. Ask them to sign up first"));
        if (invitee.getUserType() != UserType.STARTUP) {
            throw new BusinessRuleViolationException("Only startup accounts can join a startup team");
        }
        requireNoTeam(invitee.getId(), "That person already belongs to a startup");

        StartupMember saved = memberRepository.save(StartupMember.builder()
                .user(invitee)
                .startup(startup)
                .role(request.getRole())
                .joinedAt(Instant.now())
                .build());
        log.info("Startup member added: startupId={}, userId={}, role={}", startupId, invitee.getId(), request.getRole());
        return saved;
    }

    public void removeMember(User actor, UUID startupId, UUID memberId) {
        requireTeamMember(actor, startupId);

        StartupMember member = memberRepository.findWithUserById(memberId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + memberId));
        if (!member.getStartup().getId().equals(startupId)) {
            throw new UnauthorizedException("Member does not belong to this startup");
        }

        // A startup always keeps at least one founder.
        if (member.getRole() == StartupRole.FOUNDER) {
            long founders = memberRepository.findByStartupIdOrderByJoinedAtAsc(startupId).stream()
                    .filter(m -> m.getRole() == StartupRole.FOUNDER)
                    .count();
            if (founders <= 1) {
                throw new BusinessRuleViolationException("A startup needs at least one founder");
            }
        }

        memberRepository.delete(member);
        log.info("Startup member removed: startupId={}, memberId={}", startupId, memberId);
    }

    /** The actor must be a founder or co-founder of this startup (both have full control). */
    private StartupMember requireTeamMember(User actor, UUID startupId) {
        StartupMember membership = memberRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new UnauthorizedException("You are not part of a startup team"));
        if (!membership.getStartup().getId().equals(startupId)) {
            throw new UnauthorizedException("You can only manage your own startup");
        }
        return membership;
    }

    /** One firm or startup per user (CLAUDE.md). */
    private void requireNoTeam(UUID userId, String message) {
        if (memberRepository.findByUserId(userId).isPresent() || vcMemberRepository.findByUserId(userId).isPresent()) {
            throw new BusinessRuleViolationException(message);
        }
    }

    private void apply(Startup startup, StartupRequest request) {
        startup.setName(request.getName().trim());
        startup.setDescription(blankToNull(request.getDescription()));
        startup.setWebsite(blankToNull(request.getWebsite()));
        startup.setLogoUrl(blankToNull(request.getLogoUrl()));
        startup.setSector(request.getSector().trim());
        startup.setStage(request.getStage());
        startup.setLocation(blankToNull(request.getLocation()));
        startup.setFoundedYear(request.getFoundedYear());
        startup.setAnnualRevenue(request.getAnnualRevenue());
        startup.setTeamSize(request.getTeamSize());
        startup.setPitchDeckUrl(blankToNull(request.getPitchDeckUrl()));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
