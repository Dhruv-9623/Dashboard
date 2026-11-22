package com.VentureCapitals.Dashboard.domain.messaging;

import com.VentureCapitals.Dashboard.common.TargetType;

import java.util.UUID;

/**
 * Who the other side of a request or conversation is: a person, and the organisation they speak
 * for. The organisation is what a reader recognises — "Meridian Ventures", not an email address.
 */
public record Counterparty(UUID userId, String email, String displayName, TargetType entityType,
                           UUID entityId, String entityName, String logoUrl) {
}
