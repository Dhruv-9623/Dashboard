package com.VentureCapitals.Dashboard.domain.startup;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StartupMemberRepository extends JpaRepository<StartupMember, UUID> {
    @EntityGraph(attributePaths = {"startup"}, type = EntityGraph.EntityGraphType.LOAD)
    Optional<StartupMember> findByUserId(UUID userId);

    @EntityGraph(attributePaths = {"user", "startup"}, type = EntityGraph.EntityGraphType.LOAD)
    List<StartupMember> findByStartupIdOrderByJoinedAtAsc(UUID startupId);

    @EntityGraph(attributePaths = {"user", "startup"}, type = EntityGraph.EntityGraphType.LOAD)
    Optional<StartupMember> findWithUserById(UUID id);
}
