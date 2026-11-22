package com.VentureCapitals.Dashboard.domain.wishlist;

import com.VentureCapitals.Dashboard.common.TargetType;
import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;
import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.ValidationException;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.startup.StartupStage;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WishlistServiceTest {
    @Mock private WishlistItemRepository items;
    @Mock private StartupRepository startups;
    @Mock private VCFirmRepository firms;

    private WishlistService service;
    private User investor;
    private User founder;

    @BeforeEach
    void setUp() {
        service = new WishlistService(items, startups, firms);
        investor = User.builder().email("owner@meridian.vc").userType(UserType.VC).build();
        investor.setId(UUID.randomUUID());
        founder = User.builder().email("founder@ledgerly.in").userType(UserType.STARTUP).build();
        founder.setId(UUID.randomUUID());
    }

    @Test
    void an_investor_saves_startups_and_a_founder_saves_investors() {
        UUID target = UUID.randomUUID();

        assertThatThrownBy(() -> service.add(investor, new CreateWishlistItemRequest(TargetType.VC_FIRM, target, null)))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> service.add(founder, new CreateWishlistItemRequest(TargetType.STARTUP, target, null)))
                .isInstanceOf(ValidationException.class);
        verify(items, never()).save(any());
    }

    @Test
    void saving_something_that_does_not_exist_is_a_not_found() {
        UUID target = UUID.randomUUID();
        when(startups.existsById(target)).thenReturn(false);

        assertThatThrownBy(() -> service.add(investor, new CreateWishlistItemRequest(TargetType.STARTUP, target, null)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void saving_the_same_thing_twice_is_refused() {
        UUID target = UUID.randomUUID();
        when(startups.existsById(target)).thenReturn(true);
        when(items.existsByOwnerUserIdAndTargetTypeAndTargetId(investor.getId(), TargetType.STARTUP, target)).thenReturn(true);

        assertThatThrownBy(() -> service.add(investor, new CreateWishlistItemRequest(TargetType.STARTUP, target, null)))
                .isInstanceOf(BusinessRuleViolationException.class).hasMessageContaining("Already");
    }

    @Test
    void a_valid_save_is_recorded_for_its_owner_with_a_trimmed_note() {
        UUID target = UUID.randomUUID();
        when(startups.existsById(target)).thenReturn(true);
        when(items.save(any())).thenAnswer(call -> call.getArgument(0));

        WishlistItem saved = service.add(investor, new CreateWishlistItemRequest(TargetType.STARTUP, target, "  revisit in Q1 "));

        assertThat(saved.getOwnerUserId()).isEqualTo(investor.getId());
        assertThat(saved.getNote()).isEqualTo("revisit in Q1");
    }

    @Test
    void the_list_names_each_target_and_skips_ones_that_have_gone() {
        Startup lumen = Startup.builder().name("Lumen Health").sector("Healthtech").stage(StartupStage.SEED).build();
        lumen.setId(UUID.randomUUID());
        UUID gone = UUID.randomUUID();
        WishlistItem keep = WishlistItem.builder().ownerUserId(investor.getId()).targetType(TargetType.STARTUP)
                .targetId(lumen.getId()).savedAt(Instant.now()).build();
        WishlistItem orphan = WishlistItem.builder().ownerUserId(investor.getId()).targetType(TargetType.STARTUP)
                .targetId(gone).savedAt(Instant.now()).build();
        when(items.findByOwnerUserIdOrderBySavedAtDesc(investor.getId())).thenReturn(List.of(keep, orphan));
        when(startups.findAllById(any())).thenReturn(List.of(lumen));
        when(firms.findAllById(any())).thenReturn(List.of());

        List<WishlistEntry> entries = service.list(investor);

        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).name()).isEqualTo("Lumen Health");
        assertThat(entries.get(0).stage()).isEqualTo("SEED");
    }

    @Test
    void someone_elses_item_is_not_found_rather_than_forbidden() {
        UUID id = UUID.randomUUID();
        when(items.findByIdAndOwnerUserId(id, founder.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.remove(founder, id)).isInstanceOf(EntityNotFoundException.class);
        verify(items, never()).delete(any());
    }
}
