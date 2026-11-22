package com.VentureCapitals.Dashboard.domain.insights;

import com.VentureCapitals.Dashboard.domain.funding.CommitmentStatus;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitment;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitmentRepository;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRepository;
import com.VentureCapitals.Dashboard.domain.messaging.ConnectionRequestRepository;
import com.VentureCapitals.Dashboard.domain.messaging.ConversationRepository;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupMember;
import com.VentureCapitals.Dashboard.domain.startup.StartupMemberRepository;
import com.VentureCapitals.Dashboard.domain.startup.StartupRole;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import com.VentureCapitals.Dashboard.domain.wishlist.WishlistItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InsightsServiceTest {
    @Mock private FirmAccessPolicy firmAccessPolicy;
    @Mock private VCMemberRepository vcMembers;
    @Mock private StartupMemberRepository startupMembers;
    @Mock private ProfileViewService profileViews;
    @Mock private WishlistItemRepository wishlist;
    @Mock private ConnectionRequestRepository requests;
    @Mock private ConversationRepository conversations;
    @Mock private InvestmentRepository investments;
    @Mock private FundingCommitmentRepository commitments;

    private InsightsService service;
    private User founder;
    private Startup startup;

    @BeforeEach
    void setUp() {
        service = new InsightsService(firmAccessPolicy, vcMembers, startupMembers, profileViews, wishlist, requests,
                conversations, investments, commitments, Clock.fixed(Instant.parse("2026-11-07T10:00:00Z"), ZoneOffset.UTC));
        founder = User.builder().email("founder@ledgerly.in").build();
        founder.setId(UUID.randomUUID());
        startup = Startup.builder().name("Ledgerly").build();
        startup.setId(UUID.randomUUID());
        StartupMember seat = StartupMember.builder().user(founder).startup(startup).role(StartupRole.FOUNDER).build();
        when(firmAccessPolicy.findMembership(founder)).thenReturn(Optional.empty());
        when(startupMembers.findByUserId(founder.getId())).thenReturn(Optional.of(seat));
        when(startupMembers.findByStartupIdOrderByJoinedAtAsc(startup.getId())).thenReturn(List.of(seat));
    }

    private static FundingCommitment pledge(String firmName, String sector, long amount, CommitmentStatus status) {
        VCFirm firm = VCFirm.builder().name(firmName).sectors(new ArrayList<>(List.of(sector))).build();
        firm.setId(UUID.randomUUID());
        return FundingCommitment.builder().vcFirm(firm).amount(amount).currency("INR").status(status).build();
    }

    @Test
    void a_founders_raised_figure_and_backer_count_only_include_signed_pledges() {
        // ₹6 Cr signed, ₹4 Cr soft, ₹2.5 Cr indicated: the old page called that "₹12.5 Cr raised by 3 investors".
        when(commitments.findLiveForStartup(startup.getId())).thenReturn(List.of(
                pledge("Meridian", "Fintech", 60_000_000L, CommitmentStatus.COMMITTED),
                pledge("Kestrel", "SaaS", 40_000_000L, CommitmentStatus.SOFT_COMMITTED),
                pledge("Bay Harbour", "Fintech", 25_000_000L, CommitmentStatus.INDICATED)));

        Insights insights = service.forUser(founder);

        assertThat(insights.totalAmount()).isEqualTo(60_000_000L);
        assertThat(insights.entityCount()).isEqualTo(1);
        assertThat(insights.sectorBreakdown()).extracting(Insights.SectorSlice::sector).containsExactly("Fintech");
        assertThat(insights.sectorBreakdown().get(0).amount()).isEqualTo(60_000_000L);
    }

    @Test
    void the_funnel_still_shows_every_live_pledge_as_interest() {
        when(commitments.findLiveForStartup(startup.getId())).thenReturn(List.of(
                pledge("Meridian", "Fintech", 60_000_000L, CommitmentStatus.COMMITTED),
                pledge("Kestrel", "SaaS", 40_000_000L, CommitmentStatus.SOFT_COMMITTED)));

        Insights insights = service.forUser(founder);

        assertThat(insights.funnel()).last().extracting(Insights.FunnelStage::count).isEqualTo(2L);
    }

    @Test
    void with_nothing_signed_the_founder_sees_zero_raised() {
        when(commitments.findLiveForStartup(startup.getId())).thenReturn(List.of(
                pledge("Kestrel", "SaaS", 40_000_000L, CommitmentStatus.INDICATED)));

        Insights insights = service.forUser(founder);

        assertThat(insights.totalAmount()).isZero();
        assertThat(insights.entityCount()).isZero();
        assertThat(insights.currency()).isEqualTo("INR");
    }
}
