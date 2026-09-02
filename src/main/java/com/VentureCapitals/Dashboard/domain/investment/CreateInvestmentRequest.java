package com.VentureCapitals.Dashboard.domain.investment;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateInvestmentRequest {
    @NotNull(message = "Startup ID is required")
    private UUID startupId;

    @NotNull(message = "Investment date is required")
    private LocalDate investmentDate;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private Long amount;

    @NotNull(message = "Currency is required")
    private String currency;

    @NotNull(message = "Round is required")
    private InvestmentRound round;

    private BigDecimal equityPercentage;

    private String notes;
}
