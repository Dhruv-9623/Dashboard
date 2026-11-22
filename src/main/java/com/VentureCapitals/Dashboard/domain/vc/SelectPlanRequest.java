package com.VentureCapitals.Dashboard.domain.vc;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SelectPlanRequest {
    @NotNull(message = "Choose a plan")
    private PlanTier planTier;
}
