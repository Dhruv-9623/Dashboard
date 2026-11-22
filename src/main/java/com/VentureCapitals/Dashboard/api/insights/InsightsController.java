package com.VentureCapitals.Dashboard.api.insights;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.domain.insights.Insights;
import com.VentureCapitals.Dashboard.domain.insights.InsightsService;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Engagement and funnel figures for whichever side the signed-in person is on. */
@RestController
@RequestMapping("/api/insights")
public class InsightsController {
    private final InsightsService insightsService;

    public InsightsController(InsightsService insightsService) {
        this.insightsService = insightsService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<InsightsDTO>> get(@CurrentUser User user) {
        return ResponseEntity.ok(ApiResponse.ok(toDTO(insightsService.forUser(user))));
    }

    private static InsightsDTO toDTO(Insights i) {
        return InsightsDTO.builder()
                .profileViews(i.profileViews())
                .connectionRequestsReceived(i.connectionRequestsReceived())
                .connectionRequestsAccepted(i.connectionRequestsAccepted())
                .activeConversations(i.activeConversations())
                .wishlistedByCount(i.wishlistedByCount())
                .totalAmount(i.totalAmount())
                .currency(i.currency())
                .entityCount(i.entityCount())
                .funnel(i.funnel().stream().map(f -> new InsightsDTO.FunnelStageDTO(f.label(), f.count())).toList())
                .sectorBreakdown(i.sectorBreakdown().stream()
                        .map(s -> new InsightsDTO.SectorBreakdownDTO(s.sector(), s.count(), s.amount())).toList())
                .generatedAt(i.generatedAt())
                .build();
    }
}
