package com.VentureCapitals.Dashboard.security;

import com.VentureCapitals.Dashboard.domain.user.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

@Getter
public class AuthenticatedUserPrincipal implements OAuth2User, Serializable {
    private static final long serialVersionUID = 1L;

    private transient User user;
    private final String userId;
    private final String userTypeStr;
    private final Map<String, Object> attributes;

    public AuthenticatedUserPrincipal(User user, Map<String, Object> attributes) {
        this.user = user;
        this.userId = user.getId().toString();
        this.userTypeStr = user.getUserType() != null ? user.getUserType().toString() : null;
        this.attributes = attributes != null ? attributes : new HashMap<>();
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
    public String getName() {
        return userId;
    }
}
