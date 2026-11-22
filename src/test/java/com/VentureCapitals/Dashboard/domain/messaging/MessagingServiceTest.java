package com.VentureCapitals.Dashboard.domain.messaging;

import com.VentureCapitals.Dashboard.common.TargetType;
import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;
import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.common.exception.ValidationException;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupMember;
import com.VentureCapitals.Dashboard.domain.startup.StartupMemberRepository;
import com.VentureCapitals.Dashboard.domain.startup.StartupRole;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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

/**
 * Business Rule 1 — a conversation exists only because a request was accepted — and the rules
 * around it: who may ask whom, who may answer, and who may speak once a chat is open.
 */
@ExtendWith(MockitoExtension.class)
class MessagingServiceTest {
    @Mock private ConnectionRequestRepository requests;
    @Mock private ConversationRepository conversations;
    @Mock private MessageRepository messages;
    @Mock private VCMemberRepository vcMembers;
    @Mock private StartupMemberRepository startupMembers;

    private MessagingService service;
    private User investor;
    private User founder;
    private VCFirm firm;
    private Startup startup;

    @BeforeEach
    void setUp() {
        service = new MessagingService(requests, conversations, messages, vcMembers, startupMembers,
                new CounterpartyResolver(vcMembers, startupMembers));
        investor = user("owner@meridian.vc", UserType.VC);
        founder = user("priya.shah@ledgerly.in", UserType.STARTUP);
        firm = VCFirm.builder().name("Meridian Ventures").build();
        firm.setId(UUID.randomUUID());
        startup = Startup.builder().name("Ledgerly").build();
        startup.setId(UUID.randomUUID());
    }

    private static User user(String email, UserType type) {
        User user = User.builder().email(email).userType(type).build();
        user.setId(UUID.randomUUID());
        return user;
    }

    private void startupHasFounder() {
        when(startupMembers.findByStartupIdOrderByJoinedAtAsc(startup.getId())).thenReturn(List.of(
                StartupMember.builder().user(founder).startup(startup).role(StartupRole.FOUNDER).joinedAt(Instant.now()).build()));
    }

    private void firmHasOwner() {
        when(vcMembers.findFirstByFirmIdAndRole(firm.getId(), VCRole.OWNER)).thenReturn(Optional.of(
                VCMember.builder().user(investor).firm(firm).role(VCRole.OWNER).joinedAt(Instant.now()).build()));
    }

    private ConnectionRequest pending(User from, User to) {
        ConnectionRequest request = ConnectionRequest.builder().fromUser(from).toUser(to)
                .status(ConnectionStatus.PENDING).requestedAt(Instant.now()).build();
        request.setId(UUID.randomUUID());
        return request;
    }

    private static CreateConnectionRequest ask(TargetType type, UUID target) {
        return new CreateConnectionRequest(type, target, "Keen to talk");
    }

    // --- Asking -----------------------------------------------------------------------------

    @Test
    void an_investor_can_ask_a_startup_and_the_request_goes_to_its_founder() {
        startupHasFounder();
        when(requests.save(any())).thenAnswer(call -> call.getArgument(0));

        ConnectionRequest saved = service.request(investor, ask(TargetType.STARTUP, startup.getId()));

        assertThat(saved.getToUser()).isSameAs(founder);
        assertThat(saved.getFromUser()).isSameAs(investor);
        assertThat(saved.getStatus()).isEqualTo(ConnectionStatus.PENDING);
        assertThat(saved.getRespondedAt()).isNull();
        // Asking opens nothing. Only an answer can.
        verify(conversations, never()).save(any());
    }

    @Test
    void a_founder_can_ask_a_firm_and_the_request_goes_to_its_owner() {
        firmHasOwner();
        when(requests.save(any())).thenAnswer(call -> call.getArgument(0));

        ConnectionRequest saved = service.request(founder, ask(TargetType.VC_FIRM, firm.getId()));

        assertThat(saved.getToUser()).isSameAs(investor);
    }

    @Test
    void each_side_can_only_approach_the_other() {
        assertThatThrownBy(() -> service.request(investor, ask(TargetType.VC_FIRM, firm.getId())))
                .isInstanceOf(ValidationException.class).hasMessageContaining("Investors send");
        assertThatThrownBy(() -> service.request(founder, ask(TargetType.STARTUP, startup.getId())))
                .isInstanceOf(ValidationException.class).hasMessageContaining("Founders send");
        verify(requests, never()).save(any());
    }

