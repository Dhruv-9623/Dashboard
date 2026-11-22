package com.VentureCapitals.Dashboard.domain.suggestion;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSuggestionRequest {
    @NotNull(message = "Choose a status")
    private SuggestionStatus status;
}
