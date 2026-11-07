package com.VentureCapitals.Dashboard.domain.funding;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.Data;

/** A firm stating what it will put in. */
@Data
public class CommitmentRequest {

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be more than zero")
    private Long amount;

    @NotNull(message = "Currency is required")
    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a three-letter ISO code, such as INR")
    private String currency;

    @NotNull(message = "Status is required")
    private CommitmentStatus status;
}
