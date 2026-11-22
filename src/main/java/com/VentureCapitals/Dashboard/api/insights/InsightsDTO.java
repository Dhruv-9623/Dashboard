package com.VentureCapitals.Dashboard.api.insights;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InsightsDTO {
    private long profileViews;
    private long connectionRequestsReceived;
    private long connectionRequestsAccepted;
    private long activeConversations;
    private long wishlistedByCount;
    private long totalAmount;
    private String currency;
    private long entityCount;
    private List<FunnelStageDTO> funnel;
    private List<SectorBreakdownDTO> sectorBreakdown;
    private Instant generatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FunnelStageDTO {
        private String label;
        private long count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SectorBreakdownDTO {
        private String sector;
        private long count;
        private long amount;
    }
}
