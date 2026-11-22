package com.VentureCapitals.Dashboard.api.messaging;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.domain.messaging.MessagingService;
import com.VentureCapitals.Dashboard.domain.messaging.SendMessageRequest;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Conversations the signed-in person is in — each of which exists because a request was accepted. */
@RestController
@RequestMapping("/api/conversations")
public class ConversationController {
    private final MessagingService messagingService;
    private final MessagingMapper mapper;

    public ConversationController(MessagingService messagingService, MessagingMapper mapper) {
        this.messagingService = messagingService;
        this.mapper = mapper;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ConversationDTO>>> list(@CurrentUser User user) {
        return ResponseEntity.ok(ApiResponse.ok(
                messagingService.conversations(user).stream().map(mapper::toDTO).toList()));
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<List<MessageDTO>>> messages(@CurrentUser User user, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(
                messagingService.messages(user, id).stream().map(mapper::toDTO).toList()));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<MessageDTO>> send(
            @CurrentUser User user,
            @PathVariable UUID id,
            @Valid @RequestBody SendMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(mapper.toDTO(messagingService.send(user, id, request.getBody()))));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(@CurrentUser User user, @PathVariable UUID id) {
        messagingService.markRead(user, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
