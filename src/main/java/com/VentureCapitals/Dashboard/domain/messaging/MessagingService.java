package com.VentureCapitals.Dashboard.domain.messaging;

import com.VentureCapitals.Dashboard.common.TargetType;
import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;
import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.common.exception.ValidationException;
import com.VentureCapitals.Dashboard.domain.startup.StartupMember;
import com.VentureCapitals.Dashboard.domain.startup.StartupMemberRepository;
import com.VentureCapitals.Dashboard.domain.startup.StartupRole;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCRole;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Mutual-consent messaging (Business Rule 1): a request has to be accepted before anyone can talk.
 *
 * <p>Three things hold the rule in place, deliberately redundantly. The schema allows a
 * conversation only as the child of a request. This service creates one only when a request is
 * accepted, and only the recipient can accept. And sending re-checks that the request behind the
 * conversation is still ACCEPTED, so a future way of ending a connection cannot leave a live chat.
 */
@Slf4j
@Service
@Transactional
public class MessagingService {
    private final ConnectionRequestRepository requests;
    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final VCMemberRepository vcMembers;
    private final StartupMemberRepository startupMembers;
    private final CounterpartyResolver counterparties;

    public MessagingService(ConnectionRequestRepository requests, ConversationRepository conversations,
                            MessageRepository messages, VCMemberRepository vcMembers,
                            StartupMemberRepository startupMembers, CounterpartyResolver counterparties) {
        this.requests = requests;
        this.conversations = conversations;
        this.messages = messages;
        this.vcMembers = vcMembers;
        this.startupMembers = startupMembers;
        this.counterparties = counterparties;
    }

    // --- Requests ---------------------------------------------------------------------------

