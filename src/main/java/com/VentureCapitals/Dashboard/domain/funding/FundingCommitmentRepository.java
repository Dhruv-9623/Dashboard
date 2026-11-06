package com.VentureCapitals.Dashboard.domain.funding;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FundingCommitmentRepository extends JpaRepository<FundingCommitment, UUID> {

    // `convertedInvestment` is in every graph that feeds the mapper. It is a lazy association,
    // and the DTO is built after the transaction has closed — joining it here is one indexed join
    // rather than a LazyInitializationException waiting for the first converted pledge.
    @EntityGraph(attributePaths = {"vcFirm", "convertedInvestment"}, type = EntityGraph.EntityGraphType.LOAD)
    List<FundingCommitment> findByFundingCycleIdOrderByCommittedAtDesc(UUID cycleId);

    @EntityGraph(attributePaths = {"vcFirm", "convertedInvestment"}, type = EntityGraph.EntityGraphType.LOAD)
    List<FundingCommitment> findByFundingCycleIdAndVcFirmId(UUID cycleId, UUID firmId);

    Optional<FundingCommitment> findByFundingCycleIdAndVcFirmIdAndIdNot(UUID cycleId, UUID firmId, UUID excludeId);

    /**
     * Everything one firm has pledged, across every round — the investor's own book.
     *
     * <p>Loads the round and its startup because the pipeline view names the company; without the
     * graph each row costs two extra selects, and reading them outside a transaction fails
     * outright. LOAD rather than the default FETCH, so the entity's own EAGER mappings survive.
     *
     * <p>{@code status} is optional: null means every band, including withdrawals, since a firm
     * reviewing its own book should see what it pulled out of.
     */
    @Query("""
            select commitment
              from FundingCommitment commitment
             where commitment.vcFirm.id = :firmId
               and (:status is null or commitment.status = :status)
            """)
    @EntityGraph(attributePaths = {"fundingCycle", "fundingCycle.startup", "convertedInvestment"},
            type = EntityGraph.EntityGraphType.LOAD)
    Page<FundingCommitment> findFirmBook(@Param("firmId") UUID firmId,
                                         @Param("status") CommitmentStatus status,
                                         Pageable pageable);

    @EntityGraph(attributePaths = {"vcFirm", "fundingCycle", "convertedInvestment"},
            type = EntityGraph.EntityGraphType.LOAD)
    Optional<FundingCommitment> findWithCycleById(UUID id);

    /**
     * Per-status totals for a set of cycles, in one query.
     *
     * <p>A list endpoint renders many cycles and each needs its own committed / soft / indicated
     * figures; without this it is one query per cycle per band.
     *
     * <p>WITHDRAWN is filtered out here rather than in the caller, so no total anywhere in the
     * application can accidentally include money an investor has taken off the table.
     */
    @Query("""
            select commitment.fundingCycle.id as cycleId,
                   commitment.status as status,
                   sum(commitment.amount) as total,
                   count(commitment) as count
              from FundingCommitment commitment
             where commitment.fundingCycle.id in :cycleIds
               and commitment.status <> com.VentureCapitals.Dashboard.domain.funding.CommitmentStatus.WITHDRAWN
             group by commitment.fundingCycle.id, commitment.status
            """)
    List<CommitmentTotal> sumByCycleAndStatus(@Param("cycleIds") Collection<UUID> cycleIds);

    /** Projection for {@link #sumByCycleAndStatus}. */
    interface CommitmentTotal {
        UUID getCycleId();
        CommitmentStatus getStatus();
        long getTotal();
        long getCount();
    }

    /**
     * The firm's whole book in one query, grouped by currency and band.
     *
     * <p>Computed in the database rather than from a page of rows, because the headline figures on
     * the Commitments page describe the firm's entire exposure: totalling the twenty rows that
     * happen to be on screen gives a number that changes when you turn the page or pick a filter,
     * which is worse than no number at all.
     *
     * <p>Two exclusions, both deliberate:
     * <ul>
     *   <li>WITHDRAWN — money taken off the table was never promised.</li>
     *   <li>Converted — money already recorded as an investment has been deployed, and this page
     *       reports what is promised and <em>not</em> deployed. Counting it here would double it
     *       against the portfolio page.</li>
     * </ul>
     */
    @Query("""
            select commitment.currency as currency,
                   commitment.status as status,
                   sum(commitment.amount) as total,
                   count(commitment) as count
              from FundingCommitment commitment
             where commitment.vcFirm.id = :firmId
               and commitment.status <> com.VentureCapitals.Dashboard.domain.funding.CommitmentStatus.WITHDRAWN
               and commitment.convertedInvestment is null
             group by commitment.currency, commitment.status
            """)
    List<BookTotal> sumFirmBookByCurrencyAndStatus(@Param("firmId") UUID firmId);

    /** Projection for {@link #sumFirmBookByCurrencyAndStatus}. */
    interface BookTotal {
        String getCurrency();
        CommitmentStatus getStatus();
        long getTotal();
        long getCount();
    }

    /**
     * Pledges waiting to be recorded as investments — committed, on a round that has closed, and
     * not yet converted.
     *
     * <p>Counted across the whole book for the same reason as the totals: the prompt that offers
     * to record them has to know about rounds that aren't on the current page.
     */
    @Query("""
            select count(commitment)
              from FundingCommitment commitment
             where commitment.vcFirm.id = :firmId
               and commitment.status = com.VentureCapitals.Dashboard.domain.funding.CommitmentStatus.COMMITTED
               and commitment.convertedInvestment is null
               and commitment.fundingCycle.status = com.VentureCapitals.Dashboard.domain.funding.FundingCycleStatus.CLOSED
            """)
    long countReadyToRecord(@Param("firmId") UUID firmId);
}
