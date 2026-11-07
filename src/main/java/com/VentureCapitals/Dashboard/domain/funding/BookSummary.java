package com.VentureCapitals.Dashboard.domain.funding;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * What one firm has promised and not yet deployed, across every round.
 *
 * <p>The counterpart to {@code InvestmentSummary}: that one reports capital that has left the
 * building, this one reports capital that has been pledged and hasn't. The two are kept apart
 * because adding a soft commitment to deployed capital produces an "assets" figure that is partly
 * conversation.
 *
 * <p>Computed in the database so the figures describe the whole book rather than whichever page of
 * rows is on screen. Amounts are per currency: a fund that has pledged in INR and USD has two
 * exposures, and summing them would invent a third.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookSummary {
    /** Signed money, per currency — the figure a fund can report as allocated. */
    private Map<String, Long> committedByCurrency;
    /** Committed plus soft, per currency. Indications deliberately excluded. */
    private Map<String, Long> likelyByCurrency;
    /** Pledges still standing: withdrawals and already-recorded cheques both excluded. */
    private long liveCount;
    /** Committed pledges on rounds that have closed, waiting to be recorded as investments. */
    private long readyToRecordCount;

    public static final BookSummary EMPTY =
            new BookSummary(Map.of(), Map.of(), 0L, 0L);
}
