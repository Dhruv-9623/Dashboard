package com.VentureCapitals.Dashboard.domain.investment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateInvestmentRequest {
    private LocalDate investmentDate;
    private Long amount;
    private String currency;
    private InvestmentRound round;
    private BigDecimal equityPercentage;
    private String notes;
}
