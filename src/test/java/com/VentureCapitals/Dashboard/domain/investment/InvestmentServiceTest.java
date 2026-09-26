package com.VentureCapitals.Dashboard.domain.investment;

import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.config.BaseUnitTest;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCRole;
import com.VentureCapitals.Dashboard.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class InvestmentServiceTest extends BaseUnitTest {

    @Mock
    private InvestmentRepository investmentRepository;
    @Mock
    private StartupRepository startupRepository;
    @Mock
    private VCMemberRepository vcMemberRepository;

    private InvestmentService service;
    private User actor;
    private VCFirm firm;

    @BeforeEach
    @Override
    public void setUp() {
        service = new InvestmentService(investmentRepository, startupRepository, new FirmAccessPolicy(vcMemberRepository));
        actor = TestDataBuilder.user().withId(UUID.randomUUID()).withUserType(UserType.VC).build();
        firm = TestDataBuilder.vcFirm().build();
        firm.setId(UUID.randomUUID());
    }

    private void actorIs(VCRole role, VCFirm ofFirm) {
        when(vcMemberRepository.findByUserId(actor.getId()))
                .thenReturn(Optional.of(VCMember.builder().user(actor).firm(ofFirm).role(role).build()));
    }

    private static InvestmentRequest request(UUID startupId) {
        return InvestmentRequest.builder().startupId(startupId).investmentDate(LocalDate.now().minusDays(1))
                .amount(10_000_000L).currency("INR").round(InvestmentRound.SEED).build();
    }

    @Test
    void portfolio_manager_creates_investment_for_own_firm_defaulting_to_active() {
        actorIs(VCRole.PORTFOLIO_MANAGER, firm);
        Startup startup = Startup.builder().name("Lumen").build();
        startup.setId(UUID.randomUUID());
        when(startupRepository.findById(startup.getId())).thenReturn(Optional.of(startup));
        when(investmentRepository.save(any(Investment.class))).thenAnswer(inv -> inv.getArgument(0));

        Investment created = service.createInvestment(actor, request(startup.getId()));

        assertThat(created.getVcFirm()).isSameAs(firm);
        assertThat(created.getStatus()).isEqualTo(InvestmentStatus.ACTIVE);
        assertThat(created.getAmount()).isEqualTo(10_000_000L);
    }

    @Test
    void staff_cannot_create_investments() {
        actorIs(VCRole.STAFF, firm);

        assertThatThrownBy(() -> service.createInvestment(actor, request(UUID.randomUUID())))
                .isInstanceOf(UnauthorizedException.class);
        verify(investmentRepository, never()).save(any());
    }

    @Test
    void reading_another_firms_investment_is_forbidden() {
        actorIs(VCRole.OWNER, firm);
        VCFirm otherFirm = TestDataBuilder.vcFirm().build();
        otherFirm.setId(UUID.randomUUID());
        Investment theirs = Investment.builder().vcFirm(otherFirm).startup(new Startup()).build();
        theirs.setId(UUID.randomUUID());
        when(investmentRepository.findWithStartupById(theirs.getId())).thenReturn(Optional.of(theirs));

        assertThatThrownBy(() -> service.getInvestment(actor, theirs.getId()))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void list_is_scoped_to_the_actors_firm() {
        actorIs(VCRole.STAFF, firm);
        Pageable pageable = Pageable.ofSize(20);

        service.listInvestments(actor, null, pageable);

        verify(investmentRepository).findByVcFirmId(firm.getId(), pageable);
    }

    @Test
    void summary_keeps_currencies_separate_and_counts_statuses() {
        actorIs(VCRole.STAFF, firm);
        var inr = mock(InvestmentRepository.CurrencyTotal.class);
        when(inr.getCurrency()).thenReturn("INR");
        when(inr.getTotal()).thenReturn(350_000_000L);
        var usd = mock(InvestmentRepository.CurrencyTotal.class);
        when(usd.getCurrency()).thenReturn("USD");
        when(usd.getTotal()).thenReturn(2_000_000L);
        when(investmentRepository.sumAmountByCurrency(firm.getId())).thenReturn(List.of(inr, usd));
        var active = mock(InvestmentRepository.StatusCount.class);
        when(active.getStatus()).thenReturn(InvestmentStatus.ACTIVE);
        when(active.getCount()).thenReturn(4L);
        var exited = mock(InvestmentRepository.StatusCount.class);
        when(exited.getStatus()).thenReturn(InvestmentStatus.EXITED);
        when(exited.getCount()).thenReturn(1L);
        when(investmentRepository.countByStatus(firm.getId())).thenReturn(List.of(active, exited));

        InvestmentSummary summary = service.summarize(actor);

        assertThat(summary.getTotalsByCurrency()).containsEntry("INR", 350_000_000L).containsEntry("USD", 2_000_000L);
        assertThat(summary.getTotalCount()).isEqualTo(5);
        assertThat(summary.getActiveCount()).isEqualTo(4);
        assertThat(summary.getExitedCount()).isEqualTo(1);
        assertThat(summary.getWrittenOffCount()).isZero();
    }
}
