package com.VentureCapitals.Dashboard.api.auth;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.common.ErrorCode;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserService;
import com.VentureCapitals.Dashboard.security.AuthenticatedUserPrincipal;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserService userService;
    private final SecurityContextRepository securityContextRepository;

    public AuthController(UserService userService, SecurityContextRepository securityContextRepository) {
        this.userService = userService;
        this.securityContextRepository = securityContextRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDTO>> getCurrentUser(@CurrentUser User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error(ErrorCode.UNAUTHORIZED, "User not authenticated"));
        }

        return ResponseEntity.ok(ApiResponse.ok(toDTO(user)));
    }

    @PostMapping("/account-type")
    public ResponseEntity<ApiResponse<UserDTO>> completeAccountTypeSelection(
            @CurrentUser User user,
            @Valid @RequestBody AccountTypeSelectionRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error(ErrorCode.UNAUTHORIZED, "User not authenticated"));
        }

        User updated = userService.completeAccountTypeSelection(user.getId(), request.getUserType());
        refreshOAuthAuthorities(updated, httpRequest, httpResponse);

        return ResponseEntity.ok(ApiResponse.ok(toDTO(updated)));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserDTO>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {

        User user = userService.registerWithEmailPassword(request.getEmail(), request.getPassword());
        establishSession(user, httpRequest);

        return ResponseEntity.ok(ApiResponse.ok(toDTO(user)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserDTO>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        User user = userService.authenticateWithEmailPassword(request.getEmail(), request.getPassword());
        establishSession(user, httpRequest);

        return ResponseEntity.ok(ApiResponse.ok(toDTO(user)));
    }

    private UserDTO toDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .userType(user.getUserType())
                .isActive(user.isActive())
                .accountSetupComplete(user.getUserType() != null)
                .build();
    }

    private void establishSession(User user, HttpServletRequest request) {
        HttpSession httpSession = request.getSession(true);
        // Rotate the session id on login so a pre-planted session id can't be reused (session fixation).
        request.changeSessionId();

        // Store just the user ID in the session (serializable string, not an object)
        httpSession.setAttribute("userId", user.getId().toString());

        log.info("Session established for user: {}", user.getId());
    }

    /**
     * OAuth logins keep their principal in the session, and its roles were derived before the user
     * picked an account type. Re-save the context so ROLE_VC / ROLE_STARTUP apply immediately.
     */
    private void refreshOAuthAuthorities(User updated, HttpServletRequest request, HttpServletResponse response) {
        Authentication current = SecurityContextHolder.getContext().getAuthentication();
        if (!(current instanceof OAuth2AuthenticationToken oauthToken)
                || !(oauthToken.getPrincipal() instanceof AuthenticatedUserPrincipal principal)) {
            return;
        }

        AuthenticatedUserPrincipal refreshed = principal.withUser(updated);
        OAuth2AuthenticationToken refreshedToken = new OAuth2AuthenticationToken(
                refreshed, refreshed.getAuthorities(), oauthToken.getAuthorizedClientRegistrationId());

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(refreshedToken);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }
}
