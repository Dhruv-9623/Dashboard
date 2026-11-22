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
public class MessageDTO {
    private UUID id;
    private UUID conversationId;
    private UUID senderUserId;
    private String senderEmail;
    private String body;
    private Instant sentAt;
    private Instant readAt;
}
