package com.VentureCapitals.Dashboard.domain.funding;

import java.util.EnumMap;
import java.util.Map;

/**
 * What a round has raised, split by how firm each band is.
 *
 * <p>Deliberately not one "committed" number. Summing a conversation (INDICATED) together with
 * money a founder can plan around (COMMITTED) produces a headline figure that overstates the
 * round, which is the single easiest way for this screen to mislead the person reading it.
 */
public record CycleTotals(long committed, long softCommitted, long indicated, int commitmentCount) {

    public static final CycleTotals EMPTY = new CycleTotals(0, 0, 0, 0);

    public static CycleTotals from(Map<CommitmentStatus, Long> amounts, Map<CommitmentStatus, Long> counts) {
        Map<CommitmentStatus, Long> safe = new EnumMap<>(CommitmentStatus.class);
        safe.putAll(amounts);
        int total = counts.values().stream().mapToInt(Long::intValue).sum();
        return new CycleTotals(
                safe.getOrDefault(CommitmentStatus.COMMITTED, 0L),
                safe.getOrDefault(CommitmentStatus.SOFT_COMMITTED, 0L),
                safe.getOrDefault(CommitmentStatus.INDICATED, 0L),
                total);
    }

    /** Committed plus soft — what a founder could reasonably forecast. Excludes indications. */
    public long likely() {
        return committed + softCommitted;
    }
}
