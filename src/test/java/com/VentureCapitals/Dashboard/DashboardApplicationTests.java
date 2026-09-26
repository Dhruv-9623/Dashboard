package com.VentureCapitals.Dashboard;

import com.VentureCapitals.Dashboard.config.PostgresContainerTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Boots the whole application — every bean, the security chain, Flyway, JPA and Redis-backed
 * sessions — against real PostgreSQL and Redis.
 *
 * <p>The slice tests elsewhere each load a fragment of the context, so they can't catch a wiring
 * mistake that only shows up when everything is assembled. A previous release registered the
 * session filter as a {@code @Bean}, which silently ran it twice; that class of bug is what this
 * test is for. It was disabled before because there was no database for it to start against.
 *
 * <p>OAuth client credentials are placeholders: nothing here talks to Google or LinkedIn, but the
 * registrations must be present or the context won't build.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "GOOGLE_CLIENT_ID=test-client-id",
        "GOOGLE_CLIENT_SECRET=test-client-secret",
        "LINKEDIN_CLIENT_ID=test-client-id",
        "LINKEDIN_CLIENT_SECRET=test-client-secret",
})
class DashboardApplicationTests extends PostgresContainerTest {

    @SuppressWarnings("resource") // Reaped by Ryuk when the JVM exits.
    private static final GenericContainer<?> REDIS =
            new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);

    @DynamicPropertySource
    static void redis(DynamicPropertyRegistry registry) {
        if (!REDIS.isRunning()) {
            REDIS.start();
        }
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
    }

    @Autowired
    private ApplicationContext context;

    @Test
    void the_application_context_loads() {
        assertThat(context.getBeanDefinitionCount()).isPositive();
    }

    @Test
    void the_demo_seeder_stays_out_of_a_normal_run() {
        // It's @Profile("demo"). If it ever leaked into the default profile it would write
        // accounts with a known password into whatever database the app was pointed at.
        assertThat(context.containsBean("demoDataSeeder")).isFalse();
    }
}
