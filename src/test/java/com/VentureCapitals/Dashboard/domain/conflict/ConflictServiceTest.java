package com.VentureCapitals.Dashboard.domain.conflict;

import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.domain.ai.HeuristicAIService;
import com.VentureCapitals.Dashboard.domain.investment.Investment;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRepository;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentStatus;
import com.VentureCapitals.Dashboard.domain.opportunity.Opportunity;
import com.VentureCapitals.Dashboard.domain.opportunity.OpportunityRepository;
import com.VentureCapitals.Dashboard.domain.opportunity.OpportunityStatus;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupStage;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConflictServiceTest {
    @Mock private ConflictReportRepository reports;
    @Mock private OpportunityRepository opportunities;
    @Mock private InvestmentRepository investments;
    @Mock private VCMemberRepository vcMembers;

    private ConflictService service;
    private User actor;
    private VCFirm firm;
    private Opportunity opportunity;

    @BeforeEach
    void setUp() {
        service = new ConflictService(reports, opportunities, investments, new FirmAccessPolicy(vcMembers), new HeuristicAIService());
        actor = User.builder().email("staff@meridian.vc").userType(UserType.VC).build();
        actor.setId(UUID.randomUUID());
        firm = VCFirm.builder().name("Meridian").build();
        firm.setId(UUID.randomUUID());
        when(vcMembers.findByUserId(actor.getId())).thenReturn(Optional.of(
                VCMember.builder().user(actor).firm(firm).role(VCRole.STAFF).joinedAt(Instant.now()).build()));

        opportunity = Opportunity.builder().vcFirm(firm).companyName("Newco").sector("Fintech").stage("SEED")
                .currency("INR").description("Reconciliation for mid-market finance teams.")
                .status(OpportunityStatus.PENDING_REVIEW).build();
        opportunity.setId(UUID.randomUUID());
    }

    private Investment holding(String name, String sector) {
        Startup startup = Startup.builder().name(name).sector(sector).stage(StartupStage.SERIES_A)
                .description("Reconciliation for mid-market finance teams.").build();
        startup.setId(UUID.randomUUID());
        return Investment.builder().startup(startup).vcFirm(firm).amount(1L).currency("INR")
                .status(InvestmentStatus.ACTIVE).build();
    }

    @Test
    void any_member_can_run_a_check_and_it_compares_against_active_holdings() {
        when(opportunities.findWithFirmById(opportunity.getId())).thenReturn(Optional.of(opportunity));
        when(investments.findByVcFirmIdAndStatus(firm.getId(), InvestmentStatus.ACTIVE))
                .thenReturn(List.of(holding("Ledgerly", "Fintech"), holding("Shiprack", "Logistics")));
        when(reports.findByOpportunityId(opportunity.getId())).thenReturn(Optional.empty());
        when(reports.save(any())).thenAnswer(call -> call.getArgument(0));

        ConflictReport report = service.run(actor, opportunity.getId());

        assertThat(report.getComparedCompanyCount()).isEqualTo(2);
        assertThat(report.getDimensions()).hasSize(3);
        assertThat(report.getDimensions().get(0).getPosition()).isZero();
        assertThat(report.getOverallConfidence().doubleValue()).isPositive();
    }

    @Test
    void several_cheques_into_one_company_are_one_company_to_compare_against() {
        Investment first = holding("Ledgerly", "Fintech");
        Investment followOn = Investment.builder().startup(first.getStartup()).vcFirm(firm).amount(2L)
                .currency("INR").status(InvestmentStatus.ACTIVE).build();
        when(opportunities.findWithFirmById(opportunity.getId())).thenReturn(Optional.of(opportunity));
        when(investments.findByVcFirmIdAndStatus(firm.getId(), InvestmentStatus.ACTIVE)).thenReturn(List.of(first, followOn));
        when(reports.findByOpportunityId(opportunity.getId())).thenReturn(Optional.empty());
        when(reports.save(any())).thenAnswer(call -> call.getArgument(0));

        assertThat(service.run(actor, opportunity.getId()).getComparedCompanyCount()).isEqualTo(1);
    }

    @Test
    void running_it_again_updates_the_same_report_rather_than_adding_a_second() {
        ConflictReport existing = ConflictReport.builder().opportunity(opportunity).vcFirm(firm)
                .overallConfidence(java.math.BigDecimal.valueOf(0.9)).generatedAt(Instant.parse("2026-01-01T00:00:00Z")).build();
        existing.setId(UUID.randomUUID());
        existing.getDimensions().add(ConflictDimension.builder().report(existing).position(0)
                .dimension(ConflictDimensionType.SECTOR_OVERLAP).confidence(java.math.BigDecimal.ONE).summary("old").build());
        when(opportunities.findWithFirmById(opportunity.getId())).thenReturn(Optional.of(opportunity));
        when(investments.findByVcFirmIdAndStatus(firm.getId(), InvestmentStatus.ACTIVE)).thenReturn(List.of());
        when(reports.findByOpportunityId(opportunity.getId())).thenReturn(Optional.of(existing));
        when(reports.save(any())).thenAnswer(call -> call.getArgument(0));

        ConflictReport report = service.run(actor, opportunity.getId());

        // The unique key on opportunity_id would refuse a second row; updating in place is the design.
        assertThat(report).isSameAs(existing);
        assertThat(report.getDimensions()).hasSize(3).noneMatch(d -> d.getSummary().equals("old"));
        assertThat(report.getGeneratedAt()).isAfter(Instant.parse("2026-01-01T00:00:00Z"));
        assertThat(report.getOverallConfidence().doubleValue()).isZero();
    }

    @Test
    void asking_for_a_report_that_was_never_run_is_empty_not_an_error() {
        when(opportunities.findWithFirmById(opportunity.getId())).thenReturn(Optional.of(opportunity));
        when(reports.findByOpportunityId(opportunity.getId())).thenReturn(Optional.empty());

        assertThat(service.forOpportunity(actor, opportunity.getId())).isEmpty();
    }

    @Test
    void another_firms_opportunity_cannot_be_checked_or_read() {
        VCFirm rival = VCFirm.builder().name("Rival").build();
        rival.setId(UUID.randomUUID());
        Opportunity theirs = Opportunity.builder().vcFirm(rival).companyName("Secret").build();
        theirs.setId(UUID.randomUUID());
        when(opportunities.findWithFirmById(theirs.getId())).thenReturn(Optional.of(theirs));

        assertThatThrownBy(() -> service.run(actor, theirs.getId())).isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> service.forOpportunity(actor, theirs.getId())).isInstanceOf(EntityNotFoundException.class);
    }
}
