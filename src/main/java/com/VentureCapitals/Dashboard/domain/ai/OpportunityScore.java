package com.VentureCapitals.Dashboard.domain.ai;

import com.VentureCapitals.Dashboard.domain.opportunity.RecommendedAction;

import java.util.List;

/**
 * @param fitScore 0–100, or null when there is no thesis to score against — a missing number is
 *                 honest, a made-up one is not
 */
public record OpportunityScore(Integer fitScore, String rationale, List<Citation> citations,
                               RecommendedAction action) {

    /** One claim behind the score, tied to the thesis field it came from. */
    public record Citation(String claim, String thesisField, boolean supporting) {
    }
}
