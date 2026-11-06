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
    /** Active <em>positions</em> — one per cheque, so a follow-on counts twice. */
    private long activeCount;
    /**
     * Active <em>companies</em> — one per startup however many cheques went into it.
     *
     * <p>Reported alongside {@link #activeCount} rather than replacing it because they answer
     * different questions: "how many companies do we hold" and "how many positions do we carry".
     * The portfolio headline wants the first; it used to show the second.
     */
    private long activeCompanyCount;
    private long exitedCount;
    private long writtenOffCount;
}
