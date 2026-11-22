package com.VentureCapitals.Dashboard.domain.outreach;

import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OutreachServiceTest {
    @Mock private OutreachRepository outreach;
    @Mock private StartupRepository startups;
    @Mock private VCMemberRepository vcMembers;

    private OutreachService service;
    private User actor;
    private VCFirm firm;

    @BeforeEach
    void setUp() {
        service = new OutreachService(outreach, startups, new FirmAccessPolicy(vcMembers));
        actor = User.builder().email("pm@meridian.vc").userType(UserType.VC).build();
        actor.setId(UUID.randomUUID());
        firm = VCFirm.builder().name("Meridian").build();
        firm.setId(UUID.randomUUID());
    }

    private void memberAs(VCRole role) {
        when(vcMembers.findByUserId(actor.getId())).thenReturn(Optional.of(
                VCMember.builder().user(actor).firm(firm).role(role).joinedAt(Instant.now()).build()));
    }

    @Test
    void a_portfolio_manager_can_write_to_a_startup_and_it_is_recorded_as_sent() {
        memberAs(VCRole.PORTFOLIO_MANAGER);
        Startup startup = Startup.builder().name("Ledgerly").build();
        startup.setId(UUID.randomUUID());
        when(startups.findById(startup.getId())).thenReturn(Optional.of(startup));
        when(outreach.save(any())).thenAnswer(call -> call.getArgument(0));

        Outreach sent = service.send(actor, new CreateOutreachRequest(startup.getId(), " Intro ", " Hello there "));

        assertThat(sent.getStatus()).isEqualTo(OutreachStatus.SENT);
        assertThat(sent.getSubject()).isEqualTo("Intro");
        assertThat(sent.getFromFirm()).isSameAs(firm);
        assertThat(sent.getSentByUserId()).isEqualTo(actor.getId());
    }

    @Test
    void staff_can_read_what_the_firm_sent_but_not_send() {
        memberAs(VCRole.STAFF);
        when(outreach.findByFromFirmIdOrderBySentAtDesc(firm.getId())).thenReturn(java.util.List.of());

        assertThat(service.list(actor)).isEmpty();
        assertThatThrownBy(() -> service.send(actor, new CreateOutreachRequest(UUID.randomUUID(), "s", "b")))
                .isInstanceOf(UnauthorizedException.class);
        verify(outreach, never()).save(any());
    }

    @Test
    void writing_to_a_startup_that_is_gone_is_a_not_found() {
        memberAs(VCRole.OWNER);
        UUID missing = UUID.randomUUID();
        when(startups.findById(missing)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.send(actor, new CreateOutreachRequest(missing, "s", "b")))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void someone_with_no_firm_cannot_send_or_read_outreach() {
        when(vcMembers.findByUserId(actor.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.list(actor)).isInstanceOf(UnauthorizedException.class);
    }
}
