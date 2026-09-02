package com.VentureCapitals.Dashboard.domain.pool;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PoolEntryRepository extends JpaRepository<PoolEntry, UUID> {
    Page<PoolEntry> findByVcFirmId(UUID vcFirmId, Pageable pageable);

    Page<PoolEntry> findByVcFirmIdAndInterestLevel(UUID vcFirmId, InterestLevel interestLevel, Pageable pageable);
}
