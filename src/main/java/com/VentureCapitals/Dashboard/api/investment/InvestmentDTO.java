package com.VentureCapitals.Dashboard.api.investment;

import com.VentureCapitals.Dashboard.domain.investment.InvestmentRound;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvestmentDTO {
    private UUID id;
    private UUID vcFirmId;
    private UUID startupId;
    private String startupName;
    private String startupSector;
    private String startupLogoUrl;
    private LocalDate investmentDate;
    private Long amount;
    private String currency;
    private InvestmentRound round;
    private BigDecimal equityPercentage;
    private InvestmentStatus status;
    private String notes;
    private Instant createdAt;
    private Instant updatedAt;
}
