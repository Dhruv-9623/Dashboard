package com.VentureCapitals.Dashboard.api.suggestion;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.domain.suggestion.SuggestionService;
import com.VentureCapitals.Dashboard.domain.suggestion.SuggestionView;
import com.VentureCapitals.Dashboard.domain.suggestion.UpdateSuggestionRequest;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Suggested introductions for the signed-in person. */
@RestController
@RequestMapping("/api/ai/suggestions")
public class AISuggestionController {
    private final SuggestionService suggestionService;

    public AISuggestionController(SuggestionService suggestionService) {
        this.suggestionService = suggestionService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AISuggestionDTO>>> list(@CurrentUser User user) {
        return ResponseEntity.ok(ApiResponse.ok(
                suggestionService.list(user).stream().map(AISuggestionController::toDTO).toList()));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<AISuggestionDTO>> setStatus(
            @CurrentUser User user,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateSuggestionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(toDTO(suggestionService.setStatus(user, id, request.getStatus()))));
    }

    @PostMapping("/regenerate")
    public ResponseEntity<ApiResponse<Void>> regenerate(@CurrentUser User user) {
        suggestionService.regenerate(user);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    static AISuggestionDTO toDTO(SuggestionView view) {
        var s = view.suggestion();
        return AISuggestionDTO.builder()
                .id(s.getId())
                .suggestionType(s.getSuggestionType())
                .targetId(s.getTargetId())
                .targetName(view.name())
                .targetSector(view.sector())
                .targetStage(view.stage())
                .targetLogoUrl(view.logoUrl())
                .score(s.getScore().doubleValue())
                .reasoning(s.getReasoning())
                .status(s.getStatus())
                .generatedAt(s.getGeneratedAt())
                .build();
    }
}
