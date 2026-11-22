package com.VentureCapitals.Dashboard.api.wishlist;

import com.VentureCapitals.Dashboard.common.TargetType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WishlistItemDTO {
    private UUID id;
    private TargetType targetType;
    private UUID targetId;
    private String targetName;
    private String targetSector;
    private String targetStage;
    private String targetLogoUrl;
    private String note;
    private Instant savedAt;
}
