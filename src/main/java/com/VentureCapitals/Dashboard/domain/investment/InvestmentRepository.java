package com.VentureCapitals.Dashboard.domain.investment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface InvestmentRepository extends JpaRepository<Investment, UUID> {
    Page<Investment> findByVcFirmId(UUID vcFirmId, Pageable pageable);

    Page<Investment> findByVcFirmIdAndStatus(UUID vcFirmId, InvestmentStatus status, Pageable pageable);
}
