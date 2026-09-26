package com.VentureCapitals.Dashboard.config;

import com.VentureCapitals.Dashboard.api.auth.AuthController;
import com.VentureCapitals.Dashboard.api.vc.VCFirmController;
import com.VentureCapitals.Dashboard.api.vc.VCFirmMapper;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserRepository;
import com.VentureCapitals.Dashboard.domain.user.UserService;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmService;
import com.VentureCapitals.Dashboard.security.AuthenticatedUserPrincipal;
import com.VentureCapitals.Dashboard.security.CustomOAuth2UserService;
import com.VentureCapitals.Dashboard.security.CustomOidcUserService;
import com.VentureCapitals.Dashboard.security.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Filter-chain behaviour the unit tests can't see: CSRF, 401s for the API, 403s for role denials. */
@WebMvcTest(controllers = {AuthController.class, VCFirmController.class})
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
        "GOOGLE_CLIENT_ID=test", "GOOGLE_CLIENT_SECRET=test",
        "LINKEDIN_CLIENT_ID=test", "LINKEDIN_CLIENT_SECRET=test"
})
class SecurityConfigWebTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private UserService userService;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private CustomOAuth2UserService customOAuth2UserService;
    @MockitoBean
    private CustomOidcUserService customOidcUserService;
    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
    @MockitoBean
    private VCFirmService vcFirmService;
    @MockitoBean
    private VCFirmMapper vcFirmMapper;

    private static UsernamePasswordAuthenticationToken signedInAs(UserType type) {
        User user = User.builder().email("someone@example.com").userType(type).isActive(true).build();
        user.setId(UUID.randomUUID());
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(user, Map.of());
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }

    @Test
    void anonymousMeReturns401JsonAndIssuesCsrfCookie() throws Exception {
        mvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"))
                .andExpect(cookie().exists("XSRF-TOKEN"));
    }

    @Test
    void protectedApiReturns401InsteadOfLoginRedirect() throws Exception {
        mvc.perform(get("/api/vc/firms/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void writesWithoutCsrfTokenAreRejected() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@b.com\",\"password\":\"secret1\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void loginWithCsrfTokenSucceedsAndSerialisesIsActive() throws Exception {
        User user = User.builder().email("a@b.com").userType(UserType.VC).isActive(true).build();
        user.setId(UUID.randomUUID());
        when(userService.authenticateWithEmailPassword("a@b.com", "secret1")).thenReturn(user);

        mvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@b.com\",\"password\":\"secret1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(true))
                .andExpect(jsonPath("$.data.active").doesNotExist())
                .andExpect(jsonPath("$.data.accountSetupComplete").value(true));
    }

    @Test
    void validationErrorsListEveryField() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    void malformedJsonIs400Not500() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_REQUEST"));
    }

    @Test
    void roleDenialIs403Not500() throws Exception {
        mvc.perform(get("/api/vc/firms/me").with(authentication(signedInAs(UserType.STARTUP))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void myFirmIsEmptyBeforeSetup() throws Exception {
        when(vcFirmService.findFirmForUser(any())).thenReturn(Optional.empty());

        mvc.perform(get("/api/vc/firms/me").with(authentication(signedInAs(UserType.VC))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void invalidUuidPathIs400Not500() throws Exception {
        mvc.perform(get("/api/vc/firms/not-a-uuid").with(authentication(signedInAs(UserType.VC))))
                .andExpect(status().isBadRequest());
    }

    /**
     * Regression: a saved security context used to pin email/password users to the roles they had
     * on their first authenticated request, so choosing "VC" still got 403 on VC endpoints.
     */
    @Test
    void sessionUserRolesRefreshAfterAccountTypeChanges() throws Exception {
        UUID userId = UUID.randomUUID();
        User pending = User.builder().email("new@example.com").userType(null).isActive(true).build();
        pending.setId(userId);
        User vc = User.builder().email("new@example.com").userType(UserType.VC).isActive(true).build();
        vc.setId(userId);
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("userId", userId.toString());
        when(vcFirmService.findFirmForUser(any())).thenReturn(Optional.empty());

        when(userRepository.findById(userId)).thenReturn(Optional.of(pending));
        mvc.perform(get("/api/vc/firms/me").session(session))
                .andExpect(status().isForbidden());

        when(userRepository.findById(userId)).thenReturn(Optional.of(vc));
        mvc.perform(get("/api/vc/firms/me").session(session))
                .andExpect(status().isOk());
    }

    @Test
    void deactivatedSessionUserLosesAccess() throws Exception {
        UUID userId = UUID.randomUUID();
        User active = User.builder().email("a@example.com").userType(UserType.VC).isActive(true).build();
        active.setId(userId);
        User deactivated = User.builder().email("a@example.com").userType(UserType.VC).isActive(false).build();
        deactivated.setId(userId);
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("userId", userId.toString());
        when(vcFirmService.findFirmForUser(any())).thenReturn(Optional.empty());

        when(userRepository.findById(userId)).thenReturn(Optional.of(active));
        mvc.perform(get("/api/vc/firms/me").session(session)).andExpect(status().isOk());

        when(userRepository.findById(userId)).thenReturn(Optional.of(deactivated));
        mvc.perform(get("/api/vc/firms/me").session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void unmappedEndpointIs404Not500() throws Exception {
        mvc.perform(get("/api/not-built-yet").with(authentication(signedInAs(UserType.VC))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void logoutReturns200InsteadOfRedirect() throws Exception {
        mvc.perform(post("/api/auth/logout").with(csrf()).with(authentication(signedInAs(UserType.VC))))
                .andExpect(status().isOk());
    }
}
