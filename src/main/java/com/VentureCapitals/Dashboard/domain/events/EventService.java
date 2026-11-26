package com.VentureCapitals.Dashboard.domain.events;

import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.common.exception.ValidationException;
import com.VentureCapitals.Dashboard.domain.messaging.Counterparty;
import com.VentureCapitals.Dashboard.domain.messaging.CounterpartyResolver;
import com.VentureCapitals.Dashboard.domain.user.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@Transactional
public class EventService {
    private static final Duration START_GRACE = Duration.ofMinutes(5);

    private final EventRepository events;
    private final EventAttendeeRepository attendees;
    private final CounterpartyResolver counterparties;
    private final Clock clock;

    public EventService(EventRepository events, EventAttendeeRepository attendees,
                        CounterpartyResolver counterparties, Clock clock) {
        this.events = events;
        this.attendees = attendees;
        this.counterparties = counterparties;
        this.clock = clock;
    }

    /** What the person may see, upcoming or past. Private events appear only to their host and invitees. */
    @Transactional(readOnly = true)
    public List<EventView> list(User viewer, boolean upcoming) {
        Instant now = Instant.now(clock);
        List<Event> visible = upcoming
                ? events.findUpcomingVisibleTo(viewer.getId(), now)
                : events.findPastVisibleTo(viewer.getId(), now);
        return decorate(viewer, visible);
    }

    @Transactional(readOnly = true)
    public EventView get(User viewer, UUID eventId) {
        return decorate(viewer, List.of(visibleEvent(viewer, eventId))).get(0);
    }

    /** Anyone signed in can host. The host is counted as going: they are plainly attending. */
    public EventView create(User host, CreateEventRequest request) {
        // A few minutes of slack, so an event that starts "now" isn't refused for the seconds it took to submit.
        if (request.getStartTime().isBefore(Instant.now(clock).minus(START_GRACE))) {
            throw new ValidationException("An event can't start in the past. Pick a date and time that hasn't passed.");
        }
        if (request.getEndTime() != null && !request.getEndTime().isAfter(request.getStartTime())) {
            throw new ValidationException("The event has to end after it starts.");
        }

        if (blankToNull(request.getLocation()) == null && blankToNull(request.getVirtualLink()) == null) {
            throw new ValidationException("Say where it happens: add a location, a link, or both.");
        }

        Event saved = events.save(Event.builder()
                .hostUser(host)
                .title(request.getTitle().trim())
                .description(blankToNull(request.getDescription()))
                .eventType(request.getEventType())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .location(blankToNull(request.getLocation()))
                .virtualLink(blankToNull(request.getVirtualLink()))
                .isPublic(request.isPublic())
                .build());

        attendees.save(EventAttendee.builder()
                .event(saved).user(host).rsvpStatus(RsvpStatus.GOING).rsvpAt(Instant.now(clock)).build());
        log.info("Event created: eventId={}, hostId={}", saved.getId(), host.getId());
        return decorate(host, List.of(saved)).get(0);
    }

    /**
     * Removes an event and every reply to it. Host only, and at any time: a past event the host no
     * longer wants on the list is as deletable as one that hasn't happened. Anyone else gets the
     * same not-found a stranger would, so nobody can probe which private events exist.
     */
    public void delete(User viewer, UUID eventId) {
        Event event = visibleEvent(viewer, eventId);
        if (!event.getHostUser().getId().equals(viewer.getId())) {
            throw new UnauthorizedException("Only the host can delete this event.");
        }
        attendees.deleteByEventId(eventId);
        events.delete(event);
        log.info("Event deleted: eventId={}, hostId={}", eventId, viewer.getId());
    }

    /** Replies, changing one in place. A reply to an event the person can't see is a not-found. */
    public EventView rsvp(User viewer, UUID eventId, RsvpStatus status) {
        Event event = visibleEvent(viewer, eventId);

        EventAttendee attendee = attendees.findByEventIdAndUserId(eventId, viewer.getId())
                .orElseGet(() -> EventAttendee.builder().event(event).user(viewer).build());
        attendee.setRsvpStatus(status);
        attendee.setRsvpAt(Instant.now(clock));
        attendees.save(attendee);

        return decorate(viewer, List.of(event)).get(0);
    }

    /**
     * Who has replied. Host only: who is going to an event is the host's to know, and listing
     * every attendee's address to every other attendee is not something people agreed to.
     */
    @Transactional(readOnly = true)
    public List<EventAttendee> attendees(User viewer, UUID eventId) {
        Event event = visibleEvent(viewer, eventId);
        if (!event.getHostUser().getId().equals(viewer.getId())) {
            throw new UnauthorizedException("Only the host can see who has replied.");
        }
        return attendees.findByEventIdOrderByRsvpAtAsc(eventId);
    }

    // --- helpers ----------------------------------------------------------------------------

    private Event visibleEvent(User viewer, UUID eventId) {
        Event event = events.findWithHostById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("That event no longer exists."));
        boolean mine = event.getHostUser().getId().equals(viewer.getId());
        boolean invited = !mine && !event.isPublic()
                && attendees.findByEventIdAndUserId(eventId, viewer.getId()).isPresent();
        if (!event.isPublic() && !mine && !invited) {
            throw new EntityNotFoundException("That event no longer exists.");
        }
        return event;
    }

    private List<EventView> decorate(User viewer, List<Event> list) {
        if (list.isEmpty()) return List.of();
        List<UUID> ids = list.stream().map(Event::getId).toList();

        Map<UUID, Long> going = new HashMap<>();
        attendees.countGoing(ids).forEach(row -> going.put(row.getEventId(), row.getGoing()));
        Map<UUID, RsvpStatus> mine = new HashMap<>();
        attendees.findMine(ids, viewer.getId()).forEach(a -> mine.put(a.getEvent().getId(), a.getRsvpStatus()));

        Map<UUID, Counterparty> hosts = counterparties.resolve(list.stream().map(Event::getHostUser).distinct().toList());

        return list.stream().map(event -> {
            Counterparty host = hosts.get(event.getHostUser().getId());
            String name = host.entityName() != null ? host.entityName() : host.displayName();
            return new EventView(event, name, going.getOrDefault(event.getId(), 0L), mine.get(event.getId()));
        }).toList();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
