package com.VentureCapitals.Dashboard.domain.investment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Firm-wide portfolio figures, computed in the database so they stay correct once the investment
 * list is paged. Amounts are totalled per currency — INR and USD are never added together.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvestmentSummary {
    private Map<String, Long> totalsByCurrency;
    private long totalCount;
    private long activeCount;
    private long exitedCount;
    private long writtenOffCount;
}
