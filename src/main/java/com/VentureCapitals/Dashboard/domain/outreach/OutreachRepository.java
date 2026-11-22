package com.VentureCapitals.Dashboard.domain.outreach;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OutreachRepository extends JpaRepository<Outreach, UUID> {
    // LOAD, not FETCH: the rows are mapped after the service transaction has closed.
    @EntityGraph(attributePaths = {"fromFirm", "toStartup"}, type = EntityGraph.EntityGraphType.LOAD)
    List<Outreach> findByFromFirmIdOrderBySentAtDesc(UUID fromFirmId);
}
