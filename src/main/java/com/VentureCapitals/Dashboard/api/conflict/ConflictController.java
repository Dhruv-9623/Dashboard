package com.VentureCapitals.Dashboard.api.conflict;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.domain.conflict.ConflictReport;
import com.VentureCapitals.Dashboard.domain.conflict.ConflictService;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Conflict Sentinel: collision checks between an opportunity and the portfolio. */
@RestController
@PreAuthorize("hasRole('VC')")
public class ConflictController {
    private final ConflictService conflictService;

    public ConflictController(ConflictService conflictService) {
        this.conflictService = conflictService;
    }

    @PostMapping("/api/opportunities/{id}/conflict-check")
    public ResponseEntity<ApiResponse<ConflictReportDTO>> run(@CurrentUser User user, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(toDTO(conflictService.run(user, id))));
    }

    /** The current report, or null data if the check hasn't been run. */
    @GetMapping("/api/opportunities/{id}/conflict-report")
    public ResponseEntity<ApiResponse<ConflictReportDTO>> forOpportunity(@CurrentUser User user, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(conflictService.forOpportunity(user, id)
                .map(ConflictController::toDTO).orElse(null)));
    }

    @GetMapping("/api/conflict-reports")
    public ResponseEntity<ApiResponse<List<ConflictReportDTO>>> list(@CurrentUser User user) {
        return ResponseEntity.ok(ApiResponse.ok(conflictService.list(user).stream().map(ConflictController::toDTO).toList()));
    }

    static ConflictReportDTO toDTO(ConflictReport report) {
        return ConflictReportDTO.builder()
                .id(report.getId())
                .opportunityId(report.getOpportunity().getId())
                .opportunityName(report.getOpportunity().getCompanyName())
                .overallConfidence(report.getOverallConfidence().doubleValue())
                .dimensions(report.getDimensions().stream().map(d -> ConflictReportDTO.DimensionDTO.builder()
                        .dimension(d.getDimension())
                        .confidence(d.getConfidence().doubleValue())
                        .summary(d.getSummary())
                        .matches(d.getMatches().stream().map(m -> ConflictReportDTO.MatchDTO.builder()
                                .portfolioCompanyId(m.getPortfolioCompanyId())
                                .portfolioCompanyName(m.getPortfolioCompanyName())
                                .note(m.getNote()).build()).toList())
                        .build()).toList())
                .comparedCompanyCount(report.getComparedCompanyCount())
                .generatedAt(report.getGeneratedAt())
                .build();
    }
}
