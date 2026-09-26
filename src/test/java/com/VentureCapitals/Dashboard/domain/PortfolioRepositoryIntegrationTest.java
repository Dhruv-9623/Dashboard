package com.VentureCapitals.Dashboard.domain;

import com.VentureCapitals.Dashboard.config.BaseIntegrationTest;
import com.VentureCapitals.Dashboard.domain.investment.Investment;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRepository;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRound;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentStatus;
import com.VentureCapitals.Dashboard.domain.pool.InterestLevel;
import com.VentureCapitals.Dashboard.domain.pool.PoolEntry;
import com.VentureCapitals.Dashboard.domain.pool.PoolEntryRepository;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.startup.StartupStage;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserRepository;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCRole;
import com.VentureCapitals.Dashboard.testdata.TestDataBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/** The new queries actually execute: projections, specifications, derived queries. */
@Transactional
class PortfolioRepositoryIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private VCFirmRepository vcFirmRepository;
    @Autowired
    private VCMemberRepository vcMemberRepository;
    @Autowired
    private StartupRepository startupRepository;
    @Autowired
    private InvestmentRepository investmentRepository;
    @Autowired
    private PoolEntryRepository poolEntryRepository;

    private VCFirm firmWithMember() {
        User user = userRepository.save(TestDataBuilder.user().withUserType(UserType.VC).build());
        VCFirm firm = vcFirmRepository.save(TestDataBuilder.vcFirm().withName("Meridian").build());
        vcMemberRepository.save(VCMember.builder().user(user).firm(firm).role(VCRole.OWNER).joinedAt(Instant.now()).build());
        return firm;
    }

    private Startup startup(String name, String sector, StartupStage stage) {
        return startupRepository.save(Startup.builder().name(name).sector(sector).stage(stage).build());
    }

    private void invest(VCFirm firm, Startup startup, long amount, String currency, InvestmentStatus status) {
        investmentRepository.save(Investment.builder().vcFirm(firm).startup(startup).investmentDate(LocalDate.now())
                .amount(amount).currency(currency).round(InvestmentRound.SEED).status(status).build());
    }

    @Test
    void investment_summary_queries_group_by_currency_and_status() {
        VCFirm firm = firmWithMember();
        VCFirm otherFirm = firmWithMember();
        Startup lumen = startup("Lumen", "Healthtech", StartupStage.SEED);
        invest(firm, lumen, 60_000_000, "INR", InvestmentStatus.ACTIVE);
        invest(firm, lumen, 40_000_000, "INR", InvestmentStatus.EXITED);
        invest(firm, lumen, 2_000_000, "USD", InvestmentStatus.ACTIVE);
        invest(otherFirm, lumen, 999, "INR", InvestmentStatus.ACTIVE);

        Map<String, Long> totals = investmentRepository.sumAmountByCurrency(firm.getId()).stream()
                .collect(Collectors.toMap(InvestmentRepository.CurrencyTotal::getCurrency, InvestmentRepository.CurrencyTotal::getTotal));
        Map<InvestmentStatus, Long> counts = investmentRepository.countByStatus(firm.getId()).stream()
                .collect(Collectors.toMap(InvestmentRepository.StatusCount::getStatus, InvestmentRepository.StatusCount::getCount));

        assertThat(totals).containsExactlyInAnyOrderEntriesOf(Map.of("INR", 100_000_000L, "USD", 2_000_000L));
        assertThat(counts).containsExactlyInAnyOrderEntriesOf(Map.of(InvestmentStatus.ACTIVE, 2L, InvestmentStatus.EXITED, 1L));
        assertThat(investmentRepository.findByVcFirmId(firm.getId(), PageRequest.of(0, 2)).getTotalElements()).isEqualTo(3);
    }

    @Test
    void startup_search_filters_by_name_sector_and_stage() {
        startup("Lumen Health", "Healthtech", StartupStage.SEED);
        startup("Ledgerly", "Fintech", StartupStage.SERIES_A);
        startup("Vaultline", "Fintech", StartupStage.SEED);

        List<String> fintechSeed = startupRepository.findAll(
                        StartupRepository.matching(null, "Fintech", StartupStage.SEED), PageRequest.of(0, 10, Sort.by("name")))
                .map(Startup::getName).getContent();
        List<String> byName = startupRepository.findAll(
                        StartupRepository.matching("  LEDG ", null, null), PageRequest.of(0, 10))
                .map(Startup::getName).getContent();
        long everything = startupRepository.findAll(StartupRepository.matching(" ", "", null), PageRequest.of(0, 10))
                .getTotalElements();

        assertThat(fintechSeed).containsExactly("Vaultline");
        assertThat(byName).containsExactly("Ledgerly");
        assertThat(everything).isGreaterThanOrEqualTo(3);
    }

    /**
     * Regression: controllers map entities after the service transaction closes (open-in-view is
     * off). A FETCH entity graph made the EAGER tags lazy, so listing the pool failed with
     * LazyInitializationException in the running app while in-transaction tests passed.
     */
    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void listed_pool_entries_and_investments_are_usable_outside_a_transaction() {
        VCFirm firm = firmWithMember();
        VCMember member = vcMemberRepository.findByFirmId(firm.getId()).get(0);
        Startup startup = startup("Detached " + System.nanoTime(), "SaaS", StartupStage.SEED);
        poolEntryRepository.save(PoolEntry.builder().vcFirm(firm).startup(startup).addedBy(member)
                .tags(new java.util.ArrayList<>(List.of("ai-infra"))).interestLevel(InterestLevel.WATCHING).build());
        invest(firm, startup, 1_000, "INR", InvestmentStatus.ACTIVE);

        PoolEntry entry = poolEntryRepository.findByVcFirmId(firm.getId(), PageRequest.of(0, 10)).getContent().get(0);
        Investment investment = investmentRepository.findByVcFirmId(firm.getId(), PageRequest.of(0, 10)).getContent().get(0);

        assertThat(entry.getTags()).containsExactly("ai-infra");
        assertThat(entry.getStartup().getName()).startsWith("Detached");
        assertThat(entry.getAddedBy().getUser().getEmail()).isNotBlank();
        assertThat(investment.getStartup().getSector()).isEqualTo("SaaS");
        assertThat(investment.getVcFirm().getId()).isEqualTo(firm.getId());
    }

    @Test
    void pool_duplicate_check_and_filtered_listing() {
        VCFirm firm = firmWithMember();
        Startup stackline = startup("Stackline AI", "AI/ML", StartupStage.SEED);
        poolEntryRepository.save(PoolEntry.builder().vcFirm(firm).startup(stackline)
                .interestLevel(InterestLevel.HIGH_PRIORITY).build());
        poolEntryRepository.save(PoolEntry.builder().vcFirm(firm).companyName("Nimbus Payroll")
                .companySector("SaaS").interestLevel(InterestLevel.WATCHING).build());

        assertThat(poolEntryRepository.existsByVcFirmIdAndStartupId(firm.getId(), stackline.getId())).isTrue();
        assertThat(poolEntryRepository.findByVcFirmIdAndInterestLevel(firm.getId(), InterestLevel.WATCHING,
                PageRequest.of(0, 10)).map(PoolEntry::getCompanyName).getContent()).containsExactly("Nimbus Payroll");
    }
}
