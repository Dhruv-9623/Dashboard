package com.VentureCapitals.Dashboard.security;

import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserRepository;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.UUID;

@Slf4j
@Component
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {
    private final UserRepository userRepository;

    public CurrentUserArgumentResolver(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.getParameterAnnotation(CurrentUser.class) != null &&
                parameter.getParameterType().equals(User.class);
    }

    @Override
    @Transactional(readOnly = true)
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                   NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        // First, try to get user from Authentication principal (OAuth2 flow)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        log.debug("CurrentUserArgumentResolver: authentication={}", authentication);
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal) {
            AuthenticatedUserPrincipal principal = (AuthenticatedUserPrincipal) authentication.getPrincipal();
            log.debug("CurrentUserArgumentResolver: Found OAuth2 principal: {}", principal.getUser().getEmail());
            return principal.getUser();
        }

        // Second, try to get user ID from session (email/password login flow)
        HttpSession session = webRequest.getNativeRequest(jakarta.servlet.http.HttpServletRequest.class).getSession(false);
        log.debug("CurrentUserArgumentResolver: session exists: {}", session != null);
        if (session != null) {
            String userId = (String) session.getAttribute("userId");
            log.debug("CurrentUserArgumentResolver: userId from session: {}", userId);
            if (userId != null) {
                try {
                    User user = userRepository.findById(UUID.fromString(userId)).orElse(null);
                    log.debug("CurrentUserArgumentResolver: Loaded user from DB: {}", user != null ? user.getEmail() : "null");
                    return user;
                } catch (Exception e) {
                    log.error("CurrentUserArgumentResolver: Error loading user: {}", e.getMessage());
                    return null;
                }
            }
        }

        log.debug("CurrentUserArgumentResolver: No user found");
        return null;
    }
}
