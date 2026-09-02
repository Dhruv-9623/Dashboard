package com.VentureCapitals.Dashboard.security;

import com.VentureCapitals.Dashboard.domain.user.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@Slf4j
@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {
    private final String frontendUrl;

    public OAuth2LoginSuccessHandler(@Value("${app.frontend-url}") String frontendUrl) {
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        AuthenticatedUserPrincipal principal = (AuthenticatedUserPrincipal) authentication.getPrincipal();
        User user = principal.getUser();

        if (user.getUserType() == null) {
            log.info("First-time OAuth login, redirecting to account type selection: userId={}", user.getId());
            response.sendRedirect(frontendUrl + "/account-type-selection");
        } else {
            log.info("Authenticated user login: userId={}, userType={}", user.getId(), user.getUserType());
            response.sendRedirect(frontendUrl + "/dashboard");
        }
    }
}
