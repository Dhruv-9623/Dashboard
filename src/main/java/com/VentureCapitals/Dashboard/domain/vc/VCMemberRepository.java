package com.VentureCapitals.Dashboard.domain.vc;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VCMemberRepository extends JpaRepository<VCMember, UUID> {
    @EntityGraph(attributePaths = {"user", "firm"}, type = EntityGraph.EntityGraphType.LOAD)
    List<VCMember> findByFirmId(UUID firmId);

    Optional<VCMember> findByUserId(UUID userId);

    long countByFirmId(UUID firmId);

    /** Several people's memberships at once, with the firm — for naming a page of counterparties. */
    @EntityGraph(attributePaths = {"user", "firm"}, type = EntityGraph.EntityGraphType.LOAD)
    List<VCMember> findByUserIdIn(Collection<UUID> userIds);

    /** The person who speaks for a firm: its single owner (uq_vc_firm_single_owner). */
    @EntityGraph(attributePaths = {"user", "firm"}, type = EntityGraph.EntityGraphType.LOAD)
    Optional<VCMember> findFirstByFirmIdAndRole(UUID firmId, VCRole role);
}
