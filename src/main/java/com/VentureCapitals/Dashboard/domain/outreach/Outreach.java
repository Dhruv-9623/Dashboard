package com.VentureCapitals.Dashboard.domain.outreach;

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
import java.util.UUID;

/**
 * A formal message from a firm to a startup it is not yet connected to (CLAUDE.md §9).
 *
 * <p>Distinct from messaging on purpose: outreach is how a firm introduces itself, and needs no
 * consent from the other side. A conversation does — it only opens once a connection request is
 * accepted (Business Rule 1).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "outreach")
public class Outreach extends BaseEntity {
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "from_firm_id", nullable = false, foreignKey = @ForeignKey(name = "fk_outreach_firm"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private VCFirm fromFirm;

    @Column(name = "sent_by_user_id")
    private UUID sentByUserId;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "to_startup_id", nullable = false, foreignKey = @ForeignKey(name = "fk_outreach_startup"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Startup toStartup;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OutreachStatus status;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt;
}
