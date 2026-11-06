package com.VentureCapitals.Dashboard.domain.funding;

import com.VentureCapitals.Dashboard.domain.startup.StartupStage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FundingCycleRepository extends JpaRepository<FundingCycle, UUID> {

    /**
     * LOAD, not the default FETCH: an @EntityGraph of type FETCH makes every attribute it does not
     * name lazy, which has already caused one LazyInitializationException in this codebase once
     * the service transaction closed.
     */
    @EntityGraph(attributePaths = "startup", type = EntityGraph.EntityGraphType.LOAD)
    List<FundingCycle> findByStartupIdOrderByOpenedAtDesc(UUID startupId);

    @EntityGraph(attributePaths = "startup", type = EntityGraph.EntityGraphType.LOAD)
    Optional<FundingCycle> findWithStartupById(UUID id);

    /** At most one OPEN round per startup — the partial unique index in V9 backs this up. */
    Optional<FundingCycle> findByStartupIdAndStatus(UUID startupId, FundingCycleStatus status);

    /**
     * The VC-side deal flow: open rounds, optionally narrowed by the startup's sector and stage.
     * Null filters mean "any", which keeps one query instead of a Specification for two fields.
     */
    @Query("""
            select cycle from FundingCycle cycle
              join fetch cycle.startup startup
             where cycle.status = com.VentureCapitals.Dashboard.domain.funding.FundingCycleStatus.OPEN
               and (:sector is null or startup.sector = :sector)
               and (:stage is null or startup.stage = :stage)
            """)
    Page<FundingCycle> findOpen(@Param("sector") String sector,
                                @Param("stage") StartupStage stage,
                                Pageable pageable);
}
