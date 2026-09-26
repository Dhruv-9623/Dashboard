package com.VentureCapitals.Dashboard.domain.vc;

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
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
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

    private VCFirmService vcFirmService;

    private UUID userId;
    private User testUser;

    @BeforeEach
    void setUp() {
        vcFirmService = new VCFirmService(vcFirmRepository, vcMemberRepository, userRepository,
                new FirmAccessPolicy(vcMemberRepository));

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
}
