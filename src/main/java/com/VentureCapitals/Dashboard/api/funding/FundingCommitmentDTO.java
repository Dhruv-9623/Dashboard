package com.VentureCapitals.Dashboard.api.funding;

import com.VentureCapitals.Dashboard.domain.funding.CommitmentStatus;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycleStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class FundingCommitmentDTO {
    private UUID id;
    private UUID fundingCycleId;
    private UUID vcFirmId;
    private String vcFirmName;
    private Long amount;
    private String currency;
    private CommitmentStatus status;
    private Instant committedAt;

    // --- Round context -------------------------------------------------------------------
    // Only populated for the firm's own book, where a row has to name the company it belongs to.
    // Null on the per-round endpoint: there the round is already the thing you are looking at,
    // and its startup isn't loaded on that query.
    private UUID startupId;
    private String startupName;
    private String roundType;
    private FundingCycleStatus cycleStatus;
    private Long cycleTargetAmount;
    /**
     * When the round shut, if it has.
     *
     * <p>Sent so the "record as investment" form can prefill the date it tells the user it
     * defaults to — a field that promises a default and then sits empty is worse than one that
     * says nothing.
     */
    private Instant cycleClosedAt;

    /**
     * The portfolio record this pledge became, or null if it hasn't been recorded yet.
     *
     * <p>Not a status: a converted pledge is still committed money and still counts toward the
     * round's committed band. The client reads this to tell "pledged" from "paid", and to link the
     * row through to the investment.
     */
    private UUID convertedInvestmentId;
}
