package com.VentureCapitals.Dashboard.security;

import com.VentureCapitals.Dashboard.domain.user.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/**
 * Principal for every login path: email/password, plain OAuth2 and OpenID Connect.
 * Implements {@link OidcUser} so the OIDC login flow (Google, LinkedIn) accepts it.
 */
@Getter
public class AuthenticatedUserPrincipal implements OidcUser, Serializable {
    private static final long serialVersionUID = 2L;

    private transient User user;
    private final String userId;
    private final String userTypeStr;
    private final Map<String, Object> attributes;
    private final OidcIdToken idToken;
    private final OidcUserInfo userInfo;

    public AuthenticatedUserPrincipal(User user, Map<String, Object> attributes) {
        this(user, attributes, null, null);
    }

    public AuthenticatedUserPrincipal(User user, Map<String, Object> attributes,
                                      OidcIdToken idToken, OidcUserInfo userInfo) {
        this.user = user;
        this.userId = user.getId().toString();
        this.userTypeStr = user.getUserType() != null ? user.getUserType().toString() : null;
        this.attributes = attributes != null ? attributes : new HashMap<>();
        this.idToken = idToken;
        this.userInfo = userInfo;
    }

    /** Same login context, re-derived from a freshly loaded user (e.g. after choosing an account type). */
    public AuthenticatedUserPrincipal withUser(User updatedUser) {
        return new AuthenticatedUserPrincipal(updatedUser, attributes, idToken, userInfo);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Collection<GrantedAuthority> authorities = new ArrayList<>();

        if (userTypeStr != null) {
            if ("VC".equals(userTypeStr)) {
                authorities.add(new SimpleGrantedAuthority("ROLE_VC"));
            } else if ("STARTUP".equals(userTypeStr)) {
                authorities.add(new SimpleGrantedAuthority("ROLE_STARTUP"));
            }
        }

        authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        return authorities;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    @Override
    public Map<String, Object> getClaims() {
        return idToken != null ? idToken.getClaims() : attributes;
    }

    @Override
    public String getName() {
        return userId;
    }
}
