package com.VentureCapitals.Dashboard.config;

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

    private PoolEntry pool(VCFirm firm, Startup startup, String companyName, VCMember addedBy,
                           InterestLevel interest, List<String> tags, String notes) {
        return PoolEntry.builder()
                .vcFirm(firm).startup(startup).companyName(companyName).addedBy(addedBy)
                // Mutable: Hibernate replaces the contents of an element collection in place.
                .interestLevel(interest).tags(new ArrayList<>(tags)).notes(notes)
                .build();
    }
}
