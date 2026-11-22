package com.VentureCapitals.Dashboard.api.suggestion;

import com.VentureCapitals.Dashboard.domain.suggestion.SuggestionStatus;
import com.VentureCapitals.Dashboard.domain.suggestion.SuggestionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AISuggestionDTO {
    private UUID id;
    private SuggestionType suggestionType;
    private UUID targetId;
    private String targetName;
    private String targetSector;
    private String targetStage;
    private String targetLogoUrl;
    private double score;
    private String reasoning;
    private SuggestionStatus status;
    private Instant generatedAt;
}
