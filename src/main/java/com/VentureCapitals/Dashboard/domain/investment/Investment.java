package com.VentureCapitals.Dashboard.domain.investment;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
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

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "investments")
public class Investment extends BaseEntity {
    // LAZY; queries used by the API fetch these via @EntityGraph.
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "vc_firm_id", nullable = false, foreignKey = @ForeignKey(name = "fk_investment_vc_firm"))
    private VCFirm vcFirm;

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "startup_id", nullable = false, foreignKey = @ForeignKey(name = "fk_investment_startup"))
    private Startup startup;

    @Column(nullable = false)
    private LocalDate investmentDate;

    @Column(nullable = false)
    private Long amount;

    @Column(nullable = false)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvestmentRound round;

    private BigDecimal equityPercentage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvestmentStatus status;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
