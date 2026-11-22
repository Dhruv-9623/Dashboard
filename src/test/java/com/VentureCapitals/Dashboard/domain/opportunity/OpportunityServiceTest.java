package com.VentureCapitals.Dashboard.domain.opportunity;

import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;
import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.common.exception.ValidationException;
import com.VentureCapitals.Dashboard.domain.ai.HeuristicAIService;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmThesis;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmThesisRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OpportunityServiceTest {
    @Mock private OpportunityRepository opportunities;
    @Mock private VCFirmThesisRepository theses;
    @Mock private VCMemberRepository vcMembers;

    private OpportunityService service;
    private User actor;
    private VCFirm firm;

    @BeforeEach
    void setUp() {
        service = new OpportunityService(opportunities, theses, new FirmAccessPolicy(vcMembers), new HeuristicAIService());
        actor = User.builder().email("pm@meridian.vc").userType(UserType.VC).build();
        actor.setId(UUID.randomUUID());
        firm = VCFirm.builder().name("Meridian").build();
        firm.setId(UUID.randomUUID());
    }

    private void actorIs(VCRole role) {
        lenient().when(vcMembers.findByUserId(actor.getId())).thenReturn(Optional.of(
                VCMember.builder().user(actor).firm(firm).role(role).joinedAt(Instant.now()).build()));
    }

    private void firmHasThesis() {
        VCFirmThesis thesis = VCFirmThesis.builder().vcFirm(firm).currency("INR").build();
        thesis.getSectors().add("Fintech");
        thesis.getStages().add("SEED");
        when(theses.findByVcFirmId(firm.getId())).thenReturn(Optional.of(thesis));
    }

    private static CreateOpportunityRequest request() {
        return CreateOpportunityRequest.builder().companyName(" Acme ").sector("Fintech").stage("SEED")
                .currency("INR").askAmount(50_000_000L).build();
    }

    private Opportunity stored(OpportunityStatus status) {
        Opportunity o = Opportunity.builder().vcFirm(firm).companyName("Acme").sector("Fintech").stage("SEED")
                .currency("INR").status(status).build();
        o.setId(UUID.randomUUID());
        when(opportunities.findWithFirmById(o.getId())).thenReturn(Optional.of(o));
        return o;
    }

    @Test
    void a_new_opportunity_is_scored_immediately_and_waits_for_a_decision() {
        actorIs(VCRole.STAFF);
        firmHasThesis();
        when(opportunities.save(any())).thenAnswer(call -> call.getArgument(0));

        Opportunity saved = service.create(actor, request());

        assertThat(saved.getCompanyName()).isEqualTo("Acme");
        assertThat(saved.getFitScore()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(OpportunityStatus.PENDING_REVIEW);
        assertThat(saved.getCitations()).isNotEmpty();
        assertThat(saved.getScoredAt()).isNotNull();
    }

    @Test
    void with_no_thesis_the_opportunity_is_logged_unscored_and_says_why() {
        actorIs(VCRole.OWNER);
        when(theses.findByVcFirmId(firm.getId())).thenReturn(Optional.empty());
        when(opportunities.save(any())).thenAnswer(call -> call.getArgument(0));

        Opportunity saved = service.create(actor, request());

        assertThat(saved.getFitScore()).isNull();
        assertThat(saved.getRationale()).contains("thesis");
        assertThat(saved.getRecommendedAction()).isEqualTo(RecommendedAction.NEEDS_MORE_INFO);
    }

    @Test
    void staff_can_log_an_opportunity_but_not_decide_on_one() {
        actorIs(VCRole.STAFF);
        Opportunity pending = stored(OpportunityStatus.PENDING_REVIEW);

        assertThatThrownBy(() -> service.decide(actor, pending.getId(),
                new DecideOpportunityRequest(OpportunityStatus.APPROVED, null)))
                .isInstanceOf(UnauthorizedException.class);
        verify(opportunities, never()).save(any());
    }

    @Test
    void a_portfolio_manager_can_approve_and_the_note_is_kept() {
        actorIs(VCRole.PORTFOLIO_MANAGER);
        Opportunity pending = stored(OpportunityStatus.PENDING_REVIEW);
        when(opportunities.save(any())).thenAnswer(call -> call.getArgument(0));

        Opportunity decided = service.decide(actor, pending.getId(),
                new DecideOpportunityRequest(OpportunityStatus.APPROVED, " strong team "));

        assertThat(decided.getStatus()).isEqualTo(OpportunityStatus.APPROVED);
        assertThat(decided.getDecisionNote()).isEqualTo("strong team");
    }

    @Test
    void the_system_states_are_not_decisions() {
        actorIs(VCRole.OWNER);
        Opportunity pending = stored(OpportunityStatus.PENDING_REVIEW);

        assertThatThrownBy(() -> service.decide(actor, pending.getId(),
                new DecideOpportunityRequest(OpportunityStatus.SCORING, null)))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void nothing_can_be_decided_while_it_is_still_being_scored() {
        actorIs(VCRole.OWNER);
        Opportunity scoring = stored(OpportunityStatus.SCORING);

        assertThatThrownBy(() -> service.decide(actor, scoring.getId(),
                new DecideOpportunityRequest(OpportunityStatus.REJECTED, null)))
                .isInstanceOf(BusinessRuleViolationException.class);
    }

    @Test
    void another_firms_opportunity_is_a_not_found_never_a_forbidden() {
        actorIs(VCRole.OWNER);
        VCFirm rival = VCFirm.builder().name("Rival").build();
        rival.setId(UUID.randomUUID());
        Opportunity theirs = Opportunity.builder().vcFirm(rival).companyName("Secret").sector("x").stage("SEED")
                .currency("INR").status(OpportunityStatus.PENDING_REVIEW).build();
        theirs.setId(UUID.randomUUID());
        when(opportunities.findWithFirmById(theirs.getId())).thenReturn(Optional.of(theirs));

        assertThatThrownBy(() -> service.get(actor, theirs.getId())).isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> service.rescore(actor, theirs.getId())).isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void rescoring_refreshes_the_score_but_leaves_a_decision_alone() {
        actorIs(VCRole.OWNER);
        firmHasThesis();
        Opportunity approved = stored(OpportunityStatus.APPROVED);
        when(opportunities.save(any())).thenAnswer(call -> call.getArgument(0));

        Opportunity rescored = service.rescore(actor, approved.getId());

        assertThat(rescored.getStatus()).isEqualTo(OpportunityStatus.APPROVED);
        assertThat(rescored.getFitScore()).isNotNull();
    }
}
