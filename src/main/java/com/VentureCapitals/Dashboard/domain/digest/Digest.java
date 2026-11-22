package com.VentureCapitals.Dashboard.domain.digest;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
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

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** A written summary of how the portfolio stands, with the things in it that need a look. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "digests")
public class Digest extends BaseEntity {
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "vc_firm_id", nullable = false, foreignKey = @ForeignKey(name = "fk_digest_firm"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private VCFirm vcFirm;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    @Column(name = "summary_markdown", nullable = false, columnDefinition = "TEXT")
    private String summaryMarkdown;

    @Column(name = "company_count", nullable = false)
    private int companyCount;

    /** Null until something actually emails it — nothing does yet, and the screen says so. */
    @Column(name = "sent_at")
    private Instant sentAt;

    @ElementCollection(fetch = FetchType.EAGER)
    @BatchSize(size = 50)
    @CollectionTable(name = "digest_alerts", joinColumns = @JoinColumn(name = "digest_id"))
    @OrderColumn(name = "position")
    @Builder.Default
    private List<Alert> alerts = new ArrayList<>();

    @Embeddable
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Alert {
        @Column(name = "investment_id")
        private UUID investmentId;

        @Column(name = "startup_name")
        private String startupName;

        @Enumerated(EnumType.STRING)
        @Column(nullable = false, length = 16)
        private AlertSeverity severity;

        @Column(nullable = false, length = 600)
        private String message;
    }
}
