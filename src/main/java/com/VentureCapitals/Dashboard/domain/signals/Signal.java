package com.VentureCapitals.Dashboard.domain.signals;

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

import java.time.Instant;

/**
 * A piece of news about a company or a firm, or about the market (neither set).
 *
 * <p>Public: signals describe what is already public, so they are not scoped to a tenant. Which
 * ones a person sees is a matter of relevance, decided in {@code SignalService}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "signals")
public class Signal extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_startup_id", foreignKey = @ForeignKey(name = "fk_signal_startup"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Startup relatedStartup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_vc_firm_id", foreignKey = @ForeignKey(name = "fk_signal_vc_firm"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private VCFirm relatedVcFirm;

    @Column(name = "source_url")
    private String sourceUrl;

    @Column(nullable = false, length = 300)
    private String headline;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Enumerated(EnumType.STRING)
    @Column(name = "signal_type", nullable = false, length = 16)
    private SignalType signalType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Sentiment sentiment;

    @Column(name = "published_at", nullable = false)
    private Instant publishedAt;

    /** False for signals the platform derives from its own events, true for ones a model wrote. */
    @Column(name = "ai_generated", nullable = false)
    private boolean aiGenerated;
}
