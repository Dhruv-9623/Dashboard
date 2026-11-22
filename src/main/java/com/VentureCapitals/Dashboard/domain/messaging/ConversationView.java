package com.VentureCapitals.Dashboard.domain.messaging;

/** A conversation as one participant sees it: who the other person is, and what was said last. */
public record ConversationView(Conversation conversation, Counterparty counterparty,
                               Message lastMessage, long unreadCount) {
}
