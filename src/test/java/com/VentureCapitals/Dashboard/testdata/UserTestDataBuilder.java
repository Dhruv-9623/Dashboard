package com.VentureCapitals.Dashboard.testdata;

import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import java.util.UUID;

/**
 * Builder for creating User test data.
 *
 * Usage:
 * User vcUser = TestDataBuilder.user().withUserType(UserType.VC).build();
 * User startupUser = TestDataBuilder.user().withUserType(UserType.STARTUP).build();
 */
public class UserTestDataBuilder {

    // Null by default: the entity generates its own id. A preset id makes save() merge a row that
    // doesn't exist, which Hibernate reports as ObjectOptimisticLockingFailure. Use withId() for
    // unit tests that never touch the database.
    private UUID id = null;
    private String email = TestDataBuilder.unique("user") + "@example.com";
    private String passwordHash = null;
    private UserType userType = null;
    private String oauthProvider = "google";
    private String oauthId = TestDataBuilder.unique("oauth");
    private boolean isActive = true;

    public UserTestDataBuilder withId(UUID id) {
        this.id = id;
        return this;
    }

    public UserTestDataBuilder withEmail(String email) {
        this.email = email;
        return this;
    }

    public UserTestDataBuilder withPasswordHash(String hash) {
        this.passwordHash = hash;
        return this;
    }

    public UserTestDataBuilder withUserType(UserType userType) {
        this.userType = userType;
        return this;
    }

    public UserTestDataBuilder withOAuthProvider(String provider) {
        this.oauthProvider = provider;
        return this;
    }

    public UserTestDataBuilder withOAuthId(String oauthId) {
        this.oauthId = oauthId;
        return this;
    }

    public UserTestDataBuilder withActive(boolean active) {
        this.isActive = active;
        return this;
    }

    public User build() {
        User user = User.builder()
                .email(email)
                .passwordHash(passwordHash)
                .userType(userType)
                .oauthProvider(oauthProvider)
                .oauthId(oauthId)
                .isActive(isActive)
                .build();
        if (id != null) {
            user.setId(id);
        }
        return user;
    }
}
