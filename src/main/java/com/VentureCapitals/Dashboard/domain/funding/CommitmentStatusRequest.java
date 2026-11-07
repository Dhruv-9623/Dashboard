package com.VentureCapitals.Dashboard.domain.funding;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Moving an existing commitment along the ladder. */
@Data
public class CommitmentStatusRequest {

    @NotNull(message = "Status is required")
    private CommitmentStatus status;
}
