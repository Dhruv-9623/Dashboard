package com.VentureCapitals.Dashboard.domain.user;

import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.ValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private UUID userId;
    private User testUser;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        testUser = User.builder()
                .email("test@example.com")
                .userType(null)
                .oauthProvider("google")
                .oauthId("google123")
                .build();
        testUser.setId(userId);
    }

    @Test
    void testCompleteAccountTypeSelection_Success() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = userService.completeAccountTypeSelection(userId, UserType.VC);

        assertNotNull(updated);
        assertEquals(UserType.VC, updated.getUserType());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void testCompleteAccountTypeSelection_UserNotFound() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () ->
                userService.completeAccountTypeSelection(userId, UserType.VC)
        );
    }

    @Test
    void testCompleteAccountTypeSelection_AlreadySet() {
        testUser.setUserType(UserType.VC);
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

        assertThrows(ValidationException.class, () ->
                userService.completeAccountTypeSelection(userId, UserType.STARTUP)
        );
    }

    @Test
    void testFindOrCreateFromOAuth_ExistingUser() {
        when(userRepository.findByOauthProviderAndOauthId("google", "google123"))
                .thenReturn(Optional.of(testUser));

        User found = userService.findOrCreateFromOAuth("google", "google123", "test@example.com");

        assertNotNull(found);
        assertEquals(testUser.getId(), found.getId());
        verify(userRepository, never()).save(any());
    }

    @Test
    void testFindOrCreateFromOAuth_NewUser() {
        when(userRepository.findByOauthProviderAndOauthId("google", "google123"))
                .thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User created = userService.findOrCreateFromOAuth("google", "google123", "newuser@example.com");

        assertNotNull(created);
        assertEquals("google", created.getOauthProvider());
        assertEquals("google123", created.getOauthId());
        assertNull(created.getUserType());
        verify(userRepository).save(any(User.class));
    }
}
