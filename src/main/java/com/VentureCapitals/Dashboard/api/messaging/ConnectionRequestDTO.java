package com.VentureCapitals.Dashboard.api.messaging;

import com.VentureCapitals.Dashboard.domain.messaging.ConnectionStatus;
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
public class ConnectionRequestDTO {
    private UUID id;
    private CounterpartyDTO from;
    private CounterpartyDTO to;
    private ConnectionStatus status;
    private String message;
    private Instant requestedAt;
    private Instant respondedAt;
}
