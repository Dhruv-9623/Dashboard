package com.VentureCapitals.Dashboard.domain.startup;

import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.config.BaseUnitTest;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserRepository;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import com.VentureCapitals.Dashboard.testdata.TestDataBuilder;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StartupServiceTest extends BaseUnitTest {

    @Mock
    private StartupRepository startupRepository;
    @Mock
    private StartupMemberRepository memberRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private VCMemberRepository vcMemberRepository;
    @InjectMocks
    private StartupService startupService;

    private static StartupRequest validRequest() {
        return StartupRequest.builder().name(" Lumen Health ").sector("Healthtech").stage(StartupStage.SEED)
                .website("  ").build();
    }

    private static User founder() {
        return TestDataBuilder.user().withId(UUID.randomUUID()).withUserType(UserType.STARTUP).build();
    }

    private static Startup startup(UUID id) {
        Startup s = Startup.builder().name("Lumen").sector("Healthtech").stage(StartupStage.SEED).build();
        s.setId(id);
        return s;
    }

    @Test
    void create_saves_profile_and_makes_creator_founder() {
        User founder = founder();
        when(memberRepository.findByUserId(founder.getId())).thenReturn(Optional.empty());
        when(vcMemberRepository.findByUserId(founder.getId())).thenReturn(Optional.empty());
        when(startupRepository.save(any(Startup.class))).thenAnswer(inv -> inv.getArgument(0));

        Startup created = startupService.createStartup(founder, validRequest());

        assertThat(created.getName()).isEqualTo("Lumen Health");
        assertThat(created.getWebsite()).as("blank strings stored as null").isNull();
        verify(memberRepository).save(org.mockito.ArgumentMatchers.argThat(m ->
                m.getRole() == StartupRole.FOUNDER && m.getUser() == founder));
    }

    @Test
    void vc_accounts_cannot_create_a_startup() {
        User vc = TestDataBuilder.user().withId(UUID.randomUUID()).withUserType(UserType.VC).build();

        assertThatThrownBy(() -> startupService.createStartup(vc, validRequest()))
                .isInstanceOf(UnauthorizedException.class);
        verify(startupRepository, never()).save(any());
    }

    @Test
    void a_user_can_only_belong_to_one_startup() {
        User founder = founder();
        when(memberRepository.findByUserId(founder.getId())).thenReturn(Optional.of(new StartupMember()));

        assertThatThrownBy(() -> startupService.createStartup(founder, validRequest()))
                .isInstanceOf(BusinessRuleViolationException.class);
    }

    @Test
    void only_the_startups_own_team_can_edit_it() {
        User outsider = founder();
        UUID startupId = UUID.randomUUID();
        when(startupRepository.findById(startupId)).thenReturn(Optional.of(startup(startupId)));
        StartupMember otherTeam = StartupMember.builder().startup(startup(UUID.randomUUID())).build();
        when(memberRepository.findByUserId(outsider.getId())).thenReturn(Optional.of(otherTeam));

        assertThatThrownBy(() -> startupService.updateStartup(outsider, startupId, validRequest()))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void invitee_must_be_a_startup_account_without_a_team() {
        User founder = founder();
        UUID startupId = UUID.randomUUID();
        Startup startup = startup(startupId);
        when(startupRepository.findById(startupId)).thenReturn(Optional.of(startup));
        when(memberRepository.findByUserId(founder.getId()))
                .thenReturn(Optional.of(StartupMember.builder().startup(startup).build()));
        User vcUser = TestDataBuilder.user().withId(UUID.randomUUID()).withUserType(UserType.VC).build();
        when(userRepository.findByEmail("vc@x.test")).thenReturn(Optional.of(vcUser));

        assertThatThrownBy(() -> startupService.addMember(founder, startupId,
                AddStartupMemberRequest.builder().email("vc@x.test").role(StartupRole.CO_FOUNDER).build()))
                .isInstanceOf(BusinessRuleViolationException.class);

        User busy = TestDataBuilder.user().withId(UUID.randomUUID()).withUserType(UserType.STARTUP).build();
        when(userRepository.findByEmail("busy@x.test")).thenReturn(Optional.of(busy));
        when(memberRepository.findByUserId(busy.getId())).thenReturn(Optional.of(new StartupMember()));

        assertThatThrownBy(() -> startupService.addMember(founder, startupId,
                AddStartupMemberRequest.builder().email("busy@x.test").role(StartupRole.CO_FOUNDER).build()))
                .isInstanceOf(BusinessRuleViolationException.class);
    }

    @Test
    void the_last_founder_cannot_be_removed() {
        User founder = founder();
        UUID startupId = UUID.randomUUID();
        Startup startup = startup(startupId);
        StartupMember self = StartupMember.builder().user(founder).startup(startup).role(StartupRole.FOUNDER).build();
        self.setId(UUID.randomUUID());
        when(memberRepository.findByUserId(founder.getId())).thenReturn(Optional.of(self));
        when(memberRepository.findWithUserById(self.getId())).thenReturn(Optional.of(self));
        when(memberRepository.findByStartupIdOrderByJoinedAtAsc(startupId)).thenReturn(List.of(self));

        assertThatThrownBy(() -> startupService.removeMember(founder, startupId, self.getId()))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("at least one founder");
        verify(memberRepository, never()).delete(any());
    }

    @Test
    void raising_only_filter_returns_nothing_until_funding_cycles_exist() {
        var page = startupService.searchStartups(null, null, null, true, PageRequest.of(0, 20));

        assertThat(page.getTotalElements()).isZero();
        verify(startupRepository, never()).findAll(any(org.springframework.data.jpa.domain.Specification.class),
                any(org.springframework.data.domain.Pageable.class));
    }

    @Test
    void vc_firm_members_cannot_start_a_startup_either() {
        User founder = founder();
        when(memberRepository.findByUserId(founder.getId())).thenReturn(Optional.empty());
        when(vcMemberRepository.findByUserId(founder.getId())).thenReturn(Optional.of(new VCMember()));

        assertThatThrownBy(() -> startupService.createStartup(founder, validRequest()))
                .isInstanceOf(BusinessRuleViolationException.class);
    }
}
