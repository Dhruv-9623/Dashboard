package com.VentureCapitals.Dashboard.domain.suggestion;

/** A suggestion with the facts about who it points at. */
public record SuggestionView(AISuggestion suggestion, String name, String sector, String stage, String logoUrl) {
}
