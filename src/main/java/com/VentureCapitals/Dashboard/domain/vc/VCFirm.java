package com.VentureCapitals.Dashboard.domain.vc;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
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
@Table(name = "vc_firms")
public class VCFirm extends BaseEntity {
    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String website;

    private Long aum;

    private String investmentStage;

    @ElementCollection
    @CollectionTable(name = "vc_firm_sectors", joinColumns = @JoinColumn(name = "vc_firm_id"))
    @Column(name = "sector")
    private List<String> sectors;

    private String location;

    private Integer foundedYear;
}
