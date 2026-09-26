package com.VentureCapitals.Dashboard.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Base class for all unit tests using Mockito.
 * - No Spring context is loaded
 * - Dependencies are mocked with Mockito
 * - Fast execution
 *
 * Usage:
 * @ExtendWith(MockitoExtension.class)
 * class YourServiceTest extends BaseUnitTest { }
 */
@ExtendWith(MockitoExtension.class)
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public abstract class BaseUnitTest {

    @BeforeEach
    public void setUp() {
        // Override in subclasses for test setup
    }
}
