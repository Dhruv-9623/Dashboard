package com.VentureCapitals.Dashboard.api.funding;

import com.VentureCapitals.Dashboard.domain.funding.CommitmentEvent;
import com.VentureCapitals.Dashboard.domain.funding.CycleTotals;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitment;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycle;
import com.VentureCapitals.Dashboard.domain.investment.Investment;
import com.VentureCapitals.Dashboard.domain.startup.Startup;

import java.util.UUID;

/** Entity → DTO. Static because it holds no state and nothing here needs injecting. */
public final class FundingMapper {

    private FundingMapper() {
    }

    public static FundingCycleDTO toDTO(FundingCycle cycle, CycleTotals totals) {
        Startup startup = cycle.getStartup();
        return FundingCycleDTO.builder()
                .id(cycle.getId())
                .startupId(startup.getId())
                .startupName(startup.getName())
                .startupSector(startup.getSector())
                .startupStage(startup.getStage() == null ? null : startup.getStage().name())
                .roundType(cycle.getRoundType().name())
                .targetAmount(cycle.getTargetAmount())
                .currency(cycle.getCurrency())
                .minTicketSize(cycle.getMinTicketSize())
                .maxTicketSize(cycle.getMaxTicketSize())
                .status(cycle.getStatus())
                .pitchDeckUrl(cycle.getPitchDeckUrl())
                .dataRoomUrl(cycle.getDataRoomUrl())
                .openedAt(cycle.getOpenedAt())
                .closedAt(cycle.getClosedAt())
                .committedAmount(totals.committed())
                .softCommittedAmount(totals.softCommitted())
                .indicatedAmount(totals.indicated())
                .commitmentCount(totals.commitmentCount())
                .build();
    }

    /**
     * A commitment seen from inside the round — the founder's investor list, or a firm looking at
     * its own pledge on a round it already has open.
     *
     * <p>Leaves the round-context fields null on purpose: the queries behind this path don't load
     * the cycle's startup, and reaching for it here would either fire extra selects or throw
     * outside a transaction.
     */
    public static FundingCommitmentDTO toDTO(FundingCommitment commitment) {
        return FundingCommitmentDTO.builder()
                .id(commitment.getId())
                .fundingCycleId(commitment.getFundingCycle().getId())
                .vcFirmId(commitment.getVcFirm().getId())
                .vcFirmName(commitment.getVcFirm().getName())
                .amount(commitment.getAmount())
                .currency(commitment.getCurrency())
                .status(commitment.getStatus())
                .committedAt(commitment.getCommittedAt())
                .convertedInvestmentId(convertedInvestmentId(commitment))
                .build();
    }

    /**
     * A commitment seen from the firm's own book, where the round is what identifies the row.
     *
     * <p>Requires the {@code fundingCycle.startup} graph to be loaded — see
     * {@code FundingCommitmentRepository.findFirmBook}.
     */
    public static FundingCommitmentDTO toBookDTO(FundingCommitment commitment) {
        FundingCycle cycle = commitment.getFundingCycle();
        Startup startup = cycle.getStartup();
        return FundingCommitmentDTO.builder()
                .id(commitment.getId())
                .fundingCycleId(cycle.getId())
                .vcFirmId(commitment.getVcFirm().getId())
                .amount(commitment.getAmount())
                .currency(commitment.getCurrency())
                .status(commitment.getStatus())
                .committedAt(commitment.getCommittedAt())
                .startupId(startup.getId())
                .startupName(startup.getName())
                .roundType(cycle.getRoundType().name())
                .cycleStatus(cycle.getStatus())
                .cycleTargetAmount(cycle.getTargetAmount())
                .cycleClosedAt(cycle.getClosedAt())
                .convertedInvestmentId(convertedInvestmentId(commitment))
                .build();
    }

    /** One move in a round's history. */
    public static CommitmentEventDTO toDTO(CommitmentEvent event) {
        return CommitmentEventDTO.builder()
                .id(event.getId())
                .commitmentId(event.getCommitment().getId())
                .vcFirmId(event.getVcFirm().getId())
                .vcFirmName(event.getVcFirm().getName())
                .fromStatus(event.getFromStatus())
                .toStatus(event.getToStatus())
                .fromAmount(event.getFromAmount())
                .toAmount(event.getToAmount())
                .currency(event.getCurrency())
                .occurredAt(event.getOccurredAt())
                .build();
    }

    /**
     * The id of the portfolio record this pledge became, or null.
     *
     * <p>Reads the id off the lazy association rather than the entity, so no mapper call drags an
     * investment row in behind it: Hibernate answers an id from the proxy without a select.
     */
    private static UUID convertedInvestmentId(FundingCommitment commitment) {
        Investment investment = commitment.getConvertedInvestment();
        return investment == null ? null : investment.getId();
    }
}
