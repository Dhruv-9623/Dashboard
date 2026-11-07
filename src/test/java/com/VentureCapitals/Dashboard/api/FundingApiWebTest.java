package com.VentureCapitals.Dashboard.api;

import com.VentureCapitals.Dashboard.api.funding.CommitmentController;
import com.VentureCapitals.Dashboard.api.funding.FundingController;
import com.VentureCapitals.Dashboard.config.SecurityConfig;
import com.VentureCapitals.Dashboard.domain.funding.BookSummary;
import com.VentureCapitals.Dashboard.domain.funding.CommitmentEvent;
import com.VentureCapitals.Dashboard.domain.funding.CommitmentStatus;
import com.VentureCapitals.Dashboard.domain.funding.CycleTotals;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitment;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycle;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycleStatus;
import com.VentureCapitals.Dashboard.domain.funding.FundingService;
import com.VentureCapitals.Dashboard.domain.investment.Investment;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRound;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupStage;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserRepository;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.security.AuthenticatedUserPrincipal;
import com.VentureCapitals.Dashboard.security.CustomOAuth2UserService;
import com.VentureCapitals.Dashboard.security.CustomOidcUserService;
import com.VentureCapitals.Dashboard.security.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** HTTP contract for the funding API: role gates, validation, and the JSON the frontend expects. */
@WebMvcTest(controllers = {FundingController.class, CommitmentController.class})
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
        "GOOGLE_CLIENT_ID=test", "GOOGLE_CLIENT_SECRET=test",
        "LINKEDIN_CLIENT_ID=test", "LINKEDIN_CLIENT_SECRET=test"
})
class FundingApiWebTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private FundingService fundingService;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private CustomOAuth2UserService customOAuth2UserService;
    @MockitoBean
    private CustomOidcUserService customOidcUserService;
    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    private static UsernamePasswordAuthenticationToken as(UserType type) {
        User user = User.builder().email("someone@example.com").userType(type).isActive(true).build();
        user.setId(UUID.randomUUID());
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(user, Map.of());
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }

    private static FundingCycle cycle() {
        Startup startup = Startup.builder().name("Ledgerly").sector("Fintech").stage(StartupStage.SEED).build();
        startup.setId(UUID.randomUUID());
        FundingCycle cycle = FundingCycle.builder()
                .startup(startup)
                .roundType(InvestmentRound.SEED)
                .targetAmount(50_000_000L)
                .currency("INR")
                .minTicketSize(2_000_000L)
                .status(FundingCycleStatus.OPEN)
                .openedAt(Instant.now())
                .build();
        cycle.setId(UUID.randomUUID());
        return cycle;
    }

    private static FundingCommitment commitment(FundingCycle cycle) {
        VCFirm firm = VCFirm.builder().name("Meridian Ventures").build();
        firm.setId(UUID.randomUUID());
        FundingCommitment commitment = FundingCommitment.builder()
                .fundingCycle(cycle).vcFirm(firm)
                .amount(5_000_000L).currency("INR")
                .status(CommitmentStatus.SOFT_COMMITTED)
                .committedAt(Instant.now())
                .build();
        commitment.setId(UUID.randomUUID());
        return commitment;
    }

    @Test
    void a_founders_rounds_come_back_with_the_bands_kept_apart() throws Exception {
        FundingCycle cycle = cycle();
        when(fundingService.listMine(any())).thenReturn(List.of(cycle));
        when(fundingService.totalsFor(anyList()))
                .thenReturn(Map.of(cycle.getId(), new CycleTotals(10_000_000L, 5_000_000L, 3_000_000L, 4)));

        mvc.perform(get("/api/funding-cycles").with(authentication(as(UserType.STARTUP))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].startupName").value("Ledgerly"))
                .andExpect(jsonPath("$.data[0].roundType").value("SEED"))
                .andExpect(jsonPath("$.data[0].committedAmount").value(10_000_000L))
                .andExpect(jsonPath("$.data[0].softCommittedAmount").value(5_000_000L))
                .andExpect(jsonPath("$.data[0].indicatedAmount").value(3_000_000L))
                .andExpect(jsonPath("$.data[0].commitmentCount").value(4));
    }

    @Test
    void a_vc_cannot_list_a_founders_own_rounds() throws Exception {
        mvc.perform(get("/api/funding-cycles").with(authentication(as(UserType.VC))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(fundingService);
    }

    @Test
    void deal_flow_is_paged_and_filterable() throws Exception {
        FundingCycle cycle = cycle();
        when(fundingService.listOpen(eq("Fintech"), eq(StartupStage.SEED), any()))
                .thenReturn(new PageImpl<>(List.of(cycle), PageRequest.of(0, 20), 1));
        when(fundingService.totalsFor(anyList())).thenReturn(Map.of(cycle.getId(), CycleTotals.EMPTY));

        mvc.perform(get("/api/funding-cycles/open")
                        .param("sector", "Fintech")
                        .param("stage", "SEED")
                        .with(authentication(as(UserType.VC))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].startupName").value("Ledgerly"))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.page").value(0));
    }

    @Test
    void a_founder_cannot_browse_the_whole_markets_deal_flow() throws Exception {
        mvc.perform(get("/api/funding-cycles/open").with(authentication(as(UserType.STARTUP))))
                .andExpect(status().isForbidden());
    }

    @Test
    void opening_a_round_answers_201_with_the_created_round() throws Exception {
        when(fundingService.createCycle(any(), any())).thenReturn(cycle());

        mvc.perform(post("/api/funding-cycles").with(csrf())
                        .with(authentication(as(UserType.STARTUP)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"roundType":"SEED","targetAmount":50000000,"currency":"INR","status":"OPEN"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("OPEN"));
    }

    @Test
    void a_round_with_no_target_and_a_bad_currency_comes_back_as_field_errors() throws Exception {
        mvc.perform(post("/api/funding-cycles").with(csrf())
                        .with(authentication(as(UserType.STARTUP)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"roundType":"SEED","currency":"rupees","status":"OPEN"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.targetAmount").exists())
                .andExpect(jsonPath("$.fieldErrors.currency").exists());
        verifyNoInteractions(fundingService);
    }

    @Test
    void a_negative_commitment_is_refused_before_it_reaches_the_service() throws Exception {
        mvc.perform(post("/api/funding-cycles/" + UUID.randomUUID() + "/commitments").with(csrf())
                        .with(authentication(as(UserType.VC)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"amount":-5,"currency":"INR","status":"COMMITTED"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.amount").exists());
        verifyNoInteractions(fundingService);
    }

    @Test
    void a_founder_cannot_pledge_against_a_round() throws Exception {
        mvc.perform(post("/api/funding-cycles/" + UUID.randomUUID() + "/commitments").with(csrf())
                        .with(authentication(as(UserType.STARTUP)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"amount":5000000,"currency":"INR","status":"COMMITTED"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void committing_answers_201_with_the_firms_name_on_it() throws Exception {
        FundingCycle cycle = cycle();
        when(fundingService.commit(any(), any(), any())).thenReturn(commitment(cycle));

        mvc.perform(post("/api/funding-cycles/" + cycle.getId() + "/commitments").with(csrf())
                        .with(authentication(as(UserType.VC)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"amount":5000000,"currency":"INR","status":"SOFT_COMMITTED"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.vcFirmName").value("Meridian Ventures"))
                .andExpect(jsonPath("$.data.status").value("SOFT_COMMITTED"));
    }

    @Test
    void moving_a_commitment_along_the_ladder_is_a_patch() throws Exception {
        FundingCommitment existing = commitment(cycle());
        when(fundingService.updateCommitmentStatus(any(), eq(existing.getId()), eq(CommitmentStatus.COMMITTED)))
                .thenReturn(existing);

        mvc.perform(patch("/api/commitments/" + existing.getId()).with(csrf())
                        .with(authentication(as(UserType.VC)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"COMMITTED"}
                                """))
                .andExpect(status().isOk());
    }

    @Test
    void a_founder_cannot_patch_someone_elses_commitment() throws Exception {
        mvc.perform(patch("/api/commitments/" + UUID.randomUUID()).with(csrf())
                        .with(authentication(as(UserType.STARTUP)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"COMMITTED"}
                                """))
                .andExpect(status().isForbidden());
        verifyNoInteractions(fundingService);
    }


    @Test
    void a_firm_sees_its_own_book_with_the_round_named_on_each_row() throws Exception {
        FundingCycle cycle = cycle();
        when(fundingService.listFirmCommitments(any(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(commitment(cycle)), PageRequest.of(0, 20), 1));

        mvc.perform(get("/api/commitments").with(authentication(as(UserType.VC))))
                .andExpect(status().isOk())
                // A pledge is only meaningful next to the company it was made to.
                .andExpect(jsonPath("$.data.items[0].startupName").value("Ledgerly"))
                .andExpect(jsonPath("$.data.items[0].roundType").value("SEED"))
                .andExpect(jsonPath("$.data.items[0].cycleStatus").value("OPEN"))
                .andExpect(jsonPath("$.data.items[0].status").value("SOFT_COMMITTED"))
                .andExpect(jsonPath("$.data.items[0].amount").value(5_000_000L))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    void the_book_takes_a_status_filter() throws Exception {
        when(fundingService.listFirmCommitments(any(), eq(CommitmentStatus.WITHDRAWN), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        mvc.perform(get("/api/commitments?status=WITHDRAWN").with(authentication(as(UserType.VC))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items").isEmpty());
    }

    @Test
    void a_founder_has_no_firm_book_to_read() throws Exception {
        mvc.perform(get("/api/commitments").with(authentication(as(UserType.STARTUP))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(fundingService);
    }

    @Test
    void withdrawing_is_the_same_patch_as_any_other_move() throws Exception {
        FundingCommitment withdrawn = commitment(cycle());
        withdrawn.setStatus(CommitmentStatus.WITHDRAWN);
        when(fundingService.updateCommitmentStatus(any(), any(), eq(CommitmentStatus.WITHDRAWN)))
                .thenReturn(withdrawn);

        mvc.perform(patch("/api/commitments/" + withdrawn.getId())
                        .with(authentication(as(UserType.VC))).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"WITHDRAWN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("WITHDRAWN"))
                // The amount stays on the record; only the totals stop counting it.
                .andExpect(jsonPath("$.data.amount").value(5_000_000L));
    }

    @Test
    void the_funding_api_is_closed_to_anonymous_callers() throws Exception {
        mvc.perform(get("/api/funding-cycles")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/funding-cycles/open")).andExpect(status().isUnauthorized());
    }

    @Test
    void the_book_summary_comes_back_as_four_figures() throws Exception {
        when(fundingService.summarizeFirmBook(any())).thenReturn(BookSummary.builder()
                .committedByCurrency(Map.of("INR", 60_000_000L))
                .likelyByCurrency(Map.of("INR", 100_000_000L))
                .liveCount(4)
                .readyToRecordCount(1)
                .build());

        mvc.perform(get("/api/commitments/summary").with(authentication(as(UserType.VC))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.committedByCurrency.INR").value(60_000_000L))
                .andExpect(jsonPath("$.data.likelyByCurrency.INR").value(100_000_000L))
                .andExpect(jsonPath("$.data.liveCount").value(4))
                .andExpect(jsonPath("$.data.readyToRecordCount").value(1));
    }

    @Test
    void a_founder_has_no_book_summary_to_read() throws Exception {
        mvc.perform(get("/api/commitments/summary").with(authentication(as(UserType.STARTUP))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(fundingService);
    }

    @Test
    void the_summary_route_is_not_mistaken_for_a_commitment_id() throws Exception {
        // `/api/commitments/{id}` is a PATCH and `/summary` is a GET, so they can't collide — but
        // asserting it means a later refactor that adds GET /{id} has to think about the order.
        when(fundingService.summarizeFirmBook(any())).thenReturn(BookSummary.EMPTY);

        mvc.perform(get("/api/commitments/summary").with(authentication(as(UserType.VC))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.liveCount").value(0));
    }

    // --- Round history ------------------------------------------------------------------------

    private static CommitmentEvent event(FundingCommitment commitment,
                                         CommitmentStatus from, Long fromAmount,
                                         CommitmentStatus to, long toAmount) {
        CommitmentEvent event = CommitmentEvent.builder()
                .commitment(commitment)
                .fundingCycle(commitment.getFundingCycle())
                .vcFirm(commitment.getVcFirm())
                .fromStatus(from).fromAmount(fromAmount)
                .toStatus(to).toAmount(toAmount)
                .currency("INR")
                .occurredAt(Instant.parse("2026-02-01T10:00:00Z"))
                .build();
        event.setId(UUID.randomUUID());
        return event;
    }

    @Test
    void a_rounds_history_carries_both_sides_of_every_move() throws Exception {
        FundingCycle cycle = cycle();
        FundingCommitment pledge = commitment(cycle);
        when(fundingService.listCycleHistory(any(), eq(cycle.getId()))).thenReturn(List.of(
                event(pledge, null, null, CommitmentStatus.INDICATED, 3_000_000L),
                event(pledge, CommitmentStatus.INDICATED, 3_000_000L, CommitmentStatus.COMMITTED, 5_000_000L)));

        mvc.perform(get("/api/funding-cycles/" + cycle.getId() + "/history")
                        .with(authentication(as(UserType.STARTUP))))
                .andExpect(status().isOk())
                // A null fromStatus is how the client recognises the pledge being made, so the
                // field has to survive serialisation rather than being dropped as empty.
                .andExpect(jsonPath("$.data[0].fromStatus").doesNotExist())
                .andExpect(jsonPath("$.data[0].toStatus").value("INDICATED"))
                .andExpect(jsonPath("$.data[0].toAmount").value(3_000_000L))
                .andExpect(jsonPath("$.data[1].fromStatus").value("INDICATED"))
                .andExpect(jsonPath("$.data[1].fromAmount").value(3_000_000L))
                .andExpect(jsonPath("$.data[1].toAmount").value(5_000_000L))
                .andExpect(jsonPath("$.data[1].vcFirmName").value("Meridian Ventures"));
    }

    @Test
    void both_sides_can_ask_for_a_rounds_history_and_the_service_decides_what_they_see()
            throws Exception {
        UUID cycleId = UUID.randomUUID();
        when(fundingService.listCycleHistory(any(), eq(cycleId))).thenReturn(List.of());

        // No role gate on the endpoint on purpose: a founder and an investor both legitimately
        // reach it and differ only in what comes back, which is the service's call.
        mvc.perform(get("/api/funding-cycles/" + cycleId + "/history")
                        .with(authentication(as(UserType.VC))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/funding-cycles/" + cycleId + "/history")
                        .with(authentication(as(UserType.STARTUP))))
                .andExpect(status().isOk());
    }

    @Test
    void history_is_closed_to_anonymous_callers() throws Exception {
        mvc.perform(get("/api/funding-cycles/" + UUID.randomUUID() + "/history"))
                .andExpect(status().isUnauthorized());
    }

    // --- Conversion ---------------------------------------------------------------------------

    @Test
    void converting_answers_201_and_links_the_investment_it_created() throws Exception {
        FundingCommitment pledge = commitment(cycle());
        pledge.setStatus(CommitmentStatus.COMMITTED);
        Investment investment = Investment.builder().build();
        investment.setId(UUID.randomUUID());
        pledge.setConvertedInvestment(investment);
        when(fundingService.convert(any(), eq(pledge.getId()), any())).thenReturn(pledge);

        mvc.perform(post("/api/commitments/" + pledge.getId() + "/convert").with(csrf())
                        .with(authentication(as(UserType.VC)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"equityPercentage":4.5,"notes":"Series A cheque cleared"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.convertedInvestmentId").value(investment.getId().toString()))
                // Still COMMITTED, so the round it belongs to still reads as funded.
                .andExpect(jsonPath("$.data.status").value("COMMITTED"));
    }

    @Test
    void converting_works_with_no_body_at_all() throws Exception {
        FundingCommitment pledge = commitment(cycle());
        when(fundingService.convert(any(), eq(pledge.getId()), any())).thenReturn(pledge);

        // Everything in the body is optional: the amount, currency and round already come from
        // the pledge, so a firm with no equity figure to hand can still record the cheque.
        mvc.perform(post("/api/commitments/" + pledge.getId() + "/convert").with(csrf())
                        .with(authentication(as(UserType.VC))))
                .andExpect(status().isCreated());
    }

    @Test
    void an_impossible_equity_figure_is_refused_before_it_reaches_the_service() throws Exception {
        mvc.perform(post("/api/commitments/" + UUID.randomUUID() + "/convert").with(csrf())
                        .with(authentication(as(UserType.VC)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"equityPercentage":140.0}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.equityPercentage").exists());
        verifyNoInteractions(fundingService);
    }

    @Test
    void a_future_investment_date_is_refused() throws Exception {
        mvc.perform(post("/api/commitments/" + UUID.randomUUID() + "/convert").with(csrf())
                        .with(authentication(as(UserType.VC)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"investmentDate":"2099-01-01"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.investmentDate").exists());
        verifyNoInteractions(fundingService);
    }

    @Test
    void a_founder_cannot_convert_a_pledge_into_someone_elses_portfolio() throws Exception {
        mvc.perform(post("/api/commitments/" + UUID.randomUUID() + "/convert").with(csrf())
                        .with(authentication(as(UserType.STARTUP)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(fundingService);
    }
}
