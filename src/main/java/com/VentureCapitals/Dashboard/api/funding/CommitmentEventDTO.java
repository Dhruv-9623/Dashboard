package com.VentureCapitals.Dashboard.api.funding;

import com.VentureCapitals.Dashboard.domain.funding.CommitmentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

/**
 * One move in a round's history.
 *
 * <p>Carries both sides of the change rather than a label for it, so the client can derive the
 * running band totals at any point in time — which is what the founder's momentum chart is — as
 * well as render a readable line per row. A {@code fromStatus} of null means the pledge was made
 * here; equal statuses with different amounts mean the investor changed its number.
 */
@Data
@Builder
public class CommitmentEventDTO {
    private UUID id;
    private UUID commitmentId;
    private UUID vcFirmId;
    /** The investor's name. Present for the founder, and for a firm reading back its own moves. */
    private String vcFirmName;
    private CommitmentStatus fromStatus;
    private CommitmentStatus toStatus;
    private Long fromAmount;
    private Long toAmount;
    private String currency;
    private Instant occurredAt;
}
