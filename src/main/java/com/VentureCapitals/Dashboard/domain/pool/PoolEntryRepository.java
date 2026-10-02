package com.VentureCapitals.Dashboard.domain.pool;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PoolEntryRepository extends JpaRepository<PoolEntry, UUID> {
    // Everything the pool table shows, in one query: the startup (name/sector/stage) and who added it.
    // LOAD, not the default FETCH: a fetch graph makes every attribute outside it lazy (tags included),
    // and the API maps these entities after the transaction has closed.
    @EntityGraph(attributePaths = {"startup", "addedBy", "addedBy.user", "addedBy.firm"}, type = EntityGraph.EntityGraphType.LOAD)
    Page<PoolEntry> findByVcFirmId(UUID vcFirmId, Pageable pageable);

    @EntityGraph(attributePaths = {"startup", "addedBy", "addedBy.user", "addedBy.firm"}, type = EntityGraph.EntityGraphType.LOAD)
    Page<PoolEntry> findByVcFirmIdAndInterestLevel(UUID vcFirmId, InterestLevel interestLevel, Pageable pageable);

    @EntityGraph(attributePaths = {"startup", "addedBy", "addedBy.user", "addedBy.firm"}, type = EntityGraph.EntityGraphType.LOAD)
    Optional<PoolEntry> findWithDetailsById(UUID id);

    boolean existsByVcFirmIdAndStartupId(UUID vcFirmId, UUID startupId);

    long countByVcFirmId(UUID vcFirmId);
}
