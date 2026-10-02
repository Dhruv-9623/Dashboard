package com.VentureCapitals.Dashboard.domain.user;

import com.VentureCapitals.Dashboard.config.BaseIntegrationTest;
import com.VentureCapitals.Dashboard.testdata.TestDataBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.annotation.DirtiesContext;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

/**
 * Integration tests for UserRepository.
 * Tests database persistence and custom query methods.
 *
 * Run with: mvn test -Dtest=UserRepositoryIntegrationTest
 */
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class UserRepositoryIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void should_save_and_retrieve_user_from_database() {
        // Arrange
        User user = TestDataBuilder.user()
                .withEmail("integration@example.com")
                .withUserType(UserType.VC)
                .build();

        // Act
        User saved = userRepository.save(user);

        // Assert
        assertThat(saved)
                .isNotNull()
                .hasFieldOrPropertyWithValue("email", "integration@example.com")
                .hasFieldOrPropertyWithValue("userType", UserType.VC);
    }

    @Test
    void should_find_user_by_email() {
        // Arrange
        User user = TestDataBuilder.user()
                .withEmail("findbyemail@example.com")
                .build();
        userRepository.save(user);

        // Act
        Optional<User> found = userRepository.findByEmail("findbyemail@example.com");

        // Assert
        assertThat(found)
                .isPresent()
                .get()
                .hasFieldOrPropertyWithValue("email", "findbyemail@example.com");
    }

    @Test
    void should_return_empty_when_user_not_found_by_email() {
        // Act
        Optional<User> found = userRepository.findByEmail("nonexistent@example.com");

        // Assert
        assertThat(found).isEmpty();
    }

    @Test
    void should_find_user_by_oauth_provider_and_id() {
        // Arrange
        User user = TestDataBuilder.user()
                .withOAuthProvider("google")
                .withOAuthId("google-12345")
                .build();
        userRepository.save(user);

        // Act
        Optional<User> found = userRepository.findByOauthProviderAndOauthId("google", "google-12345");

        // Assert
        assertThat(found)
                .isPresent()
                .get()
                .hasFieldOrPropertyWithValue("oauthProvider", "google")
                .hasFieldOrPropertyWithValue("oauthId", "google-12345");
    }

    @Test
    void should_update_user_type() {
        // Arrange
        User user = TestDataBuilder.user()
                .withUserType(null)
                .build();
        User saved = userRepository.save(user);

        // Act
        saved.setUserType(UserType.STARTUP);
        User updated = userRepository.save(saved);

        // Assert
        Optional<User> retrieved = userRepository.findById(updated.getId());
        assertThat(retrieved)
                .isPresent()
                .get()
                .hasFieldOrPropertyWithValue("userType", UserType.STARTUP);
    }

    @Test
    void should_persist_oauth_credentials() {
        // Arrange
        User user = TestDataBuilder.user()
                .withOAuthProvider("linkedin")
                .withOAuthId("linkedin-67890")
                .build();

        // Act
        User saved = userRepository.save(user);

        // Assert
        Optional<User> retrieved = userRepository.findById(saved.getId());
        assertThat(retrieved)
                .isPresent()
                .get()
                .hasFieldOrPropertyWithValue("oauthProvider", "linkedin")
                .hasFieldOrPropertyWithValue("oauthId", "linkedin-67890");
    }

    @Test
    void should_save_deactivated_user() {
        // Arrange
        User user = TestDataBuilder.user()
                .withActive(false)
                .build();

        // Act
        User saved = userRepository.save(user);

        // Assert
        assertThat(saved.isActive()).isFalse();
    }
}
