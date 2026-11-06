package com.VentureCapitals.Dashboard.domain.funding;

/** Where a round is in its life. Only an OPEN round accepts commitments. */
public enum FundingCycleStatus {
    OPEN,
    PAUSED,
    CLOSED
}
