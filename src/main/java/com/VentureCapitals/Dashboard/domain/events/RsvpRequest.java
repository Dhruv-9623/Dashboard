package com.VentureCapitals.Dashboard.domain.events;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RsvpRequest {
    @NotNull(message = "Choose going, maybe or not going")
    private RsvpStatus rsvpStatus;
}
