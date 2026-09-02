package com.VentureCapitals.Dashboard.domain.user;

import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.ValidationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@Transactional
public class UserService {
    private final UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User findOrCreateFromOAuth(String oauthProvider, String oauthId, String email) {
        return userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId)
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .email(email)
                            .oauthProvider(oauthProvider)
                            .oauthId(oauthId)
                            .userType(null)
                            .isActive(true)
                            .build();
                    User saved = userRepository.save(newUser);
                    log.info("Created new OAuth user: email={}, provider={}", email, oauthProvider);
                    return saved;
                });
    }

    public User completeAccountTypeSelection(UUID userId, UserType userType) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        if (user.getUserType() != null) {
            throw new ValidationException("User account type already set");
        }

        user.setUserType(userType);
        User updated = userRepository.save(user);
        log.info("User account type selection completed: userId={}, userType={}", userId, userType);
        return updated;
    }

    @Transactional(readOnly = true)
    public User getCurrentUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
    }

    @Transactional(readOnly = true)
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + email));
    }

    public User registerWithEmailPassword(String email, String password) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new ValidationException("Email already registered");
        }

        User newUser = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .userType(null)
                .isActive(true)
                .build();
        User saved = userRepository.save(newUser);
        log.info("Created new email/password user: email={}", email);
        return saved;
    }

    @Transactional(readOnly = true)
    public User authenticateWithEmailPassword(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Invalid email or password"));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ValidationException("Invalid email or password");
        }

        return user;
    }
}