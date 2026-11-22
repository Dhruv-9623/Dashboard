package com.VentureCapitals.Dashboard.api.outreach;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.domain.outreach.CreateOutreachRequest;
import com.VentureCapitals.Dashboard.domain.outreach.Outreach;
import com.VentureCapitals.Dashboard.domain.outreach.OutreachService;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** A firm's outbound introductions to startups ("my firm", from the session). */
@RestController
@RequestMapping("/api/outreach")
@PreAuthorize("hasRole('VC')")
public class OutreachController {
    private final OutreachService outreachService;

    public OutreachController(OutreachService outreachService) {
        this.outreachService = outreachService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<OutreachDTO>>> list(@CurrentUser User user) {
        return ResponseEntity.ok(ApiResponse.ok(
                outreachService.list(user).stream().map(OutreachController::toDTO).toList()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OutreachDTO>> send(
            @CurrentUser User user,
            @Valid @RequestBody CreateOutreachRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(toDTO(outreachService.send(user, request))));
    }

    private static OutreachDTO toDTO(Outreach item) {
        return OutreachDTO.builder()
                .id(item.getId())
                .fromFirmId(item.getFromFirm().getId())
                .fromFirmName(item.getFromFirm().getName())
                .toStartupId(item.getToStartup().getId())
                .toStartupName(item.getToStartup().getName())
                .subject(item.getSubject())
                .body(item.getBody())
                .status(item.getStatus())
                .sentAt(item.getSentAt())
                .build();
    }
}
