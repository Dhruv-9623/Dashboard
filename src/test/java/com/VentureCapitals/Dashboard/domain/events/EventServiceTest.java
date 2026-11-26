package com.VentureCapitals.Dashboard.domain.events;

import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.common.exception.ValidationException;
import com.VentureCapitals.Dashboard.domain.messaging.CounterpartyResolver;
import com.VentureCapitals.Dashboard.domain.startup.StartupMemberRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
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
class EventServiceTest {
    private static final Instant NOW = Instant.parse("2026-11-07T10:00:00Z");

    @Mock private EventRepository events;
    @Mock private EventAttendeeRepository attendees;
    @Mock private VCMemberRepository vcMembers;
    @Mock private StartupMemberRepository startupMembers;

    private EventService service;
    private User host;
    private User guest;

    @BeforeEach
    void setUp() {
        service = new EventService(events, attendees, new CounterpartyResolver(vcMembers, startupMembers),
                Clock.fixed(NOW, ZoneOffset.UTC));
        host = user("host@meridian.vc", UserType.VC);
        guest = user("guest@ledgerly.in", UserType.STARTUP);
    }

    private static User user(String email, UserType type) {
        User user = User.builder().email(email).userType(type).build();
        user.setId(UUID.randomUUID());
        return user;
    }

    private Event event(boolean isPublic) {
        Event event = Event.builder().hostUser(host).title("Demo day").eventType(EventType.DEMO_DAY)
                .startTime(NOW.plus(Duration.ofDays(3))).isPublic(isPublic).build();
        event.setId(UUID.randomUUID());
        return event;
    }

    private static CreateEventRequest request(Instant start, Instant end) {
        return CreateEventRequest.builder().title("  Founder office hours ").eventType(EventType.OFFICE_HOURS)
                .startTime(start).endTime(end).location("Bengaluru").isPublic(true).build();
    }

    @Test
    void hosting_an_event_counts_the_host_as_going() {
        when(events.save(any())).thenAnswer(call -> {
            Event saved = call.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });
        when(attendees.save(any())).thenAnswer(call -> call.getArgument(0));
        when(attendees.countGoing(any())).thenReturn(List.of());

        service.create(host, request(NOW.plus(Duration.ofDays(1)), null));

        ArgumentCaptor<EventAttendee> hostRow = ArgumentCaptor.forClass(EventAttendee.class);
        verify(attendees).save(hostRow.capture());
        assertThat(hostRow.getValue().getUser()).isSameAs(host);
        assertThat(hostRow.getValue().getRsvpStatus()).isEqualTo(RsvpStatus.GOING);
    }

    @Test
    void the_title_is_trimmed_and_an_event_cannot_end_before_it_starts() {
        assertThatThrownBy(() -> service.create(host, request(NOW.plus(Duration.ofDays(1)), NOW)))
                .isInstanceOf(ValidationException.class).hasMessageContaining("end after it starts");
        verify(events, never()).save(any());
    }

