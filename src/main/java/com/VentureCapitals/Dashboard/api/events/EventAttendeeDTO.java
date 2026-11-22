package com.VentureCapitals.Dashboard.api.events;

import com.VentureCapitals.Dashboard.domain.events.RsvpStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventAttendeeDTO {
    private UUID id;
    private UUID userId;
    private String userEmail;
    private RsvpStatus rsvpStatus;
    private Instant rsvpAt;
}
