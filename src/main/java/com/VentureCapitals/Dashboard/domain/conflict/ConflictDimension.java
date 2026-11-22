package com.VentureCapitals.Dashboard.domain.conflict;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** One kind of overlap within a report, with the holdings that triggered it. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "conflict_dimensions")
public class ConflictDimension extends BaseEntity {
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false, foreignKey = @ForeignKey(name = "fk_conflict_dimension_report"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ConflictReport report;

    @Column(nullable = false)
    private int position;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ConflictDimensionType dimension;

    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal confidence;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @ElementCollection(fetch = FetchType.EAGER)
    @BatchSize(size = 50)
    @CollectionTable(name = "conflict_matches", joinColumns = @JoinColumn(name = "dimension_id"))
    @OrderColumn(name = "position")
    @Builder.Default
    private List<Match> matches = new ArrayList<>();

    @Embeddable
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Match {
        @Column(name = "portfolio_company_id", nullable = false)
        private UUID portfolioCompanyId;

        @Column(name = "portfolio_company_name", nullable = false)
        private String portfolioCompanyName;

        @Column(nullable = false, length = 600)
        private String note;
    }
}
