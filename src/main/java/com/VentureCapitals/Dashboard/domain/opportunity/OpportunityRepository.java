package com.VentureCapitals.Dashboard.domain.opportunity;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OpportunityRepository extends JpaRepository<Opportunity, UUID> {

    @EntityGraph(attributePaths = "vcFirm", type = EntityGraph.EntityGraphType.LOAD)
    List<Opportunity> findByVcFirmIdOrderByCreatedAtDesc(UUID firmId);

    @EntityGraph(attributePaths = "vcFirm", type = EntityGraph.EntityGraphType.LOAD)
    List<Opportunity> findByVcFirmIdAndStatusOrderByCreatedAtDesc(UUID firmId, OpportunityStatus status);

    @EntityGraph(attributePaths = "vcFirm", type = EntityGraph.EntityGraphType.LOAD)
    Optional<Opportunity> findWithFirmById(UUID id);

    long countByVcFirmIdAndStatus(UUID firmId, OpportunityStatus status);
}
