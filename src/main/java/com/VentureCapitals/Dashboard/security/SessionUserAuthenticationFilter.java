package com.VentureCapitals.Dashboard.security;

import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Slf4j
public class SessionUserAuthenticationFilter extends OncePerRequestFilter {
    private final UserRepository userRepository;

    public SessionUserAuthenticationFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication existingAuth = SecurityContextHolder.getContext().getAuthentication();
        if (existingAuth instanceof OAuth2AuthenticationToken oauthToken
                && oauthToken.getPrincipal() instanceof AuthenticatedUserPrincipal principal) {
            refreshOAuthSession(oauthToken, principal);
        } else {
            try {
                HttpSession session = request.getSession(false);
                String userId = session != null ? (String) session.getAttribute("userId") : null;
                if (userId != null) {
                    // Rebuild from the database on every request rather than trusting a context that
                    // SessionManagementFilter may have saved earlier: roles change when the user picks an
                    // account type, and deactivated accounts must lose access even with a live session.
                    User user = userRepository.findById(UUID.fromString(userId)).orElse(null);
                    // Update the context in place: the chain holds a deferred reference to it.
                    SecurityContext context = SecurityContextHolder.getContext();
                    if (user != null && user.isActive()) {
                        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(user, java.util.Map.of());
                        context.setAuthentication(
                                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
                        log.debug("SessionUserAuthenticationFilter: Loaded authentication for user {} from session", user.getId());
                    } else {
                        context.setAuthentication(null);
                    }
                }
            } catch (Exception e) {
                log.debug("SessionUserAuthenticationFilter: Failed to load user from session: {}", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * OAuth sessions keep the provider token, but the account behind it can change: it may be
     * deactivated (drop access) or pick an account type (refresh roles).
     */
    private void refreshOAuthSession(OAuth2AuthenticationToken token, AuthenticatedUserPrincipal principal) {
        try {
            User user = userRepository.findById(UUID.fromString(principal.getUserId())).orElse(null);
            SecurityContext context = SecurityContextHolder.getContext();
            if (user == null || !user.isActive()) {
                context.setAuthentication(null);
                return;
            }
            String currentType = user.getUserType() != null ? user.getUserType().toString() : null;
            if (!java.util.Objects.equals(currentType, principal.getUserTypeStr())) {
                AuthenticatedUserPrincipal refreshed = principal.withUser(user);
                context.setAuthentication(new OAuth2AuthenticationToken(
                        refreshed, refreshed.getAuthorities(), token.getAuthorizedClientRegistrationId()));
            }
        } catch (Exception e) {
            log.debug("SessionUserAuthenticationFilter: Failed to refresh OAuth session: {}", e.getMessage());
        }
    }
}
