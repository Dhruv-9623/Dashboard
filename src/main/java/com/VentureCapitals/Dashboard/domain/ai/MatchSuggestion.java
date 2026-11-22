package com.VentureCapitals.Dashboard.domain.ai;

import java.util.UUID;

/** @param score 0–1 */
public record MatchSuggestion(UUID candidateId, double score, String reasoning) {
}
