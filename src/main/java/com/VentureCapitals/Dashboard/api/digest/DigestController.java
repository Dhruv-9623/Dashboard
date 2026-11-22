package com.VentureCapitals.Dashboard.api.digest;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.domain.digest.Digest;
import com.VentureCapitals.Dashboard.domain.digest.DigestService;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Portfolio Pulse digests for the signed-in firm. */
@RestController
@RequestMapping("/api/digests")
@PreAuthorize("hasRole('VC')")
public class DigestController {
    private final DigestService digestService;

    public DigestController(DigestService digestService) {
        this.digestService = digestService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<DigestDTO>>> list(@CurrentUser User user) {
        return ResponseEntity.ok(ApiResponse.ok(digestService.list(user).stream().map(DigestController::toDTO).toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DigestDTO>> get(@CurrentUser User user, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(toDTO(digestService.get(user, id))));
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<DigestDTO>> generate(@CurrentUser User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(toDTO(digestService.generate(user))));
    }

    static DigestDTO toDTO(Digest digest) {
        return DigestDTO.builder()
                .id(digest.getId())
                .vcFirmId(digest.getVcFirm().getId())
                .periodStart(digest.getPeriodStart())
                .periodEnd(digest.getPeriodEnd())
                .sentAt(digest.getSentAt())
                .summaryMarkdown(digest.getSummaryMarkdown())
                .alerts(digest.getAlerts().stream().map(a -> DigestDTO.AlertDTO.builder()
                        .investmentId(a.getInvestmentId()).startupName(a.getStartupName())
                        .severity(a.getSeverity()).message(a.getMessage()).build()).toList())
                .companyCount(digest.getCompanyCount())
                .createdAt(digest.getCreatedAt())
                .build();
    }
}
