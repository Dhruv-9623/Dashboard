package com.VentureCapitals.Dashboard.api.vc;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.VentureCapitals.Dashboard.domain.vc.PlanTier;
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
public class VCFirmDTO {
    private UUID id;
    private String name;
    private String description;
    private String website;
    private Long aum;
    private String investmentStage;
    private List<String> sectors;
    private String location;
    private Integer foundedYear;
    /**
     * The next two are the firm's own business, so they are left out of the response altogether
     * for anyone who isn't a member — absent rather than null, which a client could mistake for
     * "this firm has no thesis".
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private PlanTier planTier;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private ThesisDTO thesis;
    private Instant createdAt;
    private Instant updatedAt;
}
