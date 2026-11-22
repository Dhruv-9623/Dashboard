package com.VentureCapitals.Dashboard.domain.ai;

import java.util.Set;
import java.util.UUID;

/**
 * Someone who could be introduced. {@code live} is true for a startup with a round open — the
 * difference between a good fit and a good fit who can act on it now.
 */
public record MatchCandidate(UUID id, String name, Set<String> sectors, Set<String> stages,
                             Long rangeMin, Long rangeMax, boolean live) {
}
