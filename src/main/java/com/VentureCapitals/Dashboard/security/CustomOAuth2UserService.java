package com.VentureCapitals.Dashboard.security;

import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

/** Non-OIDC OAuth2 providers. Google and LinkedIn use {@link CustomOidcUserService}. */
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

        if (email == null || email.isBlank()) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("missing_email", "The identity provider did not share an email address", null));
        }

        User user = userService.findOrCreateFromOAuth(registrationId, oauthId, email);
        if (!user.isActive()) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("account_disabled", "This account has been deactivated", null));
        }

        return new AuthenticatedUserPrincipal(user, oAuth2User.getAttributes());
    }
}
