package com.VentureCapitals.Dashboard.domain.investment;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Body for both POST and PUT /api/investments (the frontend sends the same shape for create and edit). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvestmentRequest {
    @NotNull(message = "Choose the startup")
    private UUID startupId;

    @NotNull(message = "Investment date is required")
    @PastOrPresent(message = "Investment date can't be in the future")
    private LocalDate investmentDate;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private Long amount;

    @NotNull(message = "Currency is required")
    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a 3-letter ISO code, e.g. INR")
    private String currency;

    @NotNull(message = "Round is required")
    private InvestmentRound round;

    @DecimalMin(value = "0.00", message = "Equity can't be negative")
    @DecimalMax(value = "100.00", message = "Equity can't exceed 100%")
    @Digits(integer = 3, fraction = 2, message = "Equity allows at most 2 decimal places")
    private BigDecimal equityPercentage;

    /** Defaults to ACTIVE on create. */
    private InvestmentStatus status;

    @Size(max = 5000, message = "Notes must be at most 5000 characters")
    private String notes;
}
