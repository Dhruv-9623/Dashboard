package com.VentureCapitals.Dashboard.domain.funding;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
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
 * One move in a commitment's life — created, re-sized, promoted, or withdrawn.
 *
 * <p>Append-only. Nothing in the application updates or deletes a row here, which is what lets a
 * founder's momentum chart be believed: the bands on a round are a current snapshot and can be
 * recomputed, but how the round got there can only be read back from a record kept as it happened.
 *
 * <p>There is no event-type column. The before/after pair already says which kind of move this
 * was: {@link #fromStatus} null means the pledge was created, equal statuses with different
 * amounts mean the investor changed its number, and a {@link CommitmentStatus#WITHDRAWN} target
 * means it pulled out. A separate type field would be a second source of truth for the same fact.
 *
 * <p>{@code fundingCycle} and {@code vcFirm} are copied from the commitment rather than reached
 * through it, so a round's whole history is one indexed read.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "commitment_events")
public class CommitmentEvent extends BaseEntity {

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "commitment_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_commitment_event_commitment"))
    private FundingCommitment commitment;

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "funding_cycle_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_commitment_event_cycle"))
    private FundingCycle fundingCycle;

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "vc_firm_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_commitment_event_firm"))
    private VCFirm vcFirm;

    /**
     * Who made the move — always a member of {@link #vcFirm}, since only the owning firm can move
     * its own pledge.
     *
     * <p>Null when no user did: data seeded for a demo, data imported from elsewhere, and any
     * transition the system comes to make on its own. Every event written in response to a request
     * carries its actor, so a null here never means "we lost track of who".
     */
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id",
            foreignKey = @ForeignKey(name = "fk_commitment_event_actor"))
    private User actor;

    /** Null on the first event for a commitment, which is how a creation identifies itself. */
    @Enumerated(EnumType.STRING)
    @Column(name = "from_status")
    private CommitmentStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false)
    private CommitmentStatus toStatus;

    /** Null exactly when {@link #fromStatus} is — the database checks the pair together. */
    @Column(name = "from_amount")
    private Long fromAmount;

    @Column(name = "to_amount", nullable = false)
    private Long toAmount;

    /** The round's currency, copied so a historical row reads correctly on its own. */
    @Column(nullable = false)
    private String currency;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    /** True for the row that records the pledge first being made. */
    public boolean isCreation() {
        return fromStatus == null;
    }
}
