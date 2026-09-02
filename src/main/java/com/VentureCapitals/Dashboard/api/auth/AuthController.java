package com.VentureCapitals.Dashboard.api.auth;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.common.ErrorCode;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserService;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.security.AuthenticatedUserPrincipal;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
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
    private final SessionRepository sessionRepository;

    public AuthController(UserService userService, SessionRepository sessionRepository) {
        this.userService = userService;
        this.sessionRepository = sessionRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDTO>> getCurrentUser(@CurrentUser User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error(ErrorCode.UNAUTHORIZED, "User not authenticated"));
        }

        UserDTO userDTO = UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .userType(user.getUserType())
                .isActive(user.isActive())
                .accountSetupComplete(user.getUserType() != null)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(userDTO));
    }

    @PostMapping("/account-type")
    public ResponseEntity<ApiResponse<UserDTO>> completeAccountTypeSelection(
            @CurrentUser User user,
            @Valid @RequestBody AccountTypeSelectionRequest request) {

        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error(ErrorCode.UNAUTHORIZED, "User not authenticated"));
        }

        User updated = userService.completeAccountTypeSelection(user.getId(), request.getUserType());

        UserDTO userDTO = UserDTO.builder()
                .id(updated.getId())
                .email(updated.getEmail())
                .userType(updated.getUserType())
                .isActive(updated.isActive())
                .accountSetupComplete(true)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(userDTO));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserDTO>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        User user = userService.registerWithEmailPassword(request.getEmail(), request.getPassword());
        establishSession(user, httpRequest, httpResponse);

        UserDTO userDTO = UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .userType(user.getUserType())
                .isActive(user.isActive())
                .accountSetupComplete(false)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(userDTO));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserDTO>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        User user = userService.authenticateWithEmailPassword(request.getEmail(), request.getPassword());
        establishSession(user, httpRequest, httpResponse);

        UserDTO userDTO = UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .userType(user.getUserType())
                .isActive(user.isActive())
                .accountSetupComplete(user.getUserType() != null)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(userDTO));
    }

    private void establishSession(User user, HttpServletRequest request, HttpServletResponse response) {
        HttpSession httpSession = request.getSession(true);

        // Store just the user ID in the session (serializable string, not an object)
        httpSession.setAttribute("userId", user.getId().toString());

        log.info("Session established for user: {} ({})", user.getEmail(), user.getId());
    }
}
