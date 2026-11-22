package com.VentureCapitals.Dashboard.domain.messaging;

import com.VentureCapitals.Dashboard.common.TargetType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** Addressed to an organisation; the service resolves it to the person who speaks for it. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateConnectionRequest {
    @NotNull(message = "Say whether you are writing to a firm or a startup")
    private TargetType targetType;

    @NotNull(message = "Choose who to connect with")
    private UUID targetId;

    @Size(max = 1000, message = "The introduction must be at most 1000 characters")
    private String message;
}