    @Test
    void a_private_event_is_not_found_by_someone_it_was_not_shared_with() {
        Event hidden = event(false);
        when(events.findWithHostById(hidden.getId())).thenReturn(Optional.of(hidden));
        when(attendees.findByEventIdAndUserId(hidden.getId(), guest.getId())).thenReturn(Optional.empty());

        // Not "forbidden": that would confirm the event exists.
        assertThatThrownBy(() -> service.get(guest, hidden.getId())).isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> service.rsvp(guest, hidden.getId(), RsvpStatus.GOING))
                .isInstanceOf(EntityNotFoundException.class);
        verify(attendees, never()).save(any());
    }

    @Test
    void a_reply_changes_the_existing_row_instead_of_adding_a_second() {
        Event open = event(true);
        EventAttendee existing = EventAttendee.builder().event(open).user(guest)
                .rsvpStatus(RsvpStatus.MAYBE).rsvpAt(NOW.minusSeconds(60)).build();
        when(events.findWithHostById(open.getId())).thenReturn(Optional.of(open));
        when(attendees.findByEventIdAndUserId(open.getId(), guest.getId())).thenReturn(Optional.of(existing));
        when(attendees.save(any())).thenAnswer(call -> call.getArgument(0));
        when(attendees.countGoing(any())).thenReturn(List.of());
        when(attendees.findMine(any(), any())).thenReturn(List.of(existing));

        EventView view = service.rsvp(guest, open.getId(), RsvpStatus.GOING);

        assertThat(existing.getRsvpStatus()).isEqualTo(RsvpStatus.GOING);
        assertThat(existing.getRsvpAt()).isEqualTo(NOW);
        assertThat(view.myRsvp()).isEqualTo(RsvpStatus.GOING);
    }

    @Test
    void only_the_host_sees_who_has_replied() {
        Event open = event(true);
        when(events.findWithHostById(open.getId())).thenReturn(Optional.of(open));

        assertThatThrownBy(() -> service.attendees(guest, open.getId())).isInstanceOf(UnauthorizedException.class);

        when(attendees.findByEventIdOrderByRsvpAtAsc(open.getId())).thenReturn(List.of());
        assertThat(service.attendees(host, open.getId())).isEmpty();
    }

    @Test
    void upcoming_and_past_are_cut_at_the_clocks_now() {
        when(events.findUpcomingVisibleTo(guest.getId(), NOW)).thenReturn(List.of());
        when(events.findPastVisibleTo(guest.getId(), NOW)).thenReturn(List.of());

        assertThat(service.list(guest, true)).isEmpty();
        assertThat(service.list(guest, false)).isEmpty();
        verify(events).findUpcomingVisibleTo(guest.getId(), NOW);
        verify(events).findPastVisibleTo(guest.getId(), NOW);
    }

    // --- Past dates and deleting ------------------------------------------------------------

    @Test
    void an_event_cannot_be_created_in_the_past() {
        assertThatThrownBy(() -> service.create(host, request(NOW.minus(Duration.ofDays(2)), NOW.minus(Duration.ofDays(1)))))
                .isInstanceOf(ValidationException.class).hasMessageContaining("past");
        verify(events, never()).save(any());
    }

    @Test
    void an_event_starting_right_now_is_not_refused_for_the_seconds_it_took_to_submit() {
        when(events.save(any())).thenAnswer(call -> {
            Event saved = call.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        service.create(host, request(NOW.minusSeconds(90), null));

        verify(events).save(any());
    }

    @Test
    void the_host_can_delete_an_event_and_its_replies() {
        Event past = event(true);
        past.setStartTime(NOW.minus(Duration.ofDays(30)));
        when(events.findWithHostById(past.getId())).thenReturn(Optional.of(past));

        service.delete(host, past.getId());

        verify(attendees).deleteByEventId(past.getId());
        verify(events).delete(past);
    }

    @Test
    void someone_else_cannot_delete_a_public_event() {
        Event event = event(true);
        when(events.findWithHostById(event.getId())).thenReturn(Optional.of(event));

        assertThatThrownBy(() -> service.delete(guest, event.getId())).isInstanceOf(UnauthorizedException.class);
        verify(events, never()).delete(any());
    }

    @Test
    void a_private_event_looks_like_it_does_not_exist_to_someone_who_cannot_see_it() {
        Event event = event(false);
        when(events.findWithHostById(event.getId())).thenReturn(Optional.of(event));
        when(attendees.findByEventIdAndUserId(event.getId(), guest.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(guest, event.getId())).isInstanceOf(EntityNotFoundException.class);
        verify(events, never()).delete(any());
    }

    @Test
    void an_event_with_neither_a_location_nor_a_link_is_refused() {
        CreateEventRequest noWhere = CreateEventRequest.builder().title("Ghost event").eventType(EventType.NETWORKING)
                .startTime(NOW.plusSeconds(3600)).location("  ").virtualLink("").build();

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.create(host, noWhere))
                .isInstanceOf(com.VentureCapitals.Dashboard.common.exception.ValidationException.class)
                .hasMessageContaining("where it happens");
    }
}
