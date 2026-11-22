package com.VentureCapitals.Dashboard.api.signals;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.domain.signals.Signal;
import com.VentureCapitals.Dashboard.domain.signals.SignalService;
import com.VentureCapitals.Dashboard.domain.signals.SignalType;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** News and events relevant to the signed-in person. */
@RestController
@RequestMapping("/api/signals")
public class SignalController {
    private final SignalService signalService;

    public SignalController(SignalService signalService) {
        this.signalService = signalService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SignalDTO>>> list(
            @CurrentUser User user,
            @RequestParam(name = "type", required = false) SignalType type) {
        return ResponseEntity.ok(ApiResponse.ok(
                signalService.list(user, type).stream().map(SignalController::toDTO).toList()));
    }

    static SignalDTO toDTO(Signal signal) {
        return SignalDTO.builder()
                .id(signal.getId())
                .relatedStartupId(signal.getRelatedStartup() == null ? null : signal.getRelatedStartup().getId())
                .relatedStartupName(signal.getRelatedStartup() == null ? null : signal.getRelatedStartup().getName())
                .relatedVCFirmId(signal.getRelatedVcFirm() == null ? null : signal.getRelatedVcFirm().getId())
                .relatedVCFirmName(signal.getRelatedVcFirm() == null ? null : signal.getRelatedVcFirm().getName())
                .sourceUrl(signal.getSourceUrl())
                .headline(signal.getHeadline())
                .summary(signal.getSummary())
                .signalType(signal.getSignalType())
                .sentiment(signal.getSentiment())
                .publishedAt(signal.getPublishedAt())
                .aiGenerated(signal.isAiGenerated())
                .build();
    }
}
