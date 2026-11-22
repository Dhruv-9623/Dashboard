package com.VentureCapitals.Dashboard.domain.vc;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VCFirmThesisRepository extends JpaRepository<VCFirmThesis, UUID> {
    Optional<VCFirmThesis> findByVcFirmId(UUID vcFirmId);
}
