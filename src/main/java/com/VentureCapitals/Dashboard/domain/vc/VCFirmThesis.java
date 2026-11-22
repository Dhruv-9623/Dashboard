package com.VentureCapitals.Dashboard.domain.vc;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.BatchSize;

import java.util.ArrayList;
import java.util.List;

/**
 * What a firm invests in: the thing Deal Triage scores every incoming opportunity against.
 *
 * <p>Private to the firm. A founder browsing investors sees the firm's profile, not its cheque
 * range or its internal notes about what it is looking for.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "vc_firm_theses")
public class VCFirmThesis extends BaseEntity {

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "vc_firm_id", nullable = false, unique = true,
            foreignKey = @ForeignKey(name = "fk_thesis_vc_firm"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private VCFirm vcFirm;

    // Eager and batched: a thesis is read whole, after the service transaction has closed.
    @ElementCollection(fetch = FetchType.EAGER)
    @BatchSize(size = 50)
    @CollectionTable(name = "vc_firm_thesis_sectors", joinColumns = @JoinColumn(name = "thesis_id"))
    @Column(name = "sector", nullable = false)
    @Builder.Default
    private List<String> sectors = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @BatchSize(size = 50)
    @CollectionTable(name = "vc_firm_thesis_stages", joinColumns = @JoinColumn(name = "thesis_id"))
    @Column(name = "stage", nullable = false)
    @Builder.Default
    private List<String> stages = new ArrayList<>();

    @Column(name = "cheque_size_min")
    private Long chequeSizeMin;

    @Column(name = "cheque_size_max")
    private Long chequeSizeMax;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "INR";

    @Column(columnDefinition = "TEXT")
    private String notes;
}
