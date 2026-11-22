package com.VentureCapitals.Dashboard.domain.insights;

import java.time.Instant;
import java.util.List;

/**
 * Derived analytics (CLAUDE.md §10): computed from existing tables each time, never stored.
 *
 * <p>The two sides of the platform share a shape so one screen can draw both, but the amounts mean
 * different things: for an investor, capital at work and the companies it is in; for a founder,
 * money committed and the investors behind it.
 */
public record Insights(long profileViews, long connectionRequestsReceived, long connectionRequestsAccepted,
                       long activeConversations, long wishlistedByCount, long totalAmount, String currency,
                       long entityCount, List<FunnelStage> funnel, List<SectorSlice> sectorBreakdown,
                       Instant generatedAt) {

    public record FunnelStage(String label, long count) {
    }

    public record SectorSlice(String sector, long count, long amount) {
    }
}
