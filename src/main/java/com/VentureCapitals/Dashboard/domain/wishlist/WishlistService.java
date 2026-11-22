package com.VentureCapitals.Dashboard.domain.wishlist;

import com.VentureCapitals.Dashboard.common.TargetType;
import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;
import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.ValidationException;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;


@Slf4j
@Service
@Transactional
public class WishlistService {
    private final WishlistItemRepository items;
    private final StartupRepository startups;
    private final VCFirmRepository firms;

    public WishlistService(WishlistItemRepository items, StartupRepository startups, VCFirmRepository firms) {
        this.items = items;
        this.startups = startups;
        this.firms = firms;
    }

    /** The person's saved items, newest first, with their targets' names resolved in two queries. */
    @Transactional(readOnly = true)
    public List<WishlistEntry> list(User owner) {
        List<WishlistItem> saved = items.findByOwnerUserIdOrderBySavedAtDesc(owner.getId());

        Map<UUID, Startup> startupsById = byId(startups.findAllById(idsOf(saved, TargetType.STARTUP)), Startup::getId);
        Map<UUID, VCFirm> firmsById = byId(firms.findAllById(idsOf(saved, TargetType.VC_FIRM)), VCFirm::getId);

        // A target that has since gone is skipped rather than shown as a blank row.
        return saved.stream()
                .map(item -> switch (item.getTargetType()) {
                    case STARTUP -> entryFor(startupsById.get(item.getTargetId()), item);
                    case VC_FIRM -> entryFor(firmsById.get(item.getTargetId()), item);
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    public WishlistItem add(User owner, CreateWishlistItemRequest request) {
        // A VC shortlists startups and a founder shortlists investors. Saving your own side would
        // be a list of competitors, which is not what this feature is for.
        TargetType expected = owner.getUserType() == UserType.VC ? TargetType.STARTUP : TargetType.VC_FIRM;
        if (request.getTargetType() != expected) {
            throw new ValidationException(owner.getUserType() == UserType.VC
                    ? "Investors save startups to their wishlist."
                    : "Founders save investors to their wishlist.");
        }

        boolean exists = switch (request.getTargetType()) {
            case STARTUP -> startups.existsById(request.getTargetId());
            case VC_FIRM -> firms.existsById(request.getTargetId());
        };
        if (!exists) {
            throw new EntityNotFoundException("That profile no longer exists.");
        }

        if (items.existsByOwnerUserIdAndTargetTypeAndTargetId(owner.getId(), request.getTargetType(), request.getTargetId())) {
            throw new BusinessRuleViolationException("Already on your wishlist.");
        }

        WishlistItem saved = items.save(WishlistItem.builder()
                .ownerUserId(owner.getId())
                .targetType(request.getTargetType())
                .targetId(request.getTargetId())
                .note(request.getNote() == null || request.getNote().isBlank() ? null : request.getNote().trim())
                .savedAt(Instant.now())
                .build());
        log.info("Wishlist item saved: ownerId={}, type={}", owner.getId(), request.getTargetType());
        return saved;
    }

    /** Resolves one just-saved item the same way the list does, for the response to the save. */
    @Transactional(readOnly = true)
    public WishlistEntry describe(WishlistItem item) {
        return switch (item.getTargetType()) {
            case STARTUP -> entryFor(startups.findById(item.getTargetId()).orElse(null), item);
            case VC_FIRM -> entryFor(firms.findById(item.getTargetId()).orElse(null), item);
        };
    }

    public void remove(User owner, UUID itemId) {
        // Looked up by owner as well as id, so someone else's item is "not found" rather than
        // "forbidden" — it doesn't confirm that the id exists.
        WishlistItem item = items.findByIdAndOwnerUserId(itemId, owner.getId())
                .orElseThrow(() -> new EntityNotFoundException("That item isn't on your wishlist."));
        items.delete(item);
    }

    // --- helpers ---------------------------------------------------------------------------

    private static List<UUID> idsOf(List<WishlistItem> saved, TargetType type) {
        return saved.stream().filter(item -> item.getTargetType() == type).map(WishlistItem::getTargetId).toList();
    }

    private static <T> Map<UUID, T> byId(Iterable<T> values, java.util.function.Function<T, UUID> id) {
        Map<UUID, T> map = new HashMap<>();
        values.forEach(value -> map.put(id.apply(value), value));
        return map;
    }

    private static WishlistEntry entryFor(Startup startup, WishlistItem item) {
        if (startup == null) return null;
        return new WishlistEntry(item, startup.getName(), startup.getSector(),
                startup.getStage() != null ? startup.getStage().name() : null, startup.getLogoUrl());
    }

    private static WishlistEntry entryFor(VCFirm firm, WishlistItem item) {
        if (firm == null) return null;
        String sector = firm.getSectors() == null || firm.getSectors().isEmpty() ? null : firm.getSectors().get(0);
        return new WishlistEntry(item, firm.getName(), sector, firm.getInvestmentStage(), null);
    }
}
