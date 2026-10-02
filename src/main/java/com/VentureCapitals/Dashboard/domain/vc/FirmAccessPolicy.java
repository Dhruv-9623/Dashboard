package com.VentureCapitals.Dashboard.domain.vc;

import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.domain.user.User;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

/**
 * The single place that answers "may this user act on this firm's data?". Every firm-scoped read
 * and write goes through here, so tenancy and role rules can't drift between services.
 * Violations surface as {@link UnauthorizedException} (403).
 */
@Component
@Transactional(readOnly = true)
public class FirmAccessPolicy {
    /** CLAUDE.md Rule 4: investment records are created and changed by OWNER or PORTFOLIO_MANAGER. */
    public static final Set<VCRole> INVESTMENT_EDITORS = EnumSet.of(VCRole.OWNER, VCRole.PORTFOLIO_MANAGER);
    /** CLAUDE.md Rule 2: only the owner manages members and firm details. */
    public static final Set<VCRole> OWNER_ONLY = EnumSet.of(VCRole.OWNER);
    public static final Set<VCRole> ANY_MEMBER = EnumSet.allOf(VCRole.class);

    private final VCMemberRepository vcMemberRepository;

    public FirmAccessPolicy(VCMemberRepository vcMemberRepository) {
        this.vcMemberRepository = vcMemberRepository;
    }

    /** The actor's membership, whichever firm it is. For "my firm" endpoints. */
    public VCMember requireAnyMembership(User actor) {
        return vcMemberRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new UnauthorizedException("You are not a member of a VC firm"));
    }

    /** The actor must belong to {@code firmId} with one of {@code allowedRoles}. */
    public VCMember require(User actor, UUID firmId, Set<VCRole> allowedRoles) {
        VCMember membership = requireAnyMembership(actor);
        if (!membership.getFirm().getId().equals(firmId)) {
            throw new UnauthorizedException("You do not have access to this firm");
        }
        if (!allowedRoles.contains(membership.getRole())) {
            throw new UnauthorizedException("Your role can't perform this action");
        }
        return membership;
    }

    public VCMember requireMember(User actor, UUID firmId) {
        return require(actor, firmId, ANY_MEMBER);
    }

    public VCMember requireOwner(User actor, UUID firmId) {
        return require(actor, firmId, OWNER_ONLY);
    }
}
