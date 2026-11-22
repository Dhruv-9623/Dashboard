package com.VentureCapitals.Dashboard.domain.digest;

import com.VentureCapitals.Dashboard.domain.ai.AIService;
import com.VentureCapitals.Dashboard.domain.ai.DigestDraft;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitmentRepository;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycleRepository;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRepository;
import com.VentureCapitals.Dashboard.domain.signals.SignalRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DigestServiceTest {
    private static final Instant NOW = Instant.parse("2026-11-07T10:00:00Z");

    @Mock private DigestRepository digests;
    @Mock private InvestmentRepository investments;
    @Mock private FundingCycleRepository cycles;
    @Mock private FundingCommitmentRepository commitments;
    @Mock private SignalRepository signals;
    @Mock private FirmAccessPolicy firmAccessPolicy;
    @Mock private AIService ai;

    private DigestService service;
    private User actor;
    private VCFirm firm;

    @BeforeEach
    void setUp() {
        service = new DigestService(digests, investments, cycles, commitments, signals, firmAccessPolicy, ai,
                Clock.fixed(NOW, ZoneOffset.UTC));
        actor = User.builder().email("owner@meridian.vc").build();
        actor.setId(UUID.randomUUID());
        firm = VCFirm.builder().name("Meridian Ventures").build();
        firm.setId(UUID.randomUUID());
        lenient().when(firmAccessPolicy.requireAnyMembership(actor)).thenReturn(VCMember.builder().firm(firm).user(actor).build());
        lenient().when(ai.composeDigest(any())).thenReturn(new DigestDraft("summary", List.of()));
        lenient().when(digests.save(any(Digest.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void generating_twice_on_one_day_replaces_the_days_digest_instead_of_adding_a_second() {
        Digest earlier = Digest.builder().vcFirm(firm).periodStart(LocalDate.of(2026, 10, 8))
                .periodEnd(LocalDate.of(2026, 11, 7)).summaryMarkdown("old").companyCount(0).build();
        when(digests.findByVcFirmIdAndPeriodEnd(firm.getId(), LocalDate.of(2026, 11, 7))).thenReturn(List.of(earlier));

        Digest fresh = service.generate(actor);

        // The old one has to be gone before the new one is written, or the unique index would refuse it.
        var order = inOrder(digests);
        order.verify(digests).deleteAll(List.of(earlier));
        order.verify(digests).flush();
        order.verify(digests).save(fresh);
        assertThat(fresh.getSummaryMarkdown()).isEqualTo("summary");
    }

    @Test
    void the_first_digest_of_the_day_deletes_nothing() {
        when(digests.findByVcFirmIdAndPeriodEnd(eq(firm.getId()), any())).thenReturn(List.of());

        service.generate(actor);

        verify(digests, never()).deleteAll(any(Iterable.class));
    }

    @Test
    void round_names_read_as_words_not_as_identifiers() {
        assertThat(DigestService.roundLabel("SERIES_A")).isEqualTo("Series A");
        assertThat(DigestService.roundLabel("PRE_SEED")).isEqualTo("Pre Seed");
        assertThat(DigestService.roundLabel("SEED")).isEqualTo("Seed");
    }
}