    public ConnectionRequest request(User sender, CreateConnectionRequest body) {
        // Investors approach startups and founders approach investors. The two sides of this
        // product are different markets; a firm "connecting" to another firm is not what it is for.
        TargetType expected = sender.getUserType() == UserType.VC ? TargetType.STARTUP : TargetType.VC_FIRM;
        if (body.getTargetType() != expected) {
            throw new ValidationException(sender.getUserType() == UserType.VC
                    ? "Investors send connection requests to startups."
                    : "Founders send connection requests to investors.");
        }

        User recipient = recipientFor(body.getTargetType(), body.getTargetId());
        if (recipient.getId().equals(sender.getId())) {
            throw new ValidationException("That's your own organisation.");
        }

        Map<UUID, Counterparty> both = counterparties.resolve(List.of(sender, recipient));
        UUID senderOrg = both.get(sender.getId()).entityId();
        if (senderOrg != null && senderOrg.equals(both.get(recipient.getId()).entityId())) {
            throw new ValidationException("That's your own organisation.");
        }

        // The connection is between organisations, not between the two people who happened to click.
        UUID recipientOrg = both.get(recipient.getId()).entityId();
        if (senderOrg != null && recipientOrg != null) {
            Set<UUID> senderSide = peopleAt(expected == TargetType.STARTUP ? TargetType.VC_FIRM : TargetType.STARTUP, senderOrg);
            Set<UUID> recipientSide = peopleAt(body.getTargetType(), recipientOrg);
            List<ConnectionRequest> between = requests.findLiveBetween(senderSide, recipientSide);
            if (!between.isEmpty()) {
                boolean connected = between.stream().anyMatch(r -> r.getStatus() == ConnectionStatus.ACCEPTED);
                String name = displayName(both.get(recipient.getId()));
                throw new BusinessRuleViolationException(connected
                        ? "You're already connected with " + name + " — open Messages to continue the conversation."
                        : "A request between you and " + name + " is already waiting for a reply.");
            }
        }

        requests.findLive(sender.getId(), recipient.getId()).ifPresent(existing -> {
            throw new BusinessRuleViolationException(existing.getStatus() == ConnectionStatus.ACCEPTED
                    ? "You're already connected — open Messages to continue the conversation."
                    : "You've already sent a request to " + displayName(both.get(recipient.getId())) + ". Waiting for a reply.");
        });
        requests.findLive(recipient.getId(), sender.getId()).ifPresent(existing -> {
            throw new BusinessRuleViolationException(existing.getStatus() == ConnectionStatus.ACCEPTED
                    ? "You're already connected — open Messages to continue the conversation."
                    : displayName(both.get(recipient.getId())) + " has already asked to connect with you. Check your requests.");
        });

        ConnectionRequest saved = requests.save(ConnectionRequest.builder()
                .fromUser(sender)
                .toUser(recipient)
                .status(ConnectionStatus.PENDING)
                .message(body.getMessage() == null || body.getMessage().isBlank() ? null : body.getMessage().trim())
                .requestedAt(Instant.now())
                .build());
        log.info("Connection requested: requestId={}, from={}", saved.getId(), sender.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<ConnectionRequest> list(User user, boolean incoming) {
        return incoming
                ? requests.findByToUserIdOrderByRequestedAtDesc(user.getId())
                : requests.findByFromUserIdOrderByRequestedAtDesc(user.getId());
    }

    /**
     * Accepts or declines a request. Only the person it was sent to may answer, and only once.
     * Accepting is the moment a conversation comes into being.
     */
    public ConnectionRequest respond(User responder, UUID requestId, ConnectionStatus decision) {
        if (decision != ConnectionStatus.ACCEPTED && decision != ConnectionStatus.REJECTED) {
            throw new ValidationException("A request can be accepted or declined.");
        }
        ConnectionRequest request = requests.findWithUsersById(requestId)
                .orElseThrow(() -> new EntityNotFoundException("That request no longer exists."));

        if (!request.getToUser().getId().equals(responder.getId())) {
            // The sender watching their own request is not the person who decides it.
            throw request.getFromUser().getId().equals(responder.getId())
                    ? new UnauthorizedException("Only the person you asked can answer this request.")
                    : new EntityNotFoundException("That request no longer exists.");
        }
        if (request.getStatus() != ConnectionStatus.PENDING) {
            throw new BusinessRuleViolationException("This request has already been answered.");
        }

        request.setStatus(decision);
        request.setRespondedAt(Instant.now());
        ConnectionRequest saved = requests.save(request);

        if (decision == ConnectionStatus.ACCEPTED) {
            conversations.save(Conversation.builder().connectionRequest(saved).build());
            log.info("Connection accepted, conversation opened: requestId={}", requestId);
        }
        return saved;
    }

    // --- Conversations ----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<ConversationView> conversations(User user) {
        List<Conversation> mine = conversations.findForUser(user.getId());
        if (mine.isEmpty()) return List.of();

        List<UUID> ids = mine.stream().map(Conversation::getId).toList();
        Map<UUID, Message> latest = new HashMap<>();
        messages.findLatestIn(ids).forEach(message -> latest.merge(message.getConversation().getId(), message,
                (a, b) -> a.getSentAt().isAfter(b.getSentAt()) ? a : b));
        Map<UUID, Long> unread = new HashMap<>();
        messages.countUnread(ids, user.getId()).forEach(row -> unread.put(row.getConversationId(), row.getUnread()));

        List<User> others = mine.stream().map(c -> otherParticipant(c, user)).toList();
        Map<UUID, Counterparty> resolved = counterparties.resolve(others);

        return mine.stream()
                .map(c -> new ConversationView(c, resolved.get(otherParticipant(c, user).getId()),
                        latest.get(c.getId()), unread.getOrDefault(c.getId(), 0L)))
                // Newest activity first; a conversation nobody has written in yet sorts by when it opened.
                .sorted(Comparator.comparing((ConversationView v) ->
                        v.lastMessage() != null ? v.lastMessage().getSentAt() : v.conversation().getCreatedAt()).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Message> messages(User user, UUID conversationId) {
        requireParticipant(user, conversationId);
        return messages.findByConversationIdOrderBySentAtAsc(conversationId);
    }

    public Message send(User sender, UUID conversationId, String body) {
        Conversation conversation = requireParticipant(sender, conversationId);
        if (conversation.getConnectionRequest().getStatus() != ConnectionStatus.ACCEPTED) {
            throw new BusinessRuleViolationException("You can only message people who have accepted your request.");
        }
        String text = body == null ? "" : body.trim();
        if (text.isEmpty()) throw new ValidationException("Write a message first.");

        Message saved = messages.save(Message.builder()
                .conversation(conversation)
                .sender(sender)
                .body(text)
                .sentAt(Instant.now())
                .build());
        log.debug("Message sent: conversationId={}", conversationId);
        return saved;
    }

    /** Marks what the other person wrote as read. Your own messages are untouched. */
    public void markRead(User reader, UUID conversationId) {
        requireParticipant(reader, conversationId);
        messages.markRead(conversationId, reader.getId(), Instant.now());
    }

    public Counterparty counterpartyIn(User viewer, Conversation conversation) {
        return counterparties.resolve(otherParticipant(conversation, viewer));
    }

    // --- helpers ----------------------------------------------------------------------------

    /**
     * The conversation, if {@code user} is one of its two people. Anyone else is told it doesn't
     * exist rather than that it isn't theirs, so ids can't be probed to find out which are real.
     */
    private Conversation requireParticipant(User user, UUID conversationId) {
        Conversation conversation = conversations.findWithParticipantsById(conversationId)
                .orElseThrow(() -> new EntityNotFoundException("That conversation no longer exists."));
        if (!conversation.getConnectionRequest().involves(user.getId())) {
            throw new EntityNotFoundException("That conversation no longer exists.");
        }
        return conversation;
    }

    private static User otherParticipant(Conversation conversation, User me) {
        ConnectionRequest request = conversation.getConnectionRequest();
        return request.getFromUser().getId().equals(me.getId()) ? request.getToUser() : request.getFromUser();
    }

    /** Everyone who speaks for an organisation. */
    private Set<UUID> peopleAt(TargetType type, UUID organisationId) {
        return switch (type) {
            case VC_FIRM -> vcMembers.findByFirmId(organisationId).stream()
                    .map(m -> m.getUser().getId()).collect(Collectors.toSet());
            case STARTUP -> startupMembers.findByStartupIdOrderByJoinedAtAsc(organisationId).stream()
                    .map(m -> m.getUser().getId()).collect(Collectors.toSet());
        };
    }

    private User recipientFor(TargetType type, UUID targetId) {
        return switch (type) {
            case VC_FIRM -> vcMembers.findFirstByFirmIdAndRole(targetId, VCRole.OWNER)
                    .map(VCMember::getUser)
                    .orElseThrow(() -> new EntityNotFoundException("That firm isn't taking requests yet."));
            case STARTUP -> {
                List<StartupMember> team = startupMembers.findByStartupIdOrderByJoinedAtAsc(targetId);
                // A founder if there is one; otherwise whoever joined first.
                yield team.stream().filter(member -> member.getRole() == StartupRole.FOUNDER).findFirst()
                        .or(() -> team.stream().findFirst())
                        .map(StartupMember::getUser)
                        .orElseThrow(() -> new EntityNotFoundException("That startup isn't taking requests yet."));
            }
        };
    }

    private static String displayName(Counterparty counterparty) {
        return counterparty.entityName() != null ? counterparty.entityName() : counterparty.displayName();
    }
}
