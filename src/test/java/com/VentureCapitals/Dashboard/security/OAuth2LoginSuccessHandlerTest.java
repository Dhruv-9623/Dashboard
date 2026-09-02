package com.VentureCapitals.Dashboard.security;

import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OAuth2LoginSuccessHandlerTest {

    @Mock
    private jakarta.servlet.http.HttpServletRequest request;

    @Mock
    private jakarta.servlet.http.HttpServletResponse response;

    @Mock
    private Authentication authentication;

    private OAuth2LoginSuccessHandler handler;
    private String frontendUrl = "http://localhost:3000";

    @BeforeEach
    void setUp() {
        handler = new OAuth2LoginSuccessHandler(frontendUrl);
    }

    @Test
    void testFirstTimeLogin_RedirectsToAccountTypeSelection() throws Exception {
        UUID userId = UUID.randomUUID();
        User pendingUser = User.builder()
                .email("newuser@example.com")
                .userType(null)
                .build();
        pendingUser.setId(userId);

        Map<String, Object> attributes = new HashMap<>();
        attributes.put("email", "newuser@example.com");

        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(pendingUser, attributes);

        when(authentication.getPrincipal()).thenReturn(principal);

        handler.onAuthenticationSuccess(request, response, authentication);

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(response).sendRedirect(captor.capture());

        String redirectUrl = captor.getValue();
        assertTrue(redirectUrl.contains("http://localhost:3000/account-type-selection"),
                "Expected redirect to frontend account-type-selection, got: " + redirectUrl);
    }

    @Test
    void testReturningLogin_RedirectsToDashboard() throws Exception {
        UUID userId = UUID.randomUUID();
        User authenticatedUser = User.builder()
                .email("returning@example.com")
                .userType(UserType.VC)
                .build();
        authenticatedUser.setId(userId);

        Map<String, Object> attributes = new HashMap<>();
        attributes.put("email", "returning@example.com");

        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(authenticatedUser, attributes);

        when(authentication.getPrincipal()).thenReturn(principal);

        handler.onAuthenticationSuccess(request, response, authentication);

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(response).sendRedirect(captor.capture());

        String redirectUrl = captor.getValue();
        assertTrue(redirectUrl.contains("http://localhost:3000/dashboard"),
                "Expected redirect to frontend dashboard, got: " + redirectUrl);
    }

    @Test
    void testRedirectUsesConfiguredFrontendUrl() throws Exception {
        String customFrontendUrl = "http://app.example.com";
        OAuth2LoginSuccessHandler customHandler = new OAuth2LoginSuccessHandler(customFrontendUrl);

        User user = User.builder()
                .email("user@example.com")
                .userType(UserType.STARTUP)
                .build();
        user.setId(UUID.randomUUID());

        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(user, new HashMap<>());

        when(authentication.getPrincipal()).thenReturn(principal);

        customHandler.onAuthenticationSuccess(request, response, authentication);

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(response).sendRedirect(captor.capture());

        String redirectUrl = captor.getValue();
        assertTrue(redirectUrl.startsWith("http://app.example.com"),
                "Expected redirect to custom frontend URL, got: " + redirectUrl);
    }
}
