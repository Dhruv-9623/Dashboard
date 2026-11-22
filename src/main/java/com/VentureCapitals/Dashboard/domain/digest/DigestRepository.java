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

    Optional<Digest> findByIdAndVcFirmId(UUID id, UUID firmId);
}
