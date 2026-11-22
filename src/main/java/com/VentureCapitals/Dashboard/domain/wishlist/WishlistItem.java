package com.VentureCapitals.Dashboard.domain.wishlist;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import com.VentureCapitals.Dashboard.common.TargetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Something a person saved to come back to: a VC saves startups, a founder saves investors.
 *
 * <p>Points at its target by id and type rather than a foreign key, because the target is in one
 * of two tables. The service checks it exists when the item is saved.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "wishlist_items")
public class WishlistItem extends BaseEntity {
    @Column(name = "owner_user_id", nullable = false)
    private UUID ownerUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private TargetType targetType;

    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    @Column(length = 500)
    private String note;

    @Column(name = "saved_at", nullable = false)
    private Instant savedAt;
}
