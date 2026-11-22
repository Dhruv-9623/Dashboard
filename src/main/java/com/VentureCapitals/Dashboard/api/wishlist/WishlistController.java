package com.VentureCapitals.Dashboard.api.wishlist;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.wishlist.CreateWishlistItemRequest;
import com.VentureCapitals.Dashboard.domain.wishlist.WishlistEntry;
import com.VentureCapitals.Dashboard.domain.wishlist.WishlistService;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** The signed-in person's shortlist — startups for an investor, investors for a founder. */
@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {
    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<WishlistItemDTO>>> list(@CurrentUser User user) {
        return ResponseEntity.ok(ApiResponse.ok(
                wishlistService.list(user).stream().map(WishlistController::toDTO).toList()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WishlistItemDTO>> add(
            @CurrentUser User user,
            @Valid @RequestBody CreateWishlistItemRequest request) {
        WishlistEntry entry = wishlistService.describe(wishlistService.add(user, request));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(toDTO(entry)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> remove(@CurrentUser User user, @PathVariable UUID id) {
        wishlistService.remove(user, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    private static WishlistItemDTO toDTO(WishlistEntry entry) {
        return WishlistItemDTO.builder()
                .id(entry.item().getId())
                .targetType(entry.item().getTargetType())
                .targetId(entry.item().getTargetId())
                .targetName(entry.name())
                .targetSector(entry.sector())
                .targetStage(entry.stage())
                .targetLogoUrl(entry.logoUrl())
                .note(entry.item().getNote())
                .savedAt(entry.item().getSavedAt())
                .build();
    }
}
