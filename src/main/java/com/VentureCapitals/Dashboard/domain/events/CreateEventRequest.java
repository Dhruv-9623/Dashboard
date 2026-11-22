package com.VentureCapitals.Dashboard.domain.events;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateEventRequest {
    @NotBlank(message = "Give the event a title")
    @Size(max = 200, message = "Title must be at most 200 characters")
    private String title;

    @Size(max = 5000, message = "Description must be at most 5000 characters")
    private String description;

    @NotNull(message = "Choose a type of event")
    private EventType eventType;

    @NotNull(message = "Choose a start time")
    private Instant startTime;

    private Instant endTime;

    @Size(max = 255, message = "Location must be at most 255 characters")
    private String location;

    @Pattern(regexp = "^$|^https?://\\S+$", message = "The link must start with http:// or https://")
    @Size(max = 512, message = "The link must be at most 512 characters")
    private String virtualLink;

    // Lombok would call the property "public"; the API has always said isPublic.
    @JsonProperty("isPublic")
    private boolean isPublic;
}
