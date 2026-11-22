package com.VentureCapitals.Dashboard.domain.opportunity;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
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
import java.util.ArrayList;
import java.util.List;

/**
 * A company a firm is considering, and how it scored against the firm's thesis. Deal triage's
 * unit of work: logged, scored, then approved or rejected by someone who can decide.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "opportunities")
public class Opportunity extends BaseEntity {
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "vc_firm_id", nullable = false, foreignKey = @ForeignKey(name = "fk_opportunity_vc_firm"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private VCFirm vcFirm;

    /** Null once the member who logged it has left the firm. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", foreignKey = @ForeignKey(name = "fk_opportunity_created_by"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private VCMember createdBy;

    @Column(name = "company_name", nullable = false)
    private String companyName;

    private String website;

    @Column(nullable = false)
    private String sector;

    /** A {@code StartupStage} name — validated on the way in, kept as text so scoring never needs an enum lookup. */
    @Column(nullable = false, length = 32)
    private String stage;

    @Column(name = "ask_amount")
    private Long askAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "fit_score")
    private Integer fitScore;

    @Column(columnDefinition = "TEXT")
    private String rationale;

    // Eager and batched: the detail view needs them, and they are read after the transaction closes.
    @ElementCollection(fetch = FetchType.EAGER)
    @BatchSize(size = 50)
    @CollectionTable(name = "opportunity_citations", joinColumns = @JoinColumn(name = "opportunity_id"))
    @OrderColumn(name = "position")
    @Builder.Default
    private List<Citation> citations = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "recommended_action", length = 24)
    private RecommendedAction recommendedAction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private OpportunityStatus status;

    @Column(name = "decision_note", columnDefinition = "TEXT")
    private String decisionNote;

    @Column(name = "scored_at")
    private Instant scoredAt;

    @Embeddable
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Citation {
        @Column(nullable = false, length = 600)
        private String claim;

        @Column(name = "thesis_field", nullable = false, length = 64)
        private String thesisField;

        @Column(nullable = false)
        private boolean supporting;
    }
}
