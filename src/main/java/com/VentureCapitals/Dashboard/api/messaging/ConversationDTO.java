package com.VentureCapitals.Dashboard.api.messaging;

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
public class ConversationDTO {
    private UUID id;
    private CounterpartyDTO counterparty;
    private String lastMessagePreview;
    private Instant lastMessageAt;
    private long unreadCount;
    private Instant createdAt;
}
