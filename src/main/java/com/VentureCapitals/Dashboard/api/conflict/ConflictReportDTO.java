package com.VentureCapitals.Dashboard.api.conflict;

import com.VentureCapitals.Dashboard.domain.conflict.ConflictDimensionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConflictReportDTO {
    private UUID id;
    private UUID opportunityId;
    private String opportunityName;
    private double overallConfidence;
    private List<DimensionDTO> dimensions;
    private int comparedCompanyCount;
    private Instant generatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DimensionDTO {
        private ConflictDimensionType dimension;
        private double confidence;
        private String summary;
        private List<MatchDTO> matches;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MatchDTO {
        private UUID portfolioCompanyId;
        private String portfolioCompanyName;
        private String note;
    }
}
