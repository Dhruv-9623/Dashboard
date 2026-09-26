package com.VentureCapitals.Dashboard.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Base class for integration tests.
 * - Loads the full Spring application context
 * - Full database access (H2 by default)
 *
 * For web tests, use @WebMvcTest or add @AutoConfigureMockMvc separately
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public abstract class BaseIntegrationTest {

    @BeforeEach
    public void setUp() {
        // Override in subclasses for test setup
    }
}