    @Test
    void a_request_to_your_own_organisation_is_refused() {
        // The founder's own startup: the recipient resolves to a teammate in the same startup.
        User teammate = user("kabir@ledgerly.in", UserType.STARTUP);
        when(startupMembers.findByStartupIdOrderByJoinedAtAsc(startup.getId())).thenReturn(List.of(
                StartupMember.builder().user(teammate).startup(startup).role(StartupRole.FOUNDER).joinedAt(Instant.now()).build()));
        VCFirm other = VCFirm.builder().name("X").build();
        other.setId(UUID.randomUUID());
        // Make the sender an investor who is, oddly, on the same entity id: simulate by membership.
        when(vcMembers.findByUserIdIn(any())).thenReturn(List.of());
        when(startupMembers.findByUserIdIn(any())).thenReturn(List.of(
                StartupMember.builder().user(teammate).startup(startup).role(StartupRole.FOUNDER).joinedAt(Instant.now()).build(),
                StartupMember.builder().user(investor).startup(startup).role(StartupRole.FOUNDER).joinedAt(Instant.now()).build()));

        assertThatThrownBy(() -> service.request(investor, ask(TargetType.STARTUP, startup.getId())))
                .isInstanceOf(ValidationException.class).hasMessageContaining("own organisation");
    }

    @Test
    void asking_someone_who_has_nobody_to_answer_is_a_not_found() {
        when(startupMembers.findByStartupIdOrderByJoinedAtAsc(startup.getId())).thenReturn(List.of());

        assertThatThrownBy(() -> service.request(investor, ask(TargetType.STARTUP, startup.getId())))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void a_second_request_while_one_is_waiting_is_refused_and_says_so() {
        startupHasFounder();
        when(requests.findLive(investor.getId(), founder.getId())).thenReturn(Optional.of(pending(investor, founder)));

        assertThatThrownBy(() -> service.request(investor, ask(TargetType.STARTUP, startup.getId())))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("Waiting for a reply");
    }

    @Test
    void a_request_to_someone_who_already_asked_you_points_you_at_theirs() {
        startupHasFounder();
        // Both directions are checked: nothing from the investor, but the founder already asked.
        when(requests.findLive(investor.getId(), founder.getId())).thenReturn(Optional.empty());
        when(requests.findLive(founder.getId(), investor.getId())).thenReturn(Optional.of(pending(founder, investor)));

        assertThatThrownBy(() -> service.request(investor, ask(TargetType.STARTUP, startup.getId())))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("already asked to connect with you");
    }

    @Test
    void asking_someone_you_are_already_connected_to_tells_you_to_open_messages() {
        startupHasFounder();
        ConnectionRequest accepted = pending(investor, founder);
        accepted.setStatus(ConnectionStatus.ACCEPTED);
        when(requests.findLive(investor.getId(), founder.getId())).thenReturn(Optional.of(accepted));

        assertThatThrownBy(() -> service.request(investor, ask(TargetType.STARTUP, startup.getId())))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("already connected");
    }

    // --- Answering: the moment a conversation comes into being --------------------------------

    @Test
    void accepting_is_what_opens_the_conversation() {
        ConnectionRequest request = pending(investor, founder);
        when(requests.findWithUsersById(request.getId())).thenReturn(Optional.of(request));
        when(requests.save(any())).thenAnswer(call -> call.getArgument(0));

        ConnectionRequest answered = service.respond(founder, request.getId(), ConnectionStatus.ACCEPTED);

        assertThat(answered.getStatus()).isEqualTo(ConnectionStatus.ACCEPTED);
        assertThat(answered.getRespondedAt()).isNotNull();
        ArgumentCaptor<Conversation> opened = ArgumentCaptor.forClass(Conversation.class);
        verify(conversations).save(opened.capture());
        assertThat(opened.getValue().getConnectionRequest()).isSameAs(answered);
    }

    @Test
    void declining_opens_nothing() {
        ConnectionRequest request = pending(investor, founder);
        when(requests.findWithUsersById(request.getId())).thenReturn(Optional.of(request));
        when(requests.save(any())).thenAnswer(call -> call.getArgument(0));

        service.respond(founder, request.getId(), ConnectionStatus.REJECTED);

        verify(conversations, never()).save(any());
    }

    @Test
    void the_person_who_asked_cannot_answer_their_own_request() {
        ConnectionRequest request = pending(investor, founder);
        when(requests.findWithUsersById(request.getId())).thenReturn(Optional.of(request));

        // Otherwise anyone could grant themselves consent.
        assertThatThrownBy(() -> service.respond(investor, request.getId(), ConnectionStatus.ACCEPTED))
                .isInstanceOf(UnauthorizedException.class);
        verify(conversations, never()).save(any());
    }

    @Test
    void a_stranger_cannot_tell_a_request_exists() {
        ConnectionRequest request = pending(investor, founder);
        when(requests.findWithUsersById(request.getId())).thenReturn(Optional.of(request));

        assertThatThrownBy(() -> service.respond(user("x@y.z", UserType.STARTUP), request.getId(), ConnectionStatus.ACCEPTED))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void a_request_is_answered_once() {
        ConnectionRequest request = pending(investor, founder);
        request.setStatus(ConnectionStatus.REJECTED);
        when(requests.findWithUsersById(request.getId())).thenReturn(Optional.of(request));

        assertThatThrownBy(() -> service.respond(founder, request.getId(), ConnectionStatus.ACCEPTED))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("already been answered");
        verify(conversations, never()).save(any());
    }

    @Test
    void the_only_answers_are_accept_and_decline() {
        assertThatThrownBy(() -> service.respond(founder, UUID.randomUUID(), ConnectionStatus.PENDING))
                .isInstanceOf(ValidationException.class);
    }

    // --- Speaking ---------------------------------------------------------------------------

    private Conversation conversationBetween(User from, User to, ConnectionStatus status) {
        ConnectionRequest request = pending(from, to);
        request.setStatus(status);
        Conversation conversation = Conversation.builder().connectionRequest(request).build();
        conversation.setId(UUID.randomUUID());
        when(conversations.findWithParticipantsById(conversation.getId())).thenReturn(Optional.of(conversation));
        return conversation;
    }

    @Test
    void either_participant_can_send_and_the_text_is_trimmed() {
        Conversation conversation = conversationBetween(investor, founder, ConnectionStatus.ACCEPTED);
        when(messages.save(any())).thenAnswer(call -> call.getArgument(0));

        assertThat(service.send(investor, conversation.getId(), "  Hello  ").getBody()).isEqualTo("Hello");
        assertThat(service.send(founder, conversation.getId(), "Hi").getSender()).isSameAs(founder);
    }

    @Test
    void someone_outside_the_conversation_cannot_send_or_read_and_is_told_it_does_not_exist() {
        Conversation conversation = conversationBetween(investor, founder, ConnectionStatus.ACCEPTED);
        User outsider = user("nosy@x.y", UserType.VC);

        assertThatThrownBy(() -> service.send(outsider, conversation.getId(), "hi"))
                .isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> service.messages(outsider, conversation.getId()))
                .isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> service.markRead(outsider, conversation.getId()))
                .isInstanceOf(EntityNotFoundException.class);
        verify(messages, never()).save(any());
    }

