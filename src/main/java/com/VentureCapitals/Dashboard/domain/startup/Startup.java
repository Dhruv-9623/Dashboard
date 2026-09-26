package com.VentureCapitals.Dashboard.domain.startup;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "startups")
public class Startup extends BaseEntity {
    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String website;

    @Column(name = "logo_url")
    private String logoUrl;

    private String sector;

    @Enumerated(EnumType.STRING)
    private StartupStage stage;

    private String location;

    @Column(name = "founded_year")
    private Integer foundedYear;

    /** Whole rupees (or the startup's reporting currency), like Investment.amount. */
    @Column(name = "annual_revenue")
    private Long annualRevenue;

    @Column(name = "team_size")
    private Integer teamSize;

    @Column(name = "pitch_deck_url")
    private String pitchDeckUrl;
}
