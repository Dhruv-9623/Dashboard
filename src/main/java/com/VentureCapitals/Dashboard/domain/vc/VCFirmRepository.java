package com.VentureCapitals.Dashboard.domain.vc;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface VCFirmRepository extends JpaRepository<VCFirm, UUID> {
}
