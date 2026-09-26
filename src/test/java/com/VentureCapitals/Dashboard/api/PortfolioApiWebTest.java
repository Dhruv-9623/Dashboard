package com.VentureCapitals.Dashboard.api;

import com.VentureCapitals.Dashboard.api.investment.InvestmentController;
import com.VentureCapitals.Dashboard.api.investment.InvestmentMapper;
import com.VentureCapitals.Dashboard.api.pool.PoolController;
import com.VentureCapitals.Dashboard.api.pool.PoolEntryMapper;
import com.VentureCapitals.Dashboard.api.startup.StartupController;
import com.VentureCapitals.Dashboard.api.startup.StartupMapper;
import com.VentureCapitals.Dashboard.config.SecurityConfig;
import com.VentureCapitals.Dashboard.domain.investment.Investment;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRound;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentService;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentStatus;
import com.VentureCapitals.Dashboard.domain.pool.PoolEntryService;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupService;
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
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** HTTP contract for the startup, investment and pool APIs: role gates, validation, JSON shape. */
@WebMvcTest(controllers = {StartupController.class, InvestmentController.class, PoolController.class})
@Import({SecurityConfig.class, StartupMapper.class, InvestmentMapper.class, PoolEntryMapper.class})
@TestPropertySource(properties = {
        "GOOGLE_CLIENT_ID=test", "GOOGLE_CLIENT_SECRET=test",
        "LINKEDIN_CLIENT_ID=test", "LINKEDIN_CLIENT_SECRET=test"
})
class PortfolioApiWebTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private StartupService startupService;
    @MockitoBean
    private InvestmentService investmentService;
    @MockitoBean
    private PoolEntryService poolEntryService;
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

    private static Startup startup() {
        Startup s = Startup.builder().name("Lumen Health").sector("Healthtech").stage(StartupStage.SEED).build();
        s.setId(UUID.randomUUID());
        return s;
    }

    @Test
    void startup_search_returns_the_paged_contract_with_isRaising() throws Exception {
        when(startupService.searchStartups(any(), any(), any(), eq(false), any()))
                .thenReturn(new PageImpl<>(List.of(startup()), PageRequest.of(0, 20), 1));

        mvc.perform(get("/api/startups").param("stage", "SEED").with(authentication(as(UserType.VC))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].name").value("Lumen Health"))
                .andExpect(jsonPath("$.data.items[0].stage").value("SEED"))
                .andExpect(jsonPath("$.data.items[0].isRaising").value(false))
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.totalPages").value(1));
    }

    @Test
    void unknown_stage_filter_is_a_400() throws Exception {
        mvc.perform(get("/api/startups").param("stage", "SERIES_Z").with(authentication(as(UserType.VC))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void vc_accounts_cannot_create_startups() throws Exception {
        mvc.perform(post("/api/startups").with(csrf()).with(authentication(as(UserType.VC)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\",\"sector\":\"SaaS\",\"stage\":\"SEED\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(startupService);
    }

    @Test
    void startup_validation_reports_each_field() throws Exception {
        mvc.perform(post("/api/startups").with(csrf()).with(authentication(as(UserType.STARTUP)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"website\":\"javascript:alert(1)\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.sector").exists())
                .andExpect(jsonPath("$.fieldErrors.stage").exists())
                .andExpect(jsonPath("$.fieldErrors.website").exists());
    }

    @Test
    void startup_accounts_cannot_read_investments() throws Exception {
        mvc.perform(get("/api/investments").with(authentication(as(UserType.STARTUP))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(investmentService);
    }

    @Test
    void investment_list_maps_startup_details_per_row() throws Exception {
        VCFirm firm = new VCFirm();
        firm.setId(UUID.randomUUID());
        Startup startup = startup();
        Investment investment = Investment.builder().vcFirm(firm).startup(startup)
                .investmentDate(LocalDate.of(2025, 7, 11)).amount(60_000_000L).currency("INR")
                .round(InvestmentRound.PRE_SEED).status(InvestmentStatus.ACTIVE).build();
        investment.setId(UUID.randomUUID());
        when(investmentService.listInvestments(any(), isNull(), any()))
                .thenReturn(new PageImpl<>(List.of(investment), PageRequest.of(0, 20), 1));

        mvc.perform(get("/api/investments").with(authentication(as(UserType.VC))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].startupName").value("Lumen Health"))
                .andExpect(jsonPath("$.data.items[0].startupSector").value("Healthtech"))
                .andExpect(jsonPath("$.data.items[0].round").value("PRE_SEED"))
                .andExpect(jsonPath("$.data.items[0].investmentDate").value("2025-07-11"));
    }

    @Test
    void investment_validation_rejects_bad_currency_and_equity() throws Exception {
        mvc.perform(post("/api/investments").with(csrf()).with(authentication(as(UserType.VC)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startupId\":\"" + UUID.randomUUID() + "\",\"investmentDate\":\"2025-01-01\","
                                + "\"amount\":100,\"currency\":\"rupees\",\"round\":\"SEED\",\"equityPercentage\":140}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.currency").exists())
                .andExpect(jsonPath("$.fieldErrors.equityPercentage").exists());
        verifyNoInteractions(investmentService);
    }

    @Test
    void pool_entry_requires_an_interest_level() throws Exception {
        mvc.perform(post("/api/pool").with(csrf()).with(authentication(as(UserType.VC)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyName\":\"Nimbus\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.interestLevel").exists());
    }

    @Test
    void page_size_is_capped() throws Exception {
        when(poolEntryService.listPoolEntries(any(), isNull(), any())).thenAnswer(inv -> {
            org.springframework.data.domain.Pageable pageable = inv.getArgument(2);
            return new PageImpl<>(List.of(), pageable, 0);
        });

        mvc.perform(get("/api/pool").param("size", "100000").with(authentication(as(UserType.VC))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.size").value(100));
    }
}
