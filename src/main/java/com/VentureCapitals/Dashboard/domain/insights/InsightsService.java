package com.VentureCapitals.Dashboard.domain.insights;

import com.VentureCapitals.Dashboard.common.TargetType;
import com.VentureCapitals.Dashboard.domain.funding.CommitmentStatus;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitment;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitmentRepository;
import com.VentureCapitals.Dashboard.domain.investment.Investment;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRepository;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentStatus;
import com.VentureCapitals.Dashboard.domain.messaging.ConnectionRequestRepository;
import com.VentureCapitals.Dashboard.domain.messaging.ConnectionStatus;
import com.VentureCapitals.Dashboard.domain.messaging.ConversationRepository;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupMember;
import com.VentureCapitals.Dashboard.domain.startup.StartupMemberRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import com.VentureCapitals.Dashboard.domain.wishlist.WishlistItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** The numbers behind the Insights page, for whichever side of the platform is asking. */
@Service
@Transactional(readOnly = true)
public class InsightsService {
    private final FirmAccessPolicy firmAccessPolicy;
    private final VCMemberRepository vcMembers;
    private final StartupMemberRepository startupMembers;
    private final ProfileViewService profileViews;
    private final WishlistItemRepository wishlist;
    private final ConnectionRequestRepository requests;
    private final ConversationRepository conversations;
    private final InvestmentRepository investments;
    private final FundingCommitmentRepository commitments;
    private final Clock clock;

    public InsightsService(FirmAccessPolicy firmAccessPolicy, VCMemberRepository vcMembers,
                           StartupMemberRepository startupMembers, ProfileViewService profileViews,
                           WishlistItemRepository wishlist, ConnectionRequestRepository requests,
                           ConversationRepository conversations, InvestmentRepository investments,
                           FundingCommitmentRepository commitments, Clock clock) {
        this.firmAccessPolicy = firmAccessPolicy;
        this.vcMembers = vcMembers;
        this.startupMembers = startupMembers;
        this.profileViews = profileViews;
        this.wishlist = wishlist;
        this.requests = requests;
        this.conversations = conversations;
        this.investments = investments;
        this.commitments = commitments;
        this.clock = clock;
    }

    public Insights forUser(User user) {
        Optional<VCMember> firm = firmAccessPolicy.findMembership(user);
        if (firm.isPresent()) return forFirm(firm.get().getFirm());

        Optional<Startup> startup = startupMembers.findByUserId(user.getId()).map(StartupMember::getStartup);
        if (startup.isPresent()) return forStartup(startup.get());

        // Signed up but not set up: nothing to measure yet, and an empty page is the truthful answer.
        return empty();
    }

    // --- investor ---------------------------------------------------------------------------

    private Insights forFirm(VCFirm firm) {
        Set<UUID> team = vcMembers.findByFirmId(firm.getId()).stream()
                .map(m -> m.getUser().getId()).collect(Collectors.toSet());

        long views = profileViews.countFor(TargetType.VC_FIRM, firm.getId());
        long saved = wishlist.countByTargetTypeAndTargetId(TargetType.VC_FIRM, firm.getId());
        long received = requests.countInvolving(team);
        long accepted = requests.countInvolvingWithStatus(team, ConnectionStatus.ACCEPTED);

        List<Investment> active = investments.findByVcFirmIdAndStatus(firm.getId(), InvestmentStatus.ACTIVE);
        String currency = dominantCurrency(active.stream().collect(
                Collectors.groupingBy(Investment::getCurrency, Collectors.summingLong(Investment::getAmount))));
        // One currency per breakdown: adding rupees to dollars would be a lie.
        List<Investment> inCurrency = active.stream().filter(i -> i.getCurrency().equals(currency)).toList();

        Map<String, long[]> bySector = new LinkedHashMap<>();
        for (Investment investment : inCurrency) {
            String sector = investment.getStartup().getSector() == null ? "Other" : investment.getStartup().getSector();
            long[] slice = bySector.computeIfAbsent(sector, k -> new long[2]);
            slice[0]++;
            slice[1] += investment.getAmount();
        }

        long companies = active.stream().map(i -> i.getStartup().getId()).distinct().count();
        // Funnel and headline cards must agree: live holdings, not every position ever written.
        long positions = active.size();
        return new Insights(views, received, accepted, conversations.countInvolving(team), saved,
                inCurrency.stream().mapToLong(Investment::getAmount).sum(), currency, companies,
                List.of(new Insights.FunnelStage("Profile views", views),
                        new Insights.FunnelStage("Wishlisted", saved),
                        new Insights.FunnelStage("Connection requests", received),
                        new Insights.FunnelStage("Accepted", accepted),
                        new Insights.FunnelStage("Investments made", positions)),
                slices(bySector), Instant.now(clock));
    }

