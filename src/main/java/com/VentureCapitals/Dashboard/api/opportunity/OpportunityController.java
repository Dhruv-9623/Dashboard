package com.VentureCapitals.Dashboard.api.opportunity;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.domain.opportunity.CreateOpportunityRequest;
import com.VentureCapitals.Dashboard.domain.opportunity.DecideOpportunityRequest;
import com.VentureCapitals.Dashboard.domain.opportunity.Opportunity;
import com.VentureCapitals.Dashboard.domain.opportunity.OpportunityService;
import com.VentureCapitals.Dashboard.domain.opportunity.OpportunityStatus;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Deal triage for the signed-in firm. */
@RestController
@RequestMapping("/api/opportunities")
@PreAuthorize("hasRole('VC')")
public class OpportunityController {
    private final OpportunityService opportunityService;

    public OpportunityController(OpportunityService opportunityService) {
        this.opportunityService = opportunityService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<OpportunityDTO>>> list(
            @CurrentUser User user,
            @RequestParam(required = false) OpportunityStatus status) {
        return ResponseEntity.ok(ApiResponse.ok(
                opportunityService.list(user, status).stream().map(OpportunityController::toDTO).toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OpportunityDTO>> get(@CurrentUser User user, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(toDTO(opportunityService.get(user, id))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OpportunityDTO>> create(
            @CurrentUser User user,
            @Valid @RequestBody CreateOpportunityRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(toDTO(opportunityService.create(user, request))));
    }

    /** Record the firm's decision. OWNER or PORTFOLIO_MANAGER only. */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OpportunityDTO>> decide(
            @CurrentUser User user,
            @PathVariable UUID id,
            @Valid @RequestBody DecideOpportunityRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(toDTO(opportunityService.decide(user, id, request))));
    }

    @PostMapping("/{id}/rescore")
    public ResponseEntity<ApiResponse<OpportunityDTO>> rescore(@CurrentUser User user, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(toDTO(opportunityService.rescore(user, id))));
    }

    static OpportunityDTO toDTO(Opportunity o) {
        return OpportunityDTO.builder()
                .id(o.getId())
                .firmId(o.getVcFirm().getId())
                .companyName(o.getCompanyName())
                .website(o.getWebsite())
                .sector(o.getSector())
                .stage(o.getStage())
                .askAmount(o.getAskAmount())
                .currency(o.getCurrency())
                .description(o.getDescription())
                .contactEmail(o.getContactEmail())
                .fitScore(o.getFitScore())
                .rationale(o.getRationale())
                .citations(o.getCitations().stream().map(c -> OpportunityDTO.CitationDTO.builder()
                        .claim(c.getClaim()).thesisField(c.getThesisField()).supporting(c.isSupporting()).build()).toList())
                .recommendedAction(o.getRecommendedAction())
                .status(o.getStatus())
                .decisionNote(o.getDecisionNote())
                .scoredAt(o.getScoredAt())
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .build();
    }
}
