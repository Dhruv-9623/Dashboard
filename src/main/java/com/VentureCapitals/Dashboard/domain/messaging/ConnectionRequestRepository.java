package com.VentureCapitals.Dashboard.domain.messaging;

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
public interface ConnectionRequestRepository extends JpaRepository<ConnectionRequest, UUID> {

    @EntityGraph(attributePaths = {"fromUser", "toUser"}, type = EntityGraph.EntityGraphType.LOAD)
    List<ConnectionRequest> findByToUserIdOrderByRequestedAtDesc(UUID toUserId);

    @EntityGraph(attributePaths = {"fromUser", "toUser"}, type = EntityGraph.EntityGraphType.LOAD)
    List<ConnectionRequest> findByFromUserIdOrderByRequestedAtDesc(UUID fromUserId);

    @EntityGraph(attributePaths = {"fromUser", "toUser"}, type = EntityGraph.EntityGraphType.LOAD)
    Optional<ConnectionRequest> findWithUsersById(UUID id);

    /** A request in flight or already accepted from {@code from} to {@code to} — a declined one doesn't count. */
    @Query("""
            select r from ConnectionRequest r
             where r.fromUser.id = :from and r.toUser.id = :to
               and r.status in (com.VentureCapitals.Dashboard.domain.messaging.ConnectionStatus.PENDING,
                                com.VentureCapitals.Dashboard.domain.messaging.ConnectionStatus.ACCEPTED)
            """)
    Optional<ConnectionRequest> findLive(@Param("from") UUID from, @Param("to") UUID to);

    /**
     * Requests in flight or accepted between two groups of people, in either direction. A connection
     * is between organisations, so it is looked up across everyone who speaks for each side — otherwise
     * a second founder can ask a firm their colleague is already talking to.
     */
    @Query("""
            select r from ConnectionRequest r
             where ((r.fromUser.id in :sideA and r.toUser.id in :sideB)
                 or (r.fromUser.id in :sideB and r.toUser.id in :sideA))
               and r.status in (com.VentureCapitals.Dashboard.domain.messaging.ConnectionStatus.PENDING,
                                com.VentureCapitals.Dashboard.domain.messaging.ConnectionStatus.ACCEPTED)
            """)
    List<ConnectionRequest> findLiveBetween(@Param("sideA") Collection<UUID> sideA,
                                            @Param("sideB") Collection<UUID> sideB);

    long countByToUserIdIn(Collection<UUID> toUserIds);

    long countByToUserIdInAndStatus(Collection<UUID> toUserIds, ConnectionStatus status);

    /** Requests touching the team in either direction, each counted once — sent or received. */
    @Query("""
            select count(r) from ConnectionRequest r
             where r.fromUser.id in :team or r.toUser.id in :team
            """)
    long countInvolving(@Param("team") Collection<UUID> team);

    @Query("""
            select count(r) from ConnectionRequest r
             where (r.fromUser.id in :team or r.toUser.id in :team) and r.status = :status
            """)
    long countInvolvingWithStatus(@Param("team") Collection<UUID> team, @Param("status") ConnectionStatus status);
}
