package com.VentureCapitals.Dashboard.domain.ai;

import com.VentureCapitals.Dashboard.domain.suggestion.SuggestionType;

import java.util.Set;

/**
 * Who the matches are for. For an investor: the sectors and stages it invests in and its cheque
 * range. For a founder: the company's own sector and stage, and the ticket band of the round it is
 * raising, if there is one.
 */
public record MatchSubject(SuggestionType type, Set<String> sectors, Set<String> stages,
                           Long rangeMin, Long rangeMax) {
}
