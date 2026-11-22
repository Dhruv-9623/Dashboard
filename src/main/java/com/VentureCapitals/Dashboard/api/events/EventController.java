package com.VentureCapitals.Dashboard.api.events;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.domain.events.CreateEventRequest;
import com.VentureCapitals.Dashboard.domain.events.EventAttendee;
import com.VentureCapitals.Dashboard.domain.events.EventService;
import com.VentureCapitals.Dashboard.domain.events.EventView;
import com.VentureCapitals.Dashboard.domain.events.RsvpRequest;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Platform events, for investors and founders alike. */
@RestController
@RequestMapping("/api/events")
public class EventController {
    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<EventDTO>>> list(
            @CurrentUser User user,
            @RequestParam(defaultValue = "true") boolean upcoming) {
        return ResponseEntity.ok(ApiResponse.ok(
                eventService.list(user, upcoming).stream().map(EventController::toDTO).toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EventDTO>> get(@CurrentUser User user, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(toDTO(eventService.get(user, id))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<EventDTO>> create(
            @CurrentUser User user,
            @Valid @RequestBody CreateEventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(toDTO(eventService.create(user, request))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@CurrentUser User user, @PathVariable UUID id) {
        eventService.delete(user, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/rsvp")
    public ResponseEntity<ApiResponse<EventDTO>> rsvp(
            @CurrentUser User user,
            @PathVariable UUID id,
            @Valid @RequestBody RsvpRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(toDTO(eventService.rsvp(user, id, request.getRsvpStatus()))));
    }

    @GetMapping("/{id}/attendees")
    public ResponseEntity<ApiResponse<List<EventAttendeeDTO>>> attendees(@CurrentUser User user, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(
                eventService.attendees(user, id).stream().map(EventController::toDTO).toList()));
    }

    private static EventDTO toDTO(EventView view) {
        var event = view.event();
        return EventDTO.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .eventType(event.getEventType())
                .hostName(view.hostName())
                .hostUserId(event.getHostUser().getId())
                .startTime(event.getStartTime())
                .endTime(event.getEndTime())
                .location(event.getLocation())
                .virtualLink(event.getVirtualLink())
                .isPublic(event.isPublic())
                .attendeeCount(view.attendeeCount())
                .myRsvp(view.myRsvp())
                .build();
    }

    private static EventAttendeeDTO toDTO(EventAttendee attendee) {
        return EventAttendeeDTO.builder()
                .id(attendee.getId())
                .userId(attendee.getUser().getId())
                .userEmail(attendee.getUser().getEmail())
                .rsvpStatus(attendee.getRsvpStatus())
                .rsvpAt(attendee.getRsvpAt())
                .build();
    }
}
