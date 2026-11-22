package com.VentureCapitals.Dashboard.domain.outreach;

import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@Transactional
public class OutreachService {
    private final OutreachRepository outreach;
    private final StartupRepository startups;
    private final FirmAccessPolicy firmAccessPolicy;

    public OutreachService(OutreachRepository outreach, StartupRepository startups, FirmAccessPolicy firmAccessPolicy) {
        this.outreach = outreach;
        this.startups = startups;
        this.firmAccessPolicy = firmAccessPolicy;
    }

    /** Everything the signed-in firm has sent, newest first. Any member may read it. */
    @Transactional(readOnly = true)
    public List<Outreach> list(User actor) {
        VCMember membership = firmAccessPolicy.requireAnyMembership(actor);
        return outreach.findByFromFirmIdOrderBySentAtDesc(membership.getFirm().getId());
    }

    /**
     * Writes to a startup on the firm's behalf.
     *
     * <p>OWNER or PORTFOLIO_MANAGER only: outreach speaks for the firm, and STAFF is "read and
     * limited actions". The sender is recorded so a firm can see who wrote what.
     */
    public Outreach send(User actor, CreateOutreachRequest request) {
        VCMember membership = firmAccessPolicy.requireAnyMembership(actor);
        firmAccessPolicy.require(actor, membership.getFirm().getId(), FirmAccessPolicy.INVESTMENT_EDITORS);

        Startup startup = startups.findById(request.getToStartupId())
                .orElseThrow(() -> new EntityNotFoundException("That startup no longer exists."));

        Outreach saved = outreach.save(Outreach.builder()
                .fromFirm(membership.getFirm())
                .sentByUserId(actor.getId())
                .toStartup(startup)
                .subject(request.getSubject().trim())
                .body(request.getBody().trim())
                .status(OutreachStatus.SENT)
                .sentAt(Instant.now())
                .build());
        log.info("Outreach sent: firmId={}, startupId={}", membership.getFirm().getId(), startup.getId());
        return saved;
    }
}
