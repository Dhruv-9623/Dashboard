package com.VentureCapitals.Dashboard.domain.signals;

import com.VentureCapitals.Dashboard.common.MoneyFormat;
import com.VentureCapitals.Dashboard.common.TargetType;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycle;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRepository;
import com.VentureCapitals.Dashboard.domain.pool.PoolEntryRepository;
import com.VentureCapitals.Dashboard.domain.startup.StartupMember;
import com.VentureCapitals.Dashboard.domain.startup.StartupMemberRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.wishlist.WishlistItemRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * News and events worth knowing, filtered to what is relevant to the person asking.
 *
 * <p>Signals are public information, so there is no tenancy to enforce — the filter is about
 * attention, not access. A firm sees news about the companies it holds, tracks or has saved; a
 * founder sees news about their own company and the investors they have saved; everyone sees the
 * market-wide items that name no one.
 */
@Slf4j
@Service
@Transactional
public class SignalService {
    private static final int LIMIT = 100;
    /** An id that matches nothing, so an empty set never reaches an {@code IN ()} clause. */
    private static final UUID NOBODY = new UUID(0, 0);

    private final SignalRepository signals;
    private final FirmAccessPolicy firmAccessPolicy;
    private final StartupMemberRepository startupMembers;
    private final InvestmentRepository investments;
    private final PoolEntryRepository pool;
    private final WishlistItemRepository wishlist;

    public SignalService(SignalRepository signals, FirmAccessPolicy firmAccessPolicy,
                         StartupMemberRepository startupMembers, InvestmentRepository investments,
                         PoolEntryRepository pool, WishlistItemRepository wishlist) {
        this.signals = signals;
        this.firmAccessPolicy = firmAccessPolicy;
        this.startupMembers = startupMembers;
        this.investments = investments;
        this.pool = pool;
        this.wishlist = wishlist;
    }

    @Transactional(readOnly = true)
    public List<Signal> list(User viewer, SignalType type) {
        Set<UUID> startupIds = new HashSet<>();
        Set<UUID> firmIds = new HashSet<>();

        Optional<VCMember> firm = firmAccessPolicy.findMembership(viewer);
        if (firm.isPresent()) {
            UUID firmId = firm.get().getFirm().getId();
            firmIds.add(firmId);
            startupIds.addAll(investments.findStartupIdsByFirm(firmId));
            startupIds.addAll(pool.findStartupIdsByFirm(firmId));
            startupIds.addAll(wishlist.findTargetIds(viewer.getId(), TargetType.STARTUP));
        } else {
            startupMembers.findByUserId(viewer.getId()).map(StartupMember::getStartup)
                    .ifPresent(startup -> startupIds.add(startup.getId()));
            firmIds.addAll(wishlist.findTargetIds(viewer.getId(), TargetType.VC_FIRM));
        }
        if (startupIds.isEmpty()) startupIds.add(NOBODY);
        if (firmIds.isEmpty()) firmIds.add(NOBODY);

        return signals.findRelevant(type, startupIds, firmIds, PageRequest.of(0, LIMIT));
    }

    /**
     * A round opening is public news by nature — the point of opening one is to be seen — so the
     * platform records it itself. Not AI-generated: it states what happened and nothing more.
     */
    public void recordRoundOpened(FundingCycle cycle) {
        String round = cycle.getRoundType().name().replace('_', ' ').toLowerCase();
        signals.save(Signal.builder()
                .relatedStartup(cycle.getStartup())
                .headline(cycle.getStartup().getName() + " opened a " + round + " round")
                .summary("Raising " + MoneyFormat.format(cycle.getTargetAmount(), cycle.getCurrency()) + ".")
                .signalType(SignalType.FUNDING)
                .sentiment(Sentiment.POSITIVE)
                .publishedAt(Instant.now())
                .aiGenerated(false)
                .build());
        log.debug("Signal recorded: round opened, startupId={}", cycle.getStartup().getId());
    }
}
