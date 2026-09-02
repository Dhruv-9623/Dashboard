package com.VentureCapitals.Dashboard.domain.vc;

import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserRepository;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
        vcFirmService = new VCFirmService(vcFirmRepository, vcMemberRepository, userRepository);

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
}
