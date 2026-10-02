package com.VentureCapitals.Dashboard.domain.pool;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.BatchSize;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "pool_entries")
public class PoolEntry extends BaseEntity {
    // Associations are LAZY; list and detail queries fetch what the API needs via @EntityGraph.
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "vc_firm_id", nullable = false, foreignKey = @ForeignKey(name = "fk_pool_entry_vc_firm"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private VCFirm vcFirm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "startup_id", foreignKey = @ForeignKey(name = "fk_pool_entry_startup"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Startup startup;

    /** Set only for companies not on the platform (exactly one of startup / companyName). */
    private String companyName;

    /** Off-platform only; on-platform entries use the startup's own sector and stage. */
    @Column(name = "company_sector")
    private String companySector;

    @Column(name = "company_stage")
    private String companyStage;

    /** Null once the member who added the entry has left the firm. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "added_by", foreignKey = @ForeignKey(name = "fk_pool_entry_added_by"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private VCMember addedBy;

    // Batched so a page of entries loads its tags in one or two queries, not one per row.
    @ElementCollection(fetch = FetchType.EAGER)
    @BatchSize(size = 50)
    @CollectionTable(name = "pool_entry_tags", joinColumns = @JoinColumn(name = "pool_entry_id"))
    @Column(name = "tag")
    @Builder.Default
    private List<String> tags = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InterestLevel interestLevel;
}
