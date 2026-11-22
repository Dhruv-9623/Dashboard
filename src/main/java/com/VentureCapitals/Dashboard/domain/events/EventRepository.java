package com.VentureCapitals.Dashboard.domain.events;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EventRepository extends JpaRepository<Event, UUID> {

    /**
     * Events a person may see that start from {@code now} on, soonest first: every public event,
     * plus their own and any they have replied to. The visibility rule lives in the query, so a
     * private event can't leak through a code path that forgot to filter.
     */
    @Query("""
            select e from Event e join fetch e.hostUser
             where e.startTime >= :now
               and (e.isPublic = true or e.hostUser.id = :me
                    or exists (select 1 from EventAttendee a where a.event = e and a.user.id = :me))
             order by e.startTime asc
            """)
    List<Event> findUpcomingVisibleTo(@Param("me") UUID me, @Param("now") Instant now);

    @Query("""
            select e from Event e join fetch e.hostUser
             where e.startTime < :now
               and (e.isPublic = true or e.hostUser.id = :me
                    or exists (select 1 from EventAttendee a where a.event = e and a.user.id = :me))
             order by e.startTime desc
            """)
    List<Event> findPastVisibleTo(@Param("me") UUID me, @Param("now") Instant now);

    @EntityGraph(attributePaths = "hostUser", type = EntityGraph.EntityGraphType.LOAD)
    Optional<Event> findWithHostById(UUID id);
}
