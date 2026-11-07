package com.VentureCapitals.Dashboard.config;

import com.VentureCapitals.Dashboard.domain.funding.CommitmentEvent;
import com.VentureCapitals.Dashboard.domain.funding.CommitmentEventRepository;
import com.VentureCapitals.Dashboard.domain.funding.CommitmentStatus;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitment;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitmentRepository;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycleRepository;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycleStatus;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRepository;
import com.VentureCapitals.Dashboard.domain.pool.PoolEntryRepository;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserRepository;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The demo profile is how the app is meant to be picked up and clicked through, so the seed run
 * is tested like any other feature: it must produce a logged-in-able account, and re-running it
 * (a restart, or devtools reloading) must not duplicate or fail.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("demo")
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.demo.password=SeedTestPassword1!",
        "GOOGLE_CLIENT_ID=test-client-id",
        "GOOGLE_CLIENT_SECRET=test-client-secret",
        "LINKEDIN_CLIENT_ID=test-client-id",
        "LINKEDIN_CLIENT_SECRET=test-client-secret",
})
class DemoDataSeederTest extends PostgresContainerTest {

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
    private DemoDataSeeder seeder;
    @Autowired
    private UserRepository users;
    @Autowired
    private VCFirmRepository firms;
    @Autowired
    private StartupRepository startups;
    @Autowired
    private InvestmentRepository investments;
    @Autowired
    private PoolEntryRepository poolEntries;
    @Autowired
    private FundingCycleRepository fundingCycles;
    @Autowired
    private FundingCommitmentRepository commitments;
    @Autowired
    private CommitmentEventRepository events;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void seeding_produces_accounts_that_can_actually_sign_in() {
        User owner = users.findByEmail("owner" + DemoDataSeeder.DEMO_DOMAIN).orElseThrow();

        assertThat(owner.getUserType()).isEqualTo(UserType.VC);
        assertThat(owner.isActive()).isTrue();
        assertThat(passwordEncoder.matches("SeedTestPassword1!", owner.getPasswordHash()))
                .as("password is hashed with the configured demo password")
                .isTrue();
        assertThat(users.findByEmail("founder" + DemoDataSeeder.DEMO_DOMAIN).orElseThrow().getUserType())
                .isEqualTo(UserType.STARTUP);
    }

    @Test
    void every_screen_has_something_to_show() {
        // Three firms: the demo workspace plus two co-investors, which exist so a round can have
        // commitments from more than one name — the API allows one per firm.
        assertThat(firms.count()).isEqualTo(3);
        assertThat(startups.count()).isEqualTo(4);
        assertThat(investments.count()).isEqualTo(3);
        // Two, not three: an exited position is not a tracked prospect, so ClinicOS is an
        // investment only. The pool holds Vaultline and the off-platform Nimbus Grid.
        assertThat(poolEntries.count()).isEqualTo(2);
        assertThat(fundingCycles.count()).isEqualTo(2);
        assertThat(commitments.count()).isEqualTo(3);
    }

    @Test
    void the_seeded_round_shows_all_three_commitment_bands() {
        // The progress ladder is only worth looking at if the demo exercises every band.
        assertThat(commitments.findAll())
                .extracting(commitment -> commitment.getStatus())
                .containsExactlyInAnyOrder(
                        CommitmentStatus.COMMITTED,
                        CommitmentStatus.SOFT_COMMITTED,
                        CommitmentStatus.INDICATED);

        assertThat(fundingCycles.findAll())
                .extracting(cycle -> cycle.getStatus())
                .containsExactlyInAnyOrder(FundingCycleStatus.OPEN, FundingCycleStatus.CLOSED);
    }

    @Test
    void the_seeded_round_has_a_history_to_chart() {
        // The momentum chart reads the event log and nothing else, so a demo whose commitments
        // were inserted without events shows a funded round next to an empty chart.
        assertThat(events.count()).isEqualTo(6);
        assertThat(events.findAll())
                .filteredOn(CommitmentEvent::isCreation)
                .hasSize(3)
                .allSatisfy(event -> assertThat(event.getFromAmount()).isNull());
    }

    @Test
    void replaying_the_seeded_history_lands_on_the_bands_the_round_reports() {
        // The point of the assertion: two sources describe the same money — the commitments and
        // the events — and a demo where they disagree makes the chart contradict the progress bar
        // on the same screen.
        Map<UUID, CommitmentEvent> latest = new HashMap<>();
        events.findAll().stream()
                .sorted(Comparator.comparing(CommitmentEvent::getOccurredAt))
                .forEach(event -> latest.put(event.getCommitment().getId(), event));

        assertThat(latest).hasSize(3);
        for (FundingCommitment commitment : commitments.findAll()) {
            CommitmentEvent last = latest.get(commitment.getId());
            assertThat(last).as("every seeded pledge has history").isNotNull();
            assertThat(last.getToStatus()).isEqualTo(commitment.getStatus());
            assertThat(last.getToAmount()).isEqualTo(commitment.getAmount());
        }
    }

    @Test
    void running_it_again_changes_nothing() {
        long usersBefore = users.count();
        long firmsBefore = firms.count();

        ApplicationArguments noArgs = new DefaultApplicationArguments();
        seeder.run(noArgs);
        seeder.run(noArgs);

        assertThat(users.count()).isEqualTo(usersBefore);
        assertThat(firms.count()).isEqualTo(firmsBefore);
    }
}
