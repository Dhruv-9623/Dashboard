package com.VentureCapitals.Dashboard.domain.wishlist;

import com.VentureCapitals.Dashboard.common.TargetType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface WishlistItemRepository extends JpaRepository<WishlistItem, UUID> {
    List<WishlistItem> findByOwnerUserIdOrderBySavedAtDesc(UUID ownerUserId);

    boolean existsByOwnerUserIdAndTargetTypeAndTargetId(UUID ownerUserId, TargetType type, UUID targetId);

    Optional<WishlistItem> findByIdAndOwnerUserId(UUID id, UUID ownerUserId);

    /** How many people have saved this profile — the "wishlisted by" figure on Insights. */
    long countByTargetTypeAndTargetId(TargetType type, UUID targetId);

    /** The ids of everything of one kind that the person has saved. */
    @Query("select w.targetId from WishlistItem w where w.ownerUserId = :owner and w.targetType = :type")
    Set<UUID> findTargetIds(@Param("owner") UUID ownerUserId, @Param("type") TargetType type);
}
