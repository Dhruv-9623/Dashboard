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
import org.springframework.security.core.context.SecurityContextHolder;
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
        // Don't load from session if already authenticated from a previous stage (OAuth2, etc)
        Authentication existingAuth = SecurityContextHolder.getContext().getAuthentication();
        if (existingAuth == null || existingAuth.getPrincipal() instanceof String) {
            try {
                HttpSession session = request.getSession(false);
                if (session != null) {
                    String userId = (String) session.getAttribute("userId");
                    if (userId != null) {
                        try {
                            User user = userRepository.findById(UUID.fromString(userId)).orElse(null);
                            if (user != null) {
                                AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(user, java.util.Map.of());
                                UsernamePasswordAuthenticationToken authentication =
                                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                                SecurityContextHolder.getContext().setAuthentication(authentication);
                                log.debug("SessionUserAuthenticationFilter: Loaded and set authentication for user {} from session", user.getEmail());
                            }
                        } catch (Exception e) {
                            log.debug("SessionUserAuthenticationFilter: Failed to load user from userId {}: {}", userId, e.getMessage());
                        }
                    }
                }
            } catch (Exception e) {
                log.debug("SessionUserAuthenticationFilter: Error accessing session: {}", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }
}
