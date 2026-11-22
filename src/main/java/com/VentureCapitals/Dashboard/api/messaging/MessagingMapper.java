package com.VentureCapitals.Dashboard.api.messaging;

import com.VentureCapitals.Dashboard.domain.messaging.ConnectionRequest;
import com.VentureCapitals.Dashboard.domain.messaging.Counterparty;
import com.VentureCapitals.Dashboard.domain.messaging.ConversationView;
import com.VentureCapitals.Dashboard.domain.messaging.CounterpartyResolver;
import com.VentureCapitals.Dashboard.domain.messaging.Message;
import com.VentureCapitals.Dashboard.domain.user.User;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class MessagingMapper {
    private static final int PREVIEW_LENGTH = 120;

    private final CounterpartyResolver resolver;

    public MessagingMapper(CounterpartyResolver resolver) {
        this.resolver = resolver;
    }

    /** A list of requests, naming everyone in it with one lookup per side rather than one per row. */
    public List<ConnectionRequestDTO> toRequestDTOs(Collection<ConnectionRequest> requests) {
        List<User> people = requests.stream().flatMap(r -> java.util.stream.Stream.of(r.getFromUser(), r.getToUser())).toList();
        Map<UUID, Counterparty> named = resolver.resolve(people);
        return requests.stream().map(r -> toDTO(r, named)).toList();
    }

    public ConnectionRequestDTO toDTO(ConnectionRequest request) {
        return toRequestDTOs(List.of(request)).get(0);
    }

    private ConnectionRequestDTO toDTO(ConnectionRequest request, Map<UUID, Counterparty> named) {
        return ConnectionRequestDTO.builder()
                .id(request.getId())
                .from(toDTO(named.get(request.getFromUser().getId())))
                .to(toDTO(named.get(request.getToUser().getId())))
                .status(request.getStatus())
                .message(request.getMessage())
                .requestedAt(request.getRequestedAt())
                .respondedAt(request.getRespondedAt())
                .build();
    }

    public ConversationDTO toDTO(ConversationView view) {
        Message last = view.lastMessage();
        return ConversationDTO.builder()
                .id(view.conversation().getId())
                .counterparty(toDTO(view.counterparty()))
                .lastMessagePreview(last == null ? null : preview(last.getBody()))
                .lastMessageAt(last == null ? null : last.getSentAt())
                .unreadCount(view.unreadCount())
                .createdAt(view.conversation().getCreatedAt())
                .build();
    }

    public MessageDTO toDTO(Message message) {
        return MessageDTO.builder()
                .id(message.getId())
                .conversationId(message.getConversation().getId())
                .senderUserId(message.getSender().getId())
                .senderEmail(message.getSender().getEmail())
                .body(message.getBody())
                .sentAt(message.getSentAt())
                .readAt(message.getReadAt())
                .build();
    }

    public CounterpartyDTO toDTO(Counterparty c) {
        if (c == null) return null;
        return CounterpartyDTO.builder()
                .userId(c.userId())
                .email(c.email())
                .displayName(c.displayName())
                .entityType(c.entityType())
                .entityId(c.entityId())
                .entityName(c.entityName())
                .logoUrl(c.logoUrl())
                .build();
    }

    private static String preview(String body) {
        String flat = body.replaceAll("\\s+", " ").trim();
        return flat.length() <= PREVIEW_LENGTH ? flat : flat.substring(0, PREVIEW_LENGTH - 1) + "…";
    }
}
