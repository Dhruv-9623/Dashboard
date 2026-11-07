package com.VentureCapitals.Dashboard.config;

import com.VentureCapitals.Dashboard.domain.funding.CommitmentEvent;
import com.VentureCapitals.Dashboard.domain.funding.CommitmentEventRepository;
import com.VentureCapitals.Dashboard.domain.funding.CommitmentStatus;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitment;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitmentRepository;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycle;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycleRepository;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycleStatus;
import com.VentureCapitals.Dashboard.domain.investment.Investment;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRepository;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRound;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentStatus;
import com.VentureCapitals.Dashboard.domain.pool.InterestLevel;
import com.VentureCapitals.Dashboard.domain.pool.PoolEntry;
import com.VentureCapitals.Dashboard.domain.pool.PoolEntryRepository;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupMember;
import com.VentureCapitals.Dashboard.domain.startup.StartupMemberRepository;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.startup.StartupRole;
import com.VentureCapitals.Dashboard.domain.startup.StartupStage;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserRepository;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Seeds a small, realistic data set so the app can be clicked through without registering
 * accounts by hand: one VC firm with three members, four startups, investments and pool entries.
 *
 * <p>Only runs under the {@code demo} profile, and only if the demo accounts don't exist yet, so
 * restarting is safe. Passwords come from {@code DEMO_PASSWORD} — nothing is hard-coded, which is
 * why the old {@code V6__InsertTestAccounts} Java migration was deleted.
 *
 * <pre>
 * SPRING_PROFILES_ACTIVE=demo ./mvnw spring-boot:run
 * </pre>
 */
