package com.VentureCapitals.Dashboard.domain.vc;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VCMemberRepository extends JpaRepository<VCMember, UUID> {
    List<VCMember> findByFirmId(UUID firmId);

    Optional<VCMember> findByUserId(UUID userId);

    @Query("SELECT COUNT(m) > 0 FROM VCMember m WHERE m.firm.id = :firmId AND m.role = :role")
    boolean existsByFirmIdAndRole(@Param("firmId") UUID firmId, @Param("role") VCRole role);

    @Query("SELECT m FROM VCMember m WHERE m.firm.id = :firmId AND m.role = 'OWNER'")
    Optional<VCMember> findOwnerByFirmId(@Param("firmId") UUID firmId);
}