    // --- founder ----------------------------------------------------------------------------

    private Insights forStartup(Startup startup) {
        Set<UUID> team = startupMembers.findByStartupIdOrderByJoinedAtAsc(startup.getId()).stream()
                .map(m -> m.getUser().getId()).collect(Collectors.toSet());

        long views = profileViews.countFor(TargetType.STARTUP, startup.getId());
        long saved = wishlist.countByTargetTypeAndTargetId(TargetType.STARTUP, startup.getId());
        long received = requests.countInvolving(team);
        long accepted = requests.countInvolvingWithStatus(team, ConnectionStatus.ACCEPTED);

        List<FundingCommitment> pledges = commitments.findLiveForStartup(startup.getId());
        // "Raised" and "committed investors" are signed money only. An indication or a soft pledge is
        // interest, not capital, and counting it made a ₹6 Cr round read as ₹12.5 Cr from 3 backers.
        List<FundingCommitment> signed = pledges.stream()
                .filter(p -> p.getStatus() == CommitmentStatus.COMMITTED).toList();
        String currency = dominantCurrency(signed.stream().collect(
                Collectors.groupingBy(FundingCommitment::getCurrency, Collectors.summingLong(FundingCommitment::getAmount))));
        List<FundingCommitment> inCurrency = signed.stream().filter(p -> p.getCurrency().equals(currency)).toList();

        // "Commitments by sector": grouped by the investor's own focus, since the founder's
        // question is which kinds of fund are backing them.
        Map<String, long[]> byFocus = new LinkedHashMap<>();
        Map<String, Set<UUID>> firmsInFocus = new LinkedHashMap<>();
        for (FundingCommitment pledge : inCurrency) {
            VCFirm investor = pledge.getVcFirm();
            String focus = investor.getSectors() == null || investor.getSectors().isEmpty()
                    ? "Generalist" : investor.getSectors().get(0);
            byFocus.computeIfAbsent(focus, k -> new long[2])[1] += pledge.getAmount();
            firmsInFocus.computeIfAbsent(focus, k -> new HashSet<>()).add(investor.getId());
        }
        firmsInFocus.forEach((focus, firms) -> byFocus.get(focus)[0] = firms.size());

        long backers = signed.stream().map(p -> p.getVcFirm().getId()).distinct().count();
        return new Insights(views, received, accepted, conversations.countInvolving(team), saved,
                inCurrency.stream().mapToLong(FundingCommitment::getAmount).sum(), currency, backers,
                List.of(new Insights.FunnelStage("Profile views", views),
                        new Insights.FunnelStage("Wishlisted", saved),
                        new Insights.FunnelStage("Connection requests", received),
                        new Insights.FunnelStage("Accepted", accepted),
                        new Insights.FunnelStage("Investor pledges", pledges.size())),
                slices(byFocus), Instant.now(clock));
    }

    // --- helpers ----------------------------------------------------------------------------

    private Insights empty() {
        return new Insights(0, 0, 0, 0, 0, 0, "INR", 0, List.of(), List.of(), Instant.now(clock));
    }

    private static List<Insights.SectorSlice> slices(Map<String, long[]> grouped) {
        return grouped.entrySet().stream()
                .map(e -> new Insights.SectorSlice(e.getKey(), e.getValue()[0], e.getValue()[1]))
                .sorted(Comparator.comparingLong(Insights.SectorSlice::amount).reversed())
                .toList();
    }

    /** The currency with the most money in it; INR when there is none, since that's the market. */
    private static String dominantCurrency(Map<String, Long> totals) {
        return totals.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("INR");
    }
}
