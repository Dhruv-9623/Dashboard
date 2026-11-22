package com.VentureCapitals.Dashboard.domain.suggestion;

import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;
import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.domain.ai.HeuristicAIService;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycleRepository;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRepository;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupMember;
import com.VentureCapitals.Dashboard.domain.startup.StartupMemberRepository;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.startup.StartupRole;
import com.VentureCapitals.Dashboard.domain.startup.StartupStage;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmThesisRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SuggestionServiceTest {
    @Mock private AISuggestionRepository suggestions;
    @Mock private StartupRepository startups;
    @Mock private VCFirmRepository firms;
    @Mock private VCFirmThesisRepository theses;
    @Mock private FundingCycleRepository cycles;
    @Mock private InvestmentRepository investments;
    @Mock private StartupMemberRepository startupMembers;
    @Mock private VCMemberRepository vcMembers;

    private SuggestionService service;
    private User investor;
    private VCFirm firm;

    @BeforeEach
    void setUp() {
        service = new SuggestionService(suggestions, startups, firms, theses, cycles, investments, startupMembers,
                new FirmAccessPolicy(vcMembers), new HeuristicAIService());
        investor = User.builder().email("owner@meridian.vc").userType(UserType.VC).build();
        investor.setId(UUID.randomUUID());
        firm = VCFirm.builder().name("Meridian").sectors(List.of("Fintech")).investmentStage("Seed").build();
        firm.setId(UUID.randomUUID());
    }

    private void investorIsMember() {
        when(vcMembers.findByUserId(investor.getId())).thenReturn(Optional.of(
                VCMember.builder().user(investor).firm(firm).role(VCRole.OWNER).joinedAt(Instant.now()).build()));
    }

    private Startup startup(String name, String sector, StartupStage stage) {
        Startup startup = Startup.builder().name(name).sector(sector).stage(stage).build();
        startup.setId(UUID.randomUUID());
        return startup;
    }

    private AISuggestion row(User user, UUID target, SuggestionStatus status) {
        AISuggestion s = AISuggestion.builder().forUserId(user.getId()).suggestionType(SuggestionType.STARTUP_FOR_VC)
                .targetId(target).score(BigDecimal.valueOf(0.5)).reasoning("old").status(status)
                .generatedAt(Instant.parse("2026-01-01T00:00:00Z")).build();
        s.setId(UUID.randomUUID());
        return s;
    }

    private void poolOf(Startup... pool) {
        Page<Startup> page = new PageImpl<>(List.of(pool));
        when(startups.findAll(any(org.springframework.data.domain.Pageable.class))).thenReturn(page);
        when(investments.findStartupIdsByFirm(firm.getId())).thenReturn(Set.of());
        when(cycles.findAllOpen()).thenReturn(List.of());
        when(theses.findByVcFirmId(firm.getId())).thenReturn(Optional.empty());
    }

    @Test
    void an_investor_is_offered_startups_that_fit_the_profile_it_already_has_when_there_is_no_thesis() {
        investorIsMember();
        Startup fit = startup("Fit", "Fintech", StartupStage.SEED);
        Startup miss = startup("Miss", "Gaming", StartupStage.GROWTH);
        poolOf(fit, miss);
        when(suggestions.findByForUserId(investor.getId())).thenReturn(List.of());

        service.regenerate(investor);

        ArgumentCaptor<AISuggestion> saved = ArgumentCaptor.forClass(AISuggestion.class);
        verify(suggestions).save(saved.capture());
        assertThat(saved.getValue().getTargetId()).isEqualTo(fit.getId());
        assertThat(saved.getValue().getSuggestionType()).isEqualTo(SuggestionType.STARTUP_FOR_VC);
        assertThat(saved.getValue().getStatus()).isEqualTo(SuggestionStatus.PENDING);
        assertThat(saved.getValue().getReasoning()).contains("Fintech");
    }

    @Test
    void a_company_the_firm_already_backs_is_never_suggested() {
        investorIsMember();
        Startup backed = startup("Backed", "Fintech", StartupStage.SEED);
        poolOf(backed);
        when(investments.findStartupIdsByFirm(firm.getId())).thenReturn(Set.of(backed.getId()));
        when(suggestions.findByForUserId(investor.getId())).thenReturn(List.of());

        service.regenerate(investor);

        verify(suggestions, never()).save(any());
    }

    @Test
    void regenerating_never_brings_back_something_the_person_dismissed() {
        investorIsMember();
        Startup fit = startup("Fit", "Fintech", StartupStage.SEED);
        poolOf(fit);
        AISuggestion dismissed = row(investor, fit.getId(), SuggestionStatus.DISMISSED);
        when(suggestions.findByForUserId(investor.getId())).thenReturn(List.of(dismissed));

        service.regenerate(investor);

        assertThat(dismissed.getStatus()).isEqualTo(SuggestionStatus.DISMISSED);
        verify(suggestions, never()).save(any());
        verify(suggestions, never()).delete(any());
    }

    @Test
    void an_open_suggestion_is_refreshed_in_place_rather_than_duplicated() {
        investorIsMember();
        Startup fit = startup("Fit", "Fintech", StartupStage.SEED);
        poolOf(fit);
        AISuggestion open = row(investor, fit.getId(), SuggestionStatus.PENDING);
        when(suggestions.findByForUserId(investor.getId())).thenReturn(List.of(open));
        when(suggestions.save(any())).thenAnswer(call -> call.getArgument(0));

        service.regenerate(investor);

        assertThat(open.getReasoning()).isNotEqualTo("old");
        assertThat(open.getGeneratedAt()).isAfter(Instant.parse("2026-01-01T00:00:00Z"));
        verify(suggestions, times(1)).save(open);
    }

    @Test
    void an_open_suggestion_that_no_longer_fits_is_dropped_but_a_decided_one_stays() {
        investorIsMember();
        poolOf(startup("Other", "Fintech", StartupStage.SEED));
        AISuggestion stale = row(investor, UUID.randomUUID(), SuggestionStatus.PENDING);
        AISuggestion actioned = row(investor, UUID.randomUUID(), SuggestionStatus.ACTIONED);
        when(suggestions.findByForUserId(investor.getId())).thenReturn(List.of(stale, actioned));
        when(suggestions.save(any())).thenAnswer(call -> call.getArgument(0));

        service.regenerate(investor);

        verify(suggestions).delete(stale);
        verify(suggestions, never()).delete(actioned);
    }

    @Test
    void a_person_with_no_organisation_is_asked_to_finish_setting_up() {
        when(vcMembers.findByUserId(investor.getId())).thenReturn(Optional.empty());
        when(startupMembers.findByUserId(investor.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.regenerate(investor)).isInstanceOf(BusinessRuleViolationException.class);
    }

    @Test
    void a_founder_is_offered_investors_whose_focus_matches_the_company() {
        User founder = User.builder().email("founder@lumen.health").userType(UserType.STARTUP).build();
        founder.setId(UUID.randomUUID());
        Startup lumen = startup("Lumen", "Fintech", StartupStage.SEED);
        when(vcMembers.findByUserId(founder.getId())).thenReturn(Optional.empty());
        when(startupMembers.findByUserId(founder.getId())).thenReturn(Optional.of(
                StartupMember.builder().user(founder).startup(lumen).role(StartupRole.FOUNDER).joinedAt(Instant.now()).build()));
        when(cycles.findAllOpen()).thenReturn(List.of());
        when(theses.findAll()).thenReturn(List.of());
        when(firms.findAll(any(org.springframework.data.domain.Pageable.class))).thenReturn(new PageImpl<>(List.of(firm)));
        when(suggestions.findByForUserId(founder.getId())).thenReturn(List.of());

        service.regenerate(founder);

        ArgumentCaptor<AISuggestion> saved = ArgumentCaptor.forClass(AISuggestion.class);
        verify(suggestions).save(saved.capture());
        assertThat(saved.getValue().getSuggestionType()).isEqualTo(SuggestionType.VC_FOR_STARTUP);
        assertThat(saved.getValue().getTargetId()).isEqualTo(firm.getId());
    }

    @Test
    void someone_elses_suggestion_is_not_found() {
        UUID id = UUID.randomUUID();
        when(suggestions.findByIdAndForUserId(id, investor.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.setStatus(investor, id, SuggestionStatus.DISMISSED))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void the_list_puts_open_suggestions_first_and_best_first() {
        Startup a = startup("A", "Fintech", StartupStage.SEED);
        Startup b = startup("B", "Fintech", StartupStage.SEED);
        Startup c = startup("C", "Fintech", StartupStage.SEED);
        AISuggestion decidedHigh = row(investor, a.getId(), SuggestionStatus.ACTIONED);
        decidedHigh.setScore(BigDecimal.valueOf(0.99));
        AISuggestion openLow = row(investor, b.getId(), SuggestionStatus.PENDING);
        openLow.setScore(BigDecimal.valueOf(0.4));
        AISuggestion openHigh = row(investor, c.getId(), SuggestionStatus.PENDING);
        openHigh.setScore(BigDecimal.valueOf(0.8));
        when(suggestions.findByForUserId(investor.getId())).thenReturn(List.of(decidedHigh, openLow, openHigh));
        when(startups.findAllById(any())).thenReturn(List.of(a, b, c));
        when(firms.findAllById(any())).thenReturn(List.of());

        assertThat(service.list(investor)).extracting(SuggestionView::name).containsExactly("C", "B", "A");
    }
}
