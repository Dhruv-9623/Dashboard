package com.VentureCapitals.Dashboard.domain.opportunity;

/**
 * Where an opportunity is in triage.
 *
 * <p>SCORING exists for the day scoring moves off the request thread: today scoring is instant and
 * an opportunity is born PENDING_REVIEW, but the screens already handle SCORING and poll while one
 * is in it, so a slower scorer needs no frontend change.
 */
public enum OpportunityStatus {
    SCORING,
    PENDING_REVIEW,
    APPROVED,
    REJECTED,
    NEEDS_MORE_INFO
}
