package com.VentureCapitals.Dashboard.domain.messaging;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RespondToConnectionRequest {
    @NotNull(message = "Accept or decline")
    private ConnectionStatus status;
}
