package com.VentureCapitals.Dashboard.security;

import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {
    private final UserService userService;

    public CustomOAuth2UserService(UserService userService) {
        this.userService = userService;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        String oauthId = oAuth2User.getName();
        String email = oAuth2User.getAttribute("email");

        if (email == null) {
            email = extractEmailFromAttributes(registrationId, oAuth2User);
        }

        User user = userService.findOrCreateFromOAuth(registrationId, oauthId, email);

        return new AuthenticatedUserPrincipal(user, oAuth2User.getAttributes());
    }

    private String extractEmailFromAttributes(String registrationId, OAuth2User oAuth2User) {
        return switch (registrationId) {
            case "google" -> oAuth2User.getAttribute("email");
            case "linkedin" -> oAuth2User.getAttribute("email");
            default -> null;
        };
    }
}
