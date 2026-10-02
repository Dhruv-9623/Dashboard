package com.VentureCapitals.Dashboard.domain.vc;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VCMemberRepository extends JpaRepository<VCMember, UUID> {
    @EntityGraph(attributePaths = {"user", "firm"}, type = EntityGraph.EntityGraphType.LOAD)
    List<VCMember> findByFirmId(UUID firmId);

    Optional<VCMember> findByUserId(UUID userId);
}
