package com.VentureCapitals.Dashboard.domain.conflict;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConflictReportRepository extends JpaRepository<ConflictReport, UUID> {

    @EntityGraph(attributePaths = "opportunity", type = EntityGraph.EntityGraphType.LOAD)
    Optional<ConflictReport> findByOpportunityId(UUID opportunityId);

    @EntityGraph(attributePaths = "opportunity", type = EntityGraph.EntityGraphType.LOAD)
    List<ConflictReport> findByVcFirmIdOrderByGeneratedAtDesc(UUID firmId);
}
