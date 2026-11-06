package com.VentureCapitals.Dashboard.domain.funding;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import com.VentureCapitals.Dashboard.domain.investment.Investment;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.Instant;

/**
 * What one firm has said it will put into one round.
 *
 * <p>A firm has at most one commitment per round — a second cheque from the same investor is that
 * firm changing its mind about the amount, not a second investor, so the unique constraint makes
 * the update path the only path.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "funding_commitments", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"funding_cycle_id", "vc_firm_id"}, name = "uq_commitment_cycle_firm")
})
public class FundingCommitment extends BaseEntity {

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "funding_cycle_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_commitment_cycle"))
    private FundingCycle fundingCycle;

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "vc_firm_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_commitment_vc_firm"))
    private VCFirm vcFirm;

    @Column(nullable = false)
    private Long amount;

    /** Always the cycle's currency; the service refuses anything else. */
    @Column(nullable = false)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommitmentStatus status;

    @Column(name = "committed_at", nullable = false)
    private Instant committedAt;

    /**
     * The portfolio record this pledge turned into, once the round closed and the firm confirmed
     * it. Null until then, and null again if that record is later deleted.
     *
     * <p>A link rather than a status, so a converted pledge keeps counting toward the round's
     * committed band: a closed round whose investors have all recorded their cheques should read
     * as fully funded, not as empty.
     */
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "converted_investment_id",
            foreignKey = @ForeignKey(name = "fk_commitment_converted_investment"))
    private Investment convertedInvestment;

    /** Whether this pledge has already been written into the firm's portfolio. */
    public boolean isConverted() {
        return convertedInvestment != null;
    }
}
