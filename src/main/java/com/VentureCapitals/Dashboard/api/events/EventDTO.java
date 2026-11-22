package com.VentureCapitals.Dashboard.api.events;

import com.VentureCapitals.Dashboard.domain.events.EventType;
import com.VentureCapitals.Dashboard.domain.events.RsvpStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventDTO {
    private UUID id;
    private String title;
    private String description;
    private EventType eventType;
    private String hostName;
    private UUID hostUserId;
    private Instant startTime;
    private Instant endTime;
    private String location;
    private String virtualLink;
    // Lombok names the getter isPublic(), which Jackson would otherwise serialise as "public".
    @Getter(onMethod_ = @JsonProperty("isPublic"))
    private boolean isPublic;
    private long attendeeCount;
    private RsvpStatus myRsvp;
}
