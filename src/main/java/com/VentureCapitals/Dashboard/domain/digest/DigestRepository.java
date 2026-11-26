package com.VentureCapitals.Dashboard.domain.digest;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DigestRepository extends JpaRepository<Digest, UUID> {
    List<Digest> findByVcFirmIdOrderByCreatedAtDesc(UUID firmId);

    List<Digest> findByVcFirmIdAndPeriodEnd(UUID firmId, java.time.LocalDate periodEnd);

    /**
     * Holds a per-firm lock until the surrounding transaction ends. Concurrent "Generate now" presses
     * queue here instead of racing to insert the same day's digest and tripping the unique index.
     */
    @org.springframework.data.jpa.repository.Query(
            value = "select 1 from (select pg_advisory_xact_lock(hashtextextended(cast(:key as text), 0))) l",
            nativeQuery = true)
    int lockFirm(@org.springframework.data.repository.query.Param("key") String key);

    Optional<Digest> findByIdAndVcFirmId(UUID id, UUID firmId);
}
