package com.VentureCapitals.Dashboard.domain.funding;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Reads over the append-only event log. There is deliberately no delete or update path — the only
 * write is the insert {@code FundingService} makes alongside each commitment change.
 */
public interface CommitmentEventRepository extends JpaRepository<CommitmentEvent, UUID> {

    /**
     * A round's whole history, oldest first — the order a chart and a timeline both want.
     *
     * <p>Loads the firm because every row is labelled with who moved; LOAD rather than the default
     * FETCH so the entity's other mappings keep their declared fetch types.
     */
    @EntityGraph(attributePaths = "vcFirm", type = EntityGraph.EntityGraphType.LOAD)
    List<CommitmentEvent> findByFundingCycleIdOrderByOccurredAtAsc(UUID cycleId);

    /**
     * One firm's history on one round — what an investor is allowed to see of a round it doesn't
     * own, mirroring the rule on the commitments themselves.
     */
    @EntityGraph(attributePaths = "vcFirm", type = EntityGraph.EntityGraphType.LOAD)
    List<CommitmentEvent> findByFundingCycleIdAndVcFirmIdOrderByOccurredAtAsc(UUID cycleId, UUID firmId);
}
