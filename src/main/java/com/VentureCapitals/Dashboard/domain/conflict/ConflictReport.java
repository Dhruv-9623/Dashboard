package com.VentureCapitals.Dashboard.domain.conflict;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import com.VentureCapitals.Dashboard.domain.opportunity.Opportunity;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * The current conflict check for an opportunity: how much it overlaps what the firm already
 * holds, broken down by kind. One per opportunity — running the check again replaces it.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "conflict_reports")
public class ConflictReport extends BaseEntity {
    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "opportunity_id", nullable = false, unique = true,
            foreignKey = @ForeignKey(name = "fk_conflict_report_opportunity"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Opportunity opportunity;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "vc_firm_id", nullable = false, foreignKey = @ForeignKey(name = "fk_conflict_report_firm"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private VCFirm vcFirm;

    // BigDecimal, not double: the column is NUMERIC(4,3) and schema validation rejects a mismatch.
    @Column(name = "overall_confidence", nullable = false, precision = 4, scale = 3)
    private BigDecimal overallConfidence;

    @Column(name = "compared_company_count", nullable = false)
    private int comparedCompanyCount;

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt;

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("position ASC")
    @BatchSize(size = 50)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @Builder.Default
    private List<ConflictDimension> dimensions = new ArrayList<>();
}
