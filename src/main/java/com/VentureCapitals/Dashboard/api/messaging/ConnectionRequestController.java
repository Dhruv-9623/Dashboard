package com.VentureCapitals.Dashboard.api.messaging;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.common.exception.ValidationException;
import com.VentureCapitals.Dashboard.domain.messaging.CreateConnectionRequest;
import com.VentureCapitals.Dashboard.domain.messaging.MessagingService;
import com.VentureCapitals.Dashboard.domain.messaging.RespondToConnectionRequest;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

/** Asking to talk, and answering (Business Rule 1). Open to both sides of the platform. */
@RestController
@RequestMapping("/api/connection-requests")
public class ConnectionRequestController {
    private final MessagingService messagingService;
    private final MessagingMapper mapper;

    public ConnectionRequestController(MessagingService messagingService, MessagingMapper mapper) {
        this.messagingService = messagingService;
        this.mapper = mapper;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ConnectionRequestDTO>>> list(
            @CurrentUser User user,
            @RequestParam(defaultValue = "incoming") String direction) {
        boolean incoming = switch (direction.toLowerCase()) {
            case "incoming" -> true;
            case "outgoing" -> false;
            default -> throw new ValidationException("direction must be incoming or outgoing");
        };
        return ResponseEntity.ok(ApiResponse.ok(mapper.toRequestDTOs(messagingService.list(user, incoming))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ConnectionRequestDTO>> request(
            @CurrentUser User user,
            @Valid @RequestBody CreateConnectionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(mapper.toDTO(messagingService.request(user, request))));
    }

    /** Accept or decline. Only the person the request was sent to may do either. */
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<ConnectionRequestDTO>> respond(
            @CurrentUser User user,
            @PathVariable UUID id,
            @Valid @RequestBody RespondToConnectionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                mapper.toDTO(messagingService.respond(user, id, request.getStatus()))));
    }
}
