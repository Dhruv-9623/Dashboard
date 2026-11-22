package com.VentureCapitals.Dashboard.domain.messaging;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    @EntityGraph(attributePaths = {"sender"}, type = EntityGraph.EntityGraphType.LOAD)
    List<Message> findByConversationIdOrderBySentAtAsc(UUID conversationId);

    /** The newest message of each conversation, for the preview line — one query for the whole list. */
    @Query("""
            select m from Message m
             where m.conversation.id in :ids
               and m.sentAt = (select max(m2.sentAt) from Message m2 where m2.conversation.id = m.conversation.id)
            """)
    List<Message> findLatestIn(@Param("ids") Collection<UUID> conversationIds);

    @Query("""
            select m.conversation.id as conversationId, count(m) as unread from Message m
             where m.conversation.id in :ids and m.sender.id <> :me and m.readAt is null
             group by m.conversation.id
            """)
    List<UnreadCount> countUnread(@Param("ids") Collection<UUID> conversationIds, @Param("me") UUID me);

    /** Marks what the other person sent as read. Never touches the reader's own messages. */
    @Modifying
    @Query("""
            update Message m set m.readAt = :now
             where m.conversation.id = :conversation and m.sender.id <> :me and m.readAt is null
            """)
    int markRead(@Param("conversation") UUID conversationId, @Param("me") UUID me, @Param("now") Instant now);

    interface UnreadCount {
        UUID getConversationId();

        Long getUnread();
    }
}
