package com.VentureCapitals.Dashboard.domain.vc;

import com.VentureCapitals.Dashboard.common.TargetType;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.common.exception.ValidationException;
import com.VentureCapitals.Dashboard.domain.insights.ProfileViewService;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserRepository;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;

import java.util.Optional;
import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VCFirmServiceTest {

    @Mock
    private VCFirmRepository vcFirmRepository;

    @Mock
    private VCMemberRepository vcMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private VCFirmThesisRepository thesisRepository;

    @Mock
    private ProfileViewService profileViews;

    private VCFirmService vcFirmService;

    private UUID userId;
    private User testUser;

    @BeforeEach
    void setUp() {
        vcFirmService = new VCFirmService(vcFirmRepository, vcMemberRepository, userRepository,
                new FirmAccessPolicy(vcMemberRepository), thesisRepository, profileViews);

        userId = UUID.randomUUID();

        testUser = User.builder()
                .email("owner@example.com")
                .userType(UserType.VC)
                .build();
        testUser.setId(userId);
    }

    @Test
    void testCreateFirm_Success() {
        when(vcFirmRepository.save(any(VCFirm.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(vcMemberRepository.save(any(VCMember.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CreateVCFirmRequest request = CreateVCFirmRequest.builder()
                .name("Sequoia Capital")
                .description("Leading VC firm")
                .website("https://sequoiacap.com")
                .aum(10000L)
                .investmentStage("Early Stage")
                .build();

        VCFirm created = vcFirmService.createFirm(testUser, request);

        assertNotNull(created);
        assertEquals("Sequoia Capital", created.getName());
        assertEquals("Leading VC firm", created.getDescription());
        verify(vcFirmRepository).save(any(VCFirm.class));
        verify(vcMemberRepository).save(any(VCMember.class));
    }

    @Test
    void testCreateFirm_CreatesOwnerMember() {
        VCFirm savedFirm = VCFirm.builder()
                .name("Test Firm")
                .build();
        savedFirm.setId(UUID.randomUUID());

        when(vcFirmRepository.save(any(VCFirm.class))).thenReturn(savedFirm);
        when(vcMemberRepository.save(any(VCMember.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CreateVCFirmRequest request = CreateVCFirmRequest.builder()
                .name("Test Firm")
                .build();

        vcFirmService.createFirm(testUser, request);

        verify(vcMemberRepository).save(argThat(member ->
                member.getRole() == VCRole.OWNER &&
                member.getUser().getId().equals(userId) &&
                member.getFirm().getId().equals(savedFirm.getId())
        ));
    }

    private VCFirm firmOwnedByTestUser() {
        VCFirm firm = VCFirm.builder().name("Test Firm").build();
        firm.setId(UUID.randomUUID());
        VCMember ownerMembership = VCMember.builder().user(testUser).firm(firm).role(VCRole.OWNER).build();
        when(vcFirmRepository.findById(firm.getId())).thenReturn(Optional.of(firm));
        when(vcMemberRepository.findByUserId(userId)).thenReturn(Optional.of(ownerMembership));
        return firm;
    }

    @Test
    void testAddMember_ByEmailWithRole() {
        VCFirm firm = firmOwnedByTestUser();
        User invitee = User.builder().email("pm@example.com").userType(UserType.VC).build();
        invitee.setId(UUID.randomUUID());
        when(userRepository.findByEmail("pm@example.com")).thenReturn(Optional.of(invitee));
        when(vcMemberRepository.findByUserId(invitee.getId())).thenReturn(Optional.empty());
        when(vcMemberRepository.save(any(VCMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VCMember added = vcFirmService.addMember(firm.getId(), testUser,
                AddMemberRequest.builder().email(" pm@example.com ").role(VCRole.PORTFOLIO_MANAGER).build());

        assertEquals(VCRole.PORTFOLIO_MANAGER, added.getRole());
        assertEquals(invitee.getId(), added.getUser().getId());
    }

    @Test
    void testAddMember_RejectsStartupAccounts() {
        VCFirm firm = firmOwnedByTestUser();
        User founder = User.builder().email("founder@example.com").userType(UserType.STARTUP).build();
        founder.setId(UUID.randomUUID());
        when(userRepository.findByEmail("founder@example.com")).thenReturn(Optional.of(founder));

        assertThrows(BusinessRuleViolationException.class, () -> vcFirmService.addMember(firm.getId(), testUser,
                AddMemberRequest.builder().email("founder@example.com").role(VCRole.STAFF).build()));
        verify(vcMemberRepository, never()).save(any());
    }

    @Test
    void testAddMember_RejectsSecondOwner() {
        VCFirm firm = firmOwnedByTestUser();

        assertThrows(BusinessRuleViolationException.class, () -> vcFirmService.addMember(firm.getId(), testUser,
                AddMemberRequest.builder().email("x@example.com").role(VCRole.OWNER).build()));
    }

    // --- Thesis, plan and who sees what ------------------------------------------------------

    private VCFirm firmWithOwner(VCRole role) {
        VCFirm firm = VCFirm.builder().name("Meridian").build();
        firm.setId(UUID.randomUUID());
        when(vcFirmRepository.findById(firm.getId())).thenReturn(Optional.of(firm));
        when(vcMemberRepository.findByUserId(userId)).thenReturn(Optional.of(
                VCMember.builder().user(testUser).firm(firm).role(role).joinedAt(Instant.now()).build()));
        return firm;
    }

    private UpdateThesisRequest thesis(Long min, Long max, String... sectors) {
        return UpdateThesisRequest.builder()
                .sectors(java.util.Arrays.asList(sectors))
                .stages(java.util.List.of("SEED", "SERIES_A"))
                .chequeSizeMin(min).chequeSizeMax(max).currency("INR").build();
    }

    @Test
    void the_owner_can_save_a_thesis_and_blank_or_repeated_sectors_are_tidied_away() {
        VCFirm firm = firmWithOwner(VCRole.OWNER);
        when(thesisRepository.findByVcFirmId(firm.getId())).thenReturn(Optional.empty());
        when(thesisRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        VCFirmThesis saved = vcFirmService.updateThesis(firm.getId(), testUser,
                thesis(10_000_000L, 50_000_000L, " Fintech ", "Fintech", "", "SaaS"));

        assertThat(saved.getSectors()).containsExactly("Fintech", "SaaS");
        assertThat(saved.getStages()).containsExactly("SEED", "SERIES_A");
        assertThat(saved.getChequeSizeMax()).isEqualTo(50_000_000L);
    }

    @Test
    void saving_a_thesis_again_reuses_the_existing_record() {
        VCFirm firm = firmWithOwner(VCRole.OWNER);
        VCFirmThesis existing = VCFirmThesis.builder().vcFirm(firm).build();
        existing.getSectors().add("Old sector");
        when(thesisRepository.findByVcFirmId(firm.getId())).thenReturn(Optional.of(existing));
        when(thesisRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        VCFirmThesis saved = vcFirmService.updateThesis(firm.getId(), testUser, thesis(null, null, "Climate"));

        // One thesis per firm, replaced rather than appended to.
        assertThat(saved).isSameAs(existing);
        assertThat(saved.getSectors()).containsExactly("Climate");
    }

    @Test
    void only_the_owner_may_change_the_thesis() {
        VCFirm firm = firmWithOwner(VCRole.PORTFOLIO_MANAGER);

        assertThatThrownBy(() -> vcFirmService.updateThesis(firm.getId(), testUser, thesis(null, null, "Fintech")))
                .isInstanceOf(UnauthorizedException.class);
        verify(thesisRepository, never()).save(any());
    }

    @Test
    void a_cheque_band_that_cannot_contain_anything_is_refused() {
        VCFirm firm = firmWithOwner(VCRole.OWNER);

        assertThatThrownBy(() -> vcFirmService.updateThesis(firm.getId(), testUser,
                thesis(90_000_000L, 10_000_000L, "Fintech")))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("minimum cheque size");
    }

    @Test
    void a_thesis_of_only_blank_sectors_is_refused() {
        VCFirm firm = firmWithOwner(VCRole.OWNER);

        assertThatThrownBy(() -> vcFirmService.updateThesis(firm.getId(), testUser, thesis(null, null, " ", "")))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("sector");
    }

    @Test
    void the_owner_can_pick_a_plan_and_nobody_else_can() {
        VCFirm firm = firmWithOwner(VCRole.OWNER);
        when(vcFirmRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        assertThat(vcFirmService.selectPlan(firm.getId(), testUser, PlanTier.GROWTH).getPlanTier())
                .isEqualTo(PlanTier.GROWTH);

        when(vcMemberRepository.findByUserId(userId)).thenReturn(Optional.of(
                VCMember.builder().user(testUser).firm(firm).role(VCRole.STAFF).joinedAt(Instant.now()).build()));
        assertThatThrownBy(() -> vcFirmService.selectPlan(firm.getId(), testUser, PlanTier.FREE))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void an_outsider_sees_the_public_profile_without_the_thesis_and_their_visit_is_counted() {
        VCFirm firm = VCFirm.builder().name("Meridian").build();
        firm.setId(UUID.randomUUID());
        when(vcFirmRepository.findById(firm.getId())).thenReturn(Optional.of(firm));
        when(vcMemberRepository.findByUserId(userId)).thenReturn(Optional.empty());

        FirmProfile profile = vcFirmService.viewFirm(testUser, firm.getId());

        assertThat(profile.own()).isFalse();
        // Never even read: the thesis isn't loaded for someone who can't see it.
        assertThat(profile.thesis()).isNull();
        verify(thesisRepository, never()).findByVcFirmId(any());
        verify(profileViews).record(testUser, TargetType.VC_FIRM, firm.getId());
    }

    @Test
    void a_member_sees_the_thesis_and_their_own_visit_is_not_counted() {
        VCFirm firm = firmWithOwner(VCRole.STAFF);
        VCFirmThesis thesis = VCFirmThesis.builder().vcFirm(firm).build();
        when(thesisRepository.findByVcFirmId(firm.getId())).thenReturn(Optional.of(thesis));

        FirmProfile profile = vcFirmService.viewFirm(testUser, firm.getId());

        assertThat(profile.own()).isTrue();
        assertThat(profile.thesis()).isSameAs(thesis);
        verifyNoInteractions(profileViews);
    }

    @Test
    void a_member_of_a_different_firm_is_an_outsider_here() {
        VCFirm other = VCFirm.builder().name("Other").build();
        other.setId(UUID.randomUUID());
        when(vcFirmRepository.findById(other.getId())).thenReturn(Optional.of(other));
        VCFirm mine = VCFirm.builder().name("Mine").build();
        mine.setId(UUID.randomUUID());
        when(vcMemberRepository.findByUserId(userId)).thenReturn(Optional.of(
                VCMember.builder().user(testUser).firm(mine).role(VCRole.OWNER).joinedAt(Instant.now()).build()));

        assertThat(vcFirmService.viewFirm(testUser, other.getId()).own()).isFalse();
        verify(profileViews).record(testUser, TargetType.VC_FIRM, other.getId());
    }

    // --- Seats ------------------------------------------------------------------------------

    private User inviteeWithNoFirm(String email) {
        User invitee = User.builder().email(email).userType(UserType.VC).build();
        invitee.setId(UUID.randomUUID());
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(invitee));
        when(vcMemberRepository.findByUserId(invitee.getId())).thenReturn(Optional.empty());
        return invitee;
    }

    @Test
    void testAddMember_FreePlanHasOneSeatAndTheOwnerHasIt() {
        VCFirm firm = firmOwnedByTestUser();
        inviteeWithNoFirm("pm@example.com");
        when(vcMemberRepository.countByFirmId(firm.getId())).thenReturn(1L);

        BusinessRuleViolationException refused = assertThrows(BusinessRuleViolationException.class,
                () -> vcFirmService.addMember(firm.getId(), testUser,
                        AddMemberRequest.builder().email("pm@example.com").role(VCRole.PORTFOLIO_MANAGER).build()));

        assertTrue(refused.getMessage().contains("Free plan includes 1 seat"));
        verify(vcMemberRepository, never()).save(any());
    }

    @Test
    void testAddMember_StarterAllowsFiveAndRefusesTheSixth() {
        VCFirm firm = firmOwnedByTestUser();
        firm.setPlanTier(PlanTier.STARTER);
        User fifth = inviteeWithNoFirm("fifth@example.com");
        when(vcMemberRepository.save(any(VCMember.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(vcMemberRepository.countByFirmId(firm.getId())).thenReturn(4L);

        VCMember added = vcFirmService.addMember(firm.getId(), testUser,
                AddMemberRequest.builder().email("fifth@example.com").role(VCRole.STAFF).build());
        assertEquals(fifth.getId(), added.getUser().getId());

        inviteeWithNoFirm("sixth@example.com");
        when(vcMemberRepository.countByFirmId(firm.getId())).thenReturn(5L);
        assertThrows(BusinessRuleViolationException.class, () -> vcFirmService.addMember(firm.getId(), testUser,
                AddMemberRequest.builder().email("sixth@example.com").role(VCRole.STAFF).build()));
    }

    @Test
    void testAddMember_GrowthHasNoCeiling() {
        VCFirm firm = firmOwnedByTestUser();
        firm.setPlanTier(PlanTier.GROWTH);
        inviteeWithNoFirm("many@example.com");
        when(vcMemberRepository.save(any(VCMember.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(vcMemberRepository.countByFirmId(firm.getId())).thenReturn(500L);

        assertEquals(VCRole.STAFF, vcFirmService.addMember(firm.getId(), testUser,
                AddMemberRequest.builder().email("many@example.com").role(VCRole.STAFF).build()).getRole());
    }

    @Test
    void testSelectPlan_CannotMoveBelowTheTeamAlreadySeated() {
        VCFirm firm = firmWithOwner(VCRole.OWNER);
        firm.setPlanTier(PlanTier.STARTER);
        when(vcMemberRepository.countByFirmId(firm.getId())).thenReturn(3L);

        BusinessRuleViolationException refused = assertThrows(BusinessRuleViolationException.class,
                () -> vcFirmService.selectPlan(firm.getId(), testUser, PlanTier.FREE));

        assertTrue(refused.getMessage().contains("Remove 2"));
        assertEquals(PlanTier.STARTER, firm.getPlanTier());
    }
}