    @Test
    void a_chat_whose_request_is_not_accepted_cannot_be_written_in() {
        // Defence in depth: the schema and the service should already prevent this state.
        Conversation conversation = conversationBetween(investor, founder, ConnectionStatus.REJECTED);

        assertThatThrownBy(() -> service.send(investor, conversation.getId(), "hi"))
                .isInstanceOf(BusinessRuleViolationException.class);
        verify(messages, never()).save(any());
    }

    @Test
    void an_empty_message_is_refused() {
        Conversation conversation = conversationBetween(investor, founder, ConnectionStatus.ACCEPTED);

        assertThatThrownBy(() -> service.send(investor, conversation.getId(), "   "))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void reading_marks_the_other_persons_messages_not_your_own() {
        Conversation conversation = conversationBetween(investor, founder, ConnectionStatus.ACCEPTED);

        service.markRead(founder, conversation.getId());

        verify(messages).markRead(any(), org.mockito.ArgumentMatchers.eq(founder.getId()), any());
    }

    // --- Naming -----------------------------------------------------------------------------

    @Test
    void a_readable_name_is_made_from_an_address() {
        assertThat(CounterpartyResolver.nameFrom("priya.shah@ledgerly.in")).isEqualTo("Priya Shah");
        assertThat(CounterpartyResolver.nameFrom("owner@demo.test")).isEqualTo("Owner");
        assertThat(CounterpartyResolver.nameFrom("a_b-c@x.y")).isEqualTo("A B C");
    }

    // --- A connection is between organisations -----------------------------------------------

    @Test
    void a_second_founder_cannot_ask_a_firm_their_colleague_is_already_connected_to() {
        User cofounder = user("kabir@ledgerly.in", UserType.STARTUP);
        // The investor is Meridian's owner; the startup has two founders, one of whom is already talking to them.
        when(vcMembers.findFirstByFirmIdAndRole(firm.getId(), VCRole.OWNER)).thenReturn(Optional.of(
                VCMember.builder().user(investor).firm(firm).role(VCRole.OWNER).joinedAt(Instant.now()).build()));
        VCMember ownerSeat = VCMember.builder().user(investor).firm(firm).role(VCRole.OWNER).joinedAt(Instant.now()).build();
        StartupMember cofounderSeat = StartupMember.builder().user(cofounder).startup(startup)
                .role(StartupRole.CO_FOUNDER).joinedAt(Instant.now()).build();
        StartupMember founderSeat = StartupMember.builder().user(founder).startup(startup)
                .role(StartupRole.FOUNDER).joinedAt(Instant.now()).build();
        when(vcMembers.findByUserIdIn(any())).thenReturn(List.of(ownerSeat));
        when(startupMembers.findByUserIdIn(any())).thenReturn(List.of(cofounderSeat));
        when(vcMembers.findByFirmId(firm.getId())).thenReturn(List.of(ownerSeat));
        when(startupMembers.findByStartupIdOrderByJoinedAtAsc(startup.getId())).thenReturn(List.of(founderSeat, cofounderSeat));
        ConnectionRequest connected = pending(investor, founder);
        connected.setStatus(ConnectionStatus.ACCEPTED);
        when(requests.findLiveBetween(any(), any())).thenReturn(List.of(connected));

        assertThatThrownBy(() -> service.request(cofounder, ask(TargetType.VC_FIRM, firm.getId())))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("already connected with Meridian Ventures");
        verify(requests, never()).save(any());
    }
}
