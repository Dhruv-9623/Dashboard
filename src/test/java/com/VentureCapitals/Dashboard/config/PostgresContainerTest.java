package com.VentureCapitals.Dashboard.config;

import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Base class for tests that need <em>real</em> PostgreSQL.
 *
 * <p>The Flyway migrations use PostgreSQL-only syntax (partial unique indexes, named foreign-key
 * changes), so they can't run on H2 — which is why {@code application-test.properties} disables
 * Flyway. Anything that verifies the migrations themselves, or a query that depends on a real
 * PostgreSQL feature, extends this instead.
 *
 * <p>One container is shared by every test class in the run: it's started once, on first use, and
 * left for Ryuk to reap at the end. Subclasses are skipped, not failed, when Docker isn't running
 * (see {@link RequiresDocker}), so {@code ./mvnw test} still works on a machine without it.
 *
 * <p>The image matches {@code docker-compose.yml} so tests and local development can't drift onto
 * different PostgreSQL majors.
 */
@RequiresDocker
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public abstract class PostgresContainerTest {

    protected static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"))
                    .withDatabaseName("dashboard_test")
                    .withUsername("dashboard")
                    .withPassword("dashboard");

    static {
        if (DockerAvailability.isAvailable()) {
            POSTGRES.start();
        }
    }

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
    }
}
