package com.VentureCapitals.Dashboard.domain.comparison;

import com.VentureCapitals.Dashboard.domain.funding.CommitmentStatus;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitment;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitmentRepository;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycle;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycleRepository;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycleStatus;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRound;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ComparisonServiceTest {
    @Mock private StartupRepository startups;
    @Mock private FundingCycleRepository cycles;
    @Mock private FundingCommitmentRepository commitments;

    private ComparisonService service;

    @BeforeEach
    void setUp() {
        service = new ComparisonService(startups, cycles, commitments);
    }

    private static Startup startup(String name) {
        Startup s = Startup.builder().name(name).sector("Fintech").build();
        s.setId(UUID.randomUUID());
        return s;
    }

    private static FundingCycle openRound(Startup s) {
        FundingCycle c = FundingCycle.builder().startup(s).roundType(InvestmentRound.SERIES_A).targetAmount(1L)
                .currency("INR").status(FundingCycleStatus.OPEN).openedAt(Instant.now()).build();
        c.setId(UUID.randomUUID());
        return c;
    }

    private static FundingCommitment pledge(FundingCycle cycle, VCFirm firm, long amount, CommitmentStatus status) {
        return FundingCommitment.builder().fundingCycle(cycle).vcFirm(firm).amount(amount).currency("INR")
                .status(status).committedAt(Instant.now()).build();
    }

    private static VCFirm firm() {
        VCFirm f = VCFirm.builder().name("F").build();
        f.setId(UUID.randomUUID());
        return f;
    }

    @Test
    void rows_come_back_in_the_order_asked_and_unknown_ids_are_left_out() {
        Startup a = startup("A");
        Startup b = startup("B");
        when(startups.findAllById(any())).thenReturn(List.of(b, a));
        when(cycles.findOpenAmong(any())).thenReturn(List.of());
        when(commitments.findLiveOnOpenRounds(any())).thenReturn(List.of());

        List<ComparisonRow> rows = service.compare(List.of(a.getId(), UUID.randomUUID(), b.getId()));

        assertThat(rows).extracting(r -> r.startup().getName()).containsExactly("A", "B");
    }

    @Test
    void only_signed_money_on_the_open_round_counts_and_investors_include_every_live_band() {
        Startup a = startup("A");
        FundingCycle round = openRound(a);
        when(startups.findAllById(any())).thenReturn(List.of(a));
        when(cycles.findOpenAmong(any())).thenReturn(List.of(round));
        when(commitments.findLiveOnOpenRounds(any())).thenReturn(List.of(
                pledge(round, firm(), 60_000_000L, CommitmentStatus.COMMITTED),
                pledge(round, firm(), 40_000_000L, CommitmentStatus.SOFT_COMMITTED),
                pledge(round, firm(), 25_000_000L, CommitmentStatus.INDICATED)));

        ComparisonRow row = service.compare(List.of(a.getId())).get(0);

        assertThat(row.raising()).isTrue();
        assertThat(row.openRound()).isEqualTo("SERIES_A");
        // Soft and indicated money is a conversation, not a figure to compare.
        assertThat(row.totalRaised()).isEqualTo(60_000_000L);
        assertThat(row.investorCount()).isEqualTo(3);
    }

    @Test
    void one_firm_with_two_rounds_open_cannot_exist_but_one_firm_counts_once() {
        Startup a = startup("A");
        FundingCycle round = openRound(a);
        VCFirm same = firm();
        when(startups.findAllById(any())).thenReturn(List.of(a));
        when(cycles.findOpenAmong(any())).thenReturn(List.of(round));
        when(commitments.findLiveOnOpenRounds(any())).thenReturn(List.of(
                pledge(round, same, 10L, CommitmentStatus.COMMITTED), pledge(round, same, 5L, CommitmentStatus.COMMITTED)));

        assertThat(service.compare(List.of(a.getId())).get(0).investorCount()).isEqualTo(1);
    }

    @Test
    void a_startup_with_no_open_round_has_no_money_to_compare() {
        Startup a = startup("A");
        when(startups.findAllById(any())).thenReturn(List.of(a));
        when(cycles.findOpenAmong(any())).thenReturn(List.of());
        when(commitments.findLiveOnOpenRounds(any())).thenReturn(List.of());

        ComparisonRow row = service.compare(List.of(a.getId())).get(0);

        // Closed rounds' pledges belong to the firms that took part (Business Rule 3), so they
        // are not summed here.
        assertThat(row.raising()).isFalse();
        assertThat(row.totalRaised()).isNull();
        assertThat(row.openRound()).isNull();
        assertThat(row.investorCount()).isZero();
    }
}
