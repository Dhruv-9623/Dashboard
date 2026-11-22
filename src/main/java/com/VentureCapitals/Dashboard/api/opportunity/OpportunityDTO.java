package com.VentureCapitals.Dashboard.api.opportunity;

import com.VentureCapitals.Dashboard.domain.opportunity.OpportunityStatus;
import com.VentureCapitals.Dashboard.domain.opportunity.RecommendedAction;
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
public class OpportunityDTO {
    private UUID id;
    private UUID firmId;
    private String companyName;
    private String website;
    private String sector;
    private String stage;
    private Long askAmount;
    private String currency;
    private String description;
    private String contactEmail;
    private Integer fitScore;
    private String rationale;
    private List<CitationDTO> citations;
    private RecommendedAction recommendedAction;
    private OpportunityStatus status;
    private String decisionNote;
    private Instant scoredAt;
    private Instant createdAt;
    private Instant updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CitationDTO {
        private String claim;
        private String thesisField;
        private boolean supporting;
    }
}
