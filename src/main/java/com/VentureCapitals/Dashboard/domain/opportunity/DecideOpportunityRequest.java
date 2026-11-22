package com.VentureCapitals.Dashboard.domain.opportunity;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DecideOpportunityRequest {
    @NotNull(message = "Choose a decision")
    private OpportunityStatus status;

    @Size(max = 5000, message = "The note must be at most 5000 characters")
    private String decisionNote;
}
