package com.VentureCapitals.Dashboard.domain.messaging;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    @Query("""
            select c from Conversation c
              join fetch c.connectionRequest r
              join fetch r.fromUser
              join fetch r.toUser
             where r.fromUser.id = :user or r.toUser.id = :user
            """)
    List<Conversation> findForUser(@Param("user") UUID userId);

    @Query("""
            select c from Conversation c
              join fetch c.connectionRequest r
              join fetch r.fromUser
              join fetch r.toUser
             where c.id = :id
            """)
    Optional<Conversation> findWithParticipantsById(@Param("id") UUID id);

    /** Conversations any of these people are in — the organisation-wide count on Insights. */
    @Query("""
            select count(c) from Conversation c
              join c.connectionRequest r
             where r.fromUser.id in :users or r.toUser.id in :users
            """)
    long countInvolving(@Param("users") Collection<UUID> userIds);
}
