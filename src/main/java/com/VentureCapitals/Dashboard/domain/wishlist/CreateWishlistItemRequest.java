package com.VentureCapitals.Dashboard.domain.wishlist;

import com.VentureCapitals.Dashboard.common.TargetType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateWishlistItemRequest {
    @NotNull(message = "Say whether this is a firm or a startup")
    private TargetType targetType;

    @NotNull(message = "Choose who to save")
    private UUID targetId;

    @Size(max = 500, message = "Note must be at most 500 characters")
    private String note;
}
