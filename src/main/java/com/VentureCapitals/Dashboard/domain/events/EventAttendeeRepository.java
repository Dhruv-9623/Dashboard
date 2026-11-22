package com.VentureCapitals.Dashboard.domain.events;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EventAttendeeRepository extends JpaRepository<EventAttendee, UUID> {

    Optional<EventAttendee> findByEventIdAndUserId(UUID eventId, UUID userId);

    void deleteByEventId(UUID eventId);

    @EntityGraph(attributePaths = "user", type = EntityGraph.EntityGraphType.LOAD)
    List<EventAttendee> findByEventIdOrderByRsvpAtAsc(UUID eventId);

    /** The viewer's own replies across a list of events, in one query. */
    @Query("select a from EventAttendee a where a.event.id in :events and a.user.id = :me")
    List<EventAttendee> findMine(@Param("events") Collection<UUID> eventIds, @Param("me") UUID me);

    /** How many people are going to each event. Only GOING counts: a "maybe" is not a head. */
    @Query("""
            select a.event.id as eventId, count(a) as going from EventAttendee a
             where a.event.id in :events and a.rsvpStatus = com.VentureCapitals.Dashboard.domain.events.RsvpStatus.GOING
             group by a.event.id
            """)
    List<GoingCount> countGoing(@Param("events") Collection<UUID> eventIds);

    interface GoingCount {
        UUID getEventId();

        Long getGoing();
    }
}
