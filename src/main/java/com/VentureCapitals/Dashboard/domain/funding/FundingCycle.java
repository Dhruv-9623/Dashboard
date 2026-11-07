package com.VentureCapitals.Dashboard.domain.funding;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRound;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.Instant;

/**
 * A round a startup is raising.
 *
 * <p>The round type reuses {@link InvestmentRound} rather than declaring its own list: a seed round
 * is the same thing whether a founder is raising it or a VC has already written the cheque, and two
 * enums for one idea drift apart.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "funding_cycles")
public class FundingCycle extends BaseEntity {

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "startup_id", nullable = false, foreignKey = @ForeignKey(name = "fk_funding_cycle_startup"))
    private Startup startup;

    @Enumerated(EnumType.STRING)
    @Column(name = "round_type", nullable = false)
    private InvestmentRound roundType;

    /** Whole units of {@link #currency}, like Investment.amount. */
    @Column(name = "target_amount", nullable = false)
    private Long targetAmount;

    @Column(nullable = false)
    private String currency;

    /** Optional band for a single cheque. A commitment outside it is rejected. */
    @Column(name = "min_ticket_size")
    private Long minTicketSize;

    @Column(name = "max_ticket_size")
    private Long maxTicketSize;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FundingCycleStatus status;

    @Column(name = "pitch_deck_url")
    private String pitchDeckUrl;

    @Column(name = "data_room_url")
    private String dataRoomUrl;

    @Column(name = "opened_at", nullable = false)
    private Instant openedAt;

    /** Set by the server when the round closes; cleared if it reopens. */
    @Column(name = "closed_at")
    private Instant closedAt;
}
