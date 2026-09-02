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
import jakarta.persistence.ForeignKey;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "pool_entries")
public class PoolEntry extends BaseEntity {
    @ManyToOne(optional = false)
    @JoinColumn(name = "vc_firm_id", nullable = false, foreignKey = @ForeignKey(name = "fk_pool_entry_vc_firm"))
    private VCFirm vcFirm;

    @ManyToOne(optional = true)
    @JoinColumn(name = "startup_id", nullable = true, foreignKey = @ForeignKey(name = "fk_pool_entry_startup"))
    private Startup startup;

    private String companyName;

    @ManyToOne(optional = false)
    @JoinColumn(name = "added_by", nullable = false, foreignKey = @ForeignKey(name = "fk_pool_entry_added_by"))
    private VCMember addedBy;

    @ElementCollection
    @CollectionTable(name = "pool_entry_tags", joinColumns = @JoinColumn(name = "pool_entry_id"))
    @Column(name = "tag")
    private List<String> tags;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InterestLevel interestLevel;
}
