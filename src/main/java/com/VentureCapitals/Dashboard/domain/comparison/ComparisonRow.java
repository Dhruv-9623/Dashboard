package com.VentureCapitals.Dashboard.domain.comparison;

import com.VentureCapitals.Dashboard.domain.startup.Startup;

/**
 * One startup in a side-by-side.
 *
 * @param totalRaised signed money on the open round, or null when there is none — see
 *                    {@link ComparisonService} for why that and not lifetime totals
 */
public record ComparisonRow(Startup startup, boolean raising, Long totalRaised, String currency,
                            String openRound, long investorCount) {
}
