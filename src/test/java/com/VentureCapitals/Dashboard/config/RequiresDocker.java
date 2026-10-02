package com.VentureCapitals.Dashboard.config;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.condition.EnabledIf;

import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Skips the test when no Docker daemon is reachable, and tags it {@code docker} so a build can
 * select or exclude the whole group with {@code -Dgroups=docker} / {@code -DexcludedGroups=docker}.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
@Tag("docker")
@EnabledIf(value = "com.VentureCapitals.Dashboard.config.DockerAvailability#isAvailable",
        disabledReason = "Docker is not available — start Docker Desktop to run the container-backed tests")
public @interface RequiresDocker {
}