@Slf4j
@Component
@Profile("demo")
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    /** Every seeded account shares this address suffix, so they're easy to find and delete. */
    public static final String DEMO_DOMAIN = "@demo.dashboard.test";

    private final UserRepository users;
    private final VCFirmRepository firms;
    private final VCMemberRepository members;
    private final StartupRepository startups;
    private final StartupMemberRepository startupMembers;
    private final InvestmentRepository investments;
    private final PoolEntryRepository poolEntries;
    private final FundingCycleRepository fundingCycles;
    private final FundingCommitmentRepository commitments;
    private final CommitmentEventRepository events;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.demo.password:Password123!}")
    private String demoPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.findByEmail("owner" + DEMO_DOMAIN).isPresent()) {
            log.info("Demo data already present — nothing seeded.");
            return;
        }

        VCFirm firm = firms.save(VCFirm.builder()
                .name("Meridian Ventures")
                .description("Early-stage fund backing Indian SaaS and fintech founders from first cheque to Series B.")
                .website("https://meridian.example.com")
                .aum(4_500_000_000L)
                .investmentStage("Seed to Series B")
                .sectors(new ArrayList<>(List.of("SaaS", "Fintech", "AI/ML")))
                .location("Bengaluru")
                .foundedYear(2018)
                .build());

        member(firm, user("owner", UserType.VC), VCRole.OWNER);
        VCMember manager = member(firm, user("pm", UserType.VC), VCRole.PORTFOLIO_MANAGER);
        member(firm, user("staff", UserType.VC), VCRole.STAFF);

        Startup ledgerly = startup("Ledgerly", "Fintech", StartupStage.SERIES_A,
                "Reconciliation and close automation for Indian finance teams.", "Bengaluru", 2021, 90_000_000L, 42);
        Startup shiprack = startup("Shiprack", "Logistics", StartupStage.SEED,
                "Freight visibility for mid-market exporters shipping out of Mundra and Nhava Sheva.", "Mumbai", 2022, 21_000_000L, 18);
        Startup clinicOS = startup("ClinicOS", "Healthtech", StartupStage.SEED,
                "Practice management for single-doctor clinics in tier-2 cities.", "Pune", 2023, 6_500_000L, 11);
        Startup vaultline = startup("Vaultline", "SaaS", StartupStage.PRE_SEED,
                "Compliance evidence collection for companies chasing their first SOC 2.", "Hyderabad", 2024, null, 6);

        founder(ledgerly, user("founder", UserType.STARTUP), StartupRole.FOUNDER);
        founder(shiprack, user("cofounder", UserType.STARTUP), StartupRole.FOUNDER);

        investments.save(investment(firm, ledgerly, LocalDate.now().minusMonths(14),
                60_000_000L, InvestmentRound.SERIES_A, new BigDecimal("9.50"), InvestmentStatus.ACTIVE,
                "Led the round. Board observer seat. Net revenue retention 128% at last update."));
        investments.save(investment(firm, shiprack, LocalDate.now().minusMonths(7),
                25_000_000L, InvestmentRound.SEED, new BigDecimal("6.00"), InvestmentStatus.ACTIVE,
                "Co-led with Antler. Pro-rata rights in the next round."));
        investments.save(investment(firm, clinicOS, LocalDate.now().minusYears(3),
                8_000_000L, InvestmentRound.PRE_SEED, new BigDecimal("4.00"), InvestmentStatus.EXITED,
                "Exited via acquihire. 1.7x."));

        poolEntries.save(pool(firm, vaultline, null, manager, InterestLevel.HIGH_PRIORITY,
                List.of("SOC 2", "founder-led sales"),
                "Warm intro from the Ledgerly founder. Wants to raise in Q1."));
        poolEntries.save(pool(firm, clinicOS, null, manager, InterestLevel.WATCHING,
                List.of("healthtech"), "Tracking post-exit; founders are building again."));
        poolEntries.save(pool(firm, null, "Nimbus Grid", manager, InterestLevel.INTERESTED,
                List.of("climate", "off-platform"),
                "Battery analytics, not on the platform yet. Met at the Bengaluru demo day."));

        // An open round with commitments at all three levels, so the progress ladder on the
        // founder's dashboard has something to show and deal flow isn't empty for the VC.
        FundingCycle round = fundingCycles.save(FundingCycle.builder()
                .startup(ledgerly)
                .roundType(InvestmentRound.SERIES_A)
                .targetAmount(250_000_000L)
                .currency("INR")
                .minTicketSize(10_000_000L)
                .maxTicketSize(100_000_000L)
                .status(FundingCycleStatus.OPEN)
                .pitchDeckUrl("https://ledgerly.example.com/deck")
                .openedAt(Instant.now().minus(Duration.ofDays(38)))
                .build());

        // Three different firms, because one firm gets one commitment per round — the demo has to
        // obey the same rule the API enforces, or it isn't demonstrating the product.
        VCFirm kestrel = coInvestor("Kestrel Capital", "Mumbai");
        VCFirm bayHarbour = coInvestor("Bay Harbour Partners", "Singapore");

        FundingCommitment ours = commitments.save(commitment(round, firm, 60_000_000L, CommitmentStatus.COMMITTED, 21));
        FundingCommitment theirs = commitments.save(commitment(round, kestrel, 40_000_000L, CommitmentStatus.SOFT_COMMITTED, 12));
        FundingCommitment indication = commitments.save(commitment(round, bayHarbour, 25_000_000L, CommitmentStatus.INDICATED, 4));

        // The history behind those three pledges.
        //
        // Seeded rather than derived, because the momentum chart reads the event log and nothing
        // else — without this the demo shows a round with ₹1.25 Cr on it and an empty chart, which
        // looks like the feature is broken rather than like a round nobody has moved on.
        //
        // Replaying these lands on exactly the bands above: Meridian ₹6 Cr committed, Kestrel
        // ₹4 Cr soft, Bay Harbour ₹2.5 Cr indicated.
        events.save(event(ours, null, null, CommitmentStatus.INDICATED, 30_000_000L, 30));
        events.save(event(ours, CommitmentStatus.INDICATED, 30_000_000L, CommitmentStatus.SOFT_COMMITTED, 60_000_000L, 26));
        events.save(event(ours, CommitmentStatus.SOFT_COMMITTED, 60_000_000L, CommitmentStatus.COMMITTED, 60_000_000L, 21));
        events.save(event(theirs, null, null, CommitmentStatus.INDICATED, 40_000_000L, 18));
        events.save(event(theirs, CommitmentStatus.INDICATED, 40_000_000L, CommitmentStatus.SOFT_COMMITTED, 40_000_000L, 12));
        events.save(event(indication, null, null, CommitmentStatus.INDICATED, 25_000_000L, 4));

        // A closed round in the history, so the founder's page isn't a single row.
        fundingCycles.save(FundingCycle.builder()
                .startup(ledgerly)
                .roundType(InvestmentRound.SEED)
                .targetAmount(45_000_000L)
                .currency("INR")
                .status(FundingCycleStatus.CLOSED)
                .openedAt(Instant.now().minus(Duration.ofDays(420)))
                .closedAt(Instant.now().minus(Duration.ofDays(300)))
                .build());

        log.info("""
                Demo data seeded.
                  VC:      owner{0}, pm{0}, staff{0}   (firm: Meridian Ventures)
                  Startup: founder{0} (Ledgerly), cofounder{0} (Shiprack)
                  Password for all of them comes from DEMO_PASSWORD / app.demo.password.
                """.replace("{0}", DEMO_DOMAIN));
    }

    private User user(String localPart, UserType type) {
        return users.save(User.builder()
                .email(localPart + DEMO_DOMAIN)
                .passwordHash(passwordEncoder.encode(demoPassword))
                .userType(type)
                .isActive(true)
                .build());
    }

    private VCMember member(VCFirm firm, User user, VCRole role) {
        return members.save(VCMember.builder()
                .firm(firm).user(user).role(role).joinedAt(Instant.now())
                .build());
    }

    private Startup startup(String name, String sector, StartupStage stage, String description,
                            String location, int foundedYear, Long annualRevenue, int teamSize) {
        return startups.save(Startup.builder()
                .name(name)
                .sector(sector)
                .stage(stage)
                .description(description)
                .location(location)
                .foundedYear(foundedYear)
                .annualRevenue(annualRevenue)
                .teamSize(teamSize)
                .website("https://" + name.toLowerCase() + ".example.com")
                .build());
    }

    private void founder(Startup startup, User user, StartupRole role) {
        startupMembers.save(StartupMember.builder()
                .startup(startup).user(user).role(role).joinedAt(Instant.now())
                .build());
    }

    private Investment investment(VCFirm firm, Startup startup, LocalDate date, long amount,
                                  InvestmentRound round, BigDecimal equity, InvestmentStatus status, String notes) {
        return Investment.builder()
                .vcFirm(firm).startup(startup)
                .investmentDate(date).amount(amount).currency("INR")
                .round(round).equityPercentage(equity).status(status).notes(notes)
                .build();
    }

    /** A firm that exists to be a name on someone else's cap table, with no members of its own. */
    private VCFirm coInvestor(String name, String location) {
        return firms.save(VCFirm.builder()
                .name(name)
                .description("Co-investor on the Ledgerly round.")
                .sectors(new ArrayList<>(List.of("Logistics")))
                .location(location)
                .investmentStage("Series A")
                .build());
    }

    private FundingCommitment commitment(FundingCycle round, VCFirm firm, long amount,
                                         CommitmentStatus status, int daysAgo) {
        return FundingCommitment.builder()
                .fundingCycle(round).vcFirm(firm).amount(amount).currency(round.getCurrency())
                .status(status).committedAt(Instant.now().minus(Duration.ofDays(daysAgo)))
                .build();
    }

    /**
     * One move in a seeded round's history. No actor: nobody made these, and the co-investor firms
     * deliberately have no members to attribute them to.
     */
    private CommitmentEvent event(FundingCommitment commitment,
                                  CommitmentStatus fromStatus, Long fromAmount,
                                  CommitmentStatus toStatus, long toAmount, int daysAgo) {
        return CommitmentEvent.builder()
                .commitment(commitment)
                .fundingCycle(commitment.getFundingCycle())
                .vcFirm(commitment.getVcFirm())
                .fromStatus(fromStatus).fromAmount(fromAmount)
                .toStatus(toStatus).toAmount(toAmount)
                .currency(commitment.getCurrency())
                .occurredAt(Instant.now().minus(Duration.ofDays(daysAgo)))
                .build();
    }

    private PoolEntry pool(VCFirm firm, Startup startup, String companyName, VCMember addedBy,
                           InterestLevel interest, List<String> tags, String notes) {
        return PoolEntry.builder()
                .vcFirm(firm).startup(startup).companyName(companyName).addedBy(addedBy)
                // Mutable: Hibernate replaces the contents of an element collection in place.
                .interestLevel(interest).tags(new ArrayList<>(tags)).notes(notes)
                .build();
    }
}
