package com.VentureCapitals.Dashboard.domain.insights;

import com.VentureCapitals.Dashboard.common.TargetType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.UUID;

@Repository
public interface ProfileViewRepository extends JpaRepository<ProfileView, UUID> {

    /**
     * Records a view, or does nothing if this person already looked today.
     *
     * <p>A native upsert rather than a check-then-insert: two tabs opening the same profile at the
     * same moment would both pass the check and one would then fail on the unique key, turning a
     * page load into a 409. {@code ON CONFLICT DO NOTHING} makes the race harmless.
     */
    @Modifying
    @Query(value = """
            INSERT INTO profile_views (id, viewer_user_id, target_type, target_id, viewed_on, created_at, updated_at)
            VALUES (:id, :viewer, :type, :target, :day, now(), now())
            ON CONFLICT ON CONSTRAINT uq_profile_view_per_day DO NOTHING
            """, nativeQuery = true)
    int record(@Param("id") UUID id, @Param("viewer") UUID viewer, @Param("type") String type,
               @Param("target") UUID target, @Param("day") LocalDate day);

    long countByTargetTypeAndTargetId(TargetType targetType, UUID targetId);
}
