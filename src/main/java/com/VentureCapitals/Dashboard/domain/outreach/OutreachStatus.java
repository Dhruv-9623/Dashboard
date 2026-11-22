package com.VentureCapitals.Dashboard.domain.outreach;

/** Where a piece of outreach stands. Only SENT is set today; the rest need the founder's side. */
public enum OutreachStatus {
    SENT,
    SEEN,
    RESPONDED,
    IGNORED
}
