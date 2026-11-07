package com.VentureCapitals.Dashboard.domain.funding;

import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.config.BaseUnitTest;
import com.VentureCapitals.Dashboard.domain.investment.Investment;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRequest;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRound;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentService;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupMember;
import com.VentureCapitals.Dashboard.domain.startup.StartupMemberRepository;
import com.VentureCapitals.Dashboard.domain.startup.StartupRole;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCRole;
import com.VentureCapitals.Dashboard.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.entry;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** One test per rule in {@link FundingService}'s contract. */
class FundingServiceTest extends BaseUnitTest {

    @Mock
    private FundingCycleRepository cycleRepository;
    @Mock
    private FundingCommitmentRepository commitmentRepository;
    @Mock
    private CommitmentEventRepository eventRepository;
    @Mock
    private StartupMemberRepository startupMemberRepository;
    @Mock
    private VCMemberRepository vcMemberRepository;
    @Mock
    private InvestmentService investmentService;

    private FundingService service;

    private User founder;
    private User investor;
    private Startup startup;
    private VCFirm firm;

    @BeforeEach
    @Override
    public void setUp() {
        service = new FundingService(cycleRepository, commitmentRepository, eventRepository,
                startupMemberRepository, new FirmAccessPolicy(vcMemberRepository), investmentService);

        founder = TestDataBuilder.user().withId(UUID.randomUUID()).withUserType(UserType.STARTUP).build();
        investor = TestDataBuilder.user().withId(UUID.randomUUID()).withUserType(UserType.VC).build();

        startup = TestDataBuilder.startup().withName("Ledgerly").build();
        startup.setId(UUID.randomUUID());

        firm = TestDataBuilder.vcFirm().withName("Meridian").build();
        firm.setId(UUID.randomUUID());
    }

    // --- helpers ----------------------------------------------------------------------------

    private void founderOwnsStartup() {
        when(startupMemberRepository.findByUserId(founder.getId())).thenReturn(Optional.of(
                StartupMember.builder().user(founder).startup(startup)
                        .role(StartupRole.FOUNDER).joinedAt(Instant.now()).build()));
    }

    private void investorIs(VCRole role) {
        when(vcMemberRepository.findByUserId(investor.getId())).thenReturn(Optional.of(
                VCMember.builder().user(investor).firm(firm).role(role).joinedAt(Instant.now()).build()));
    }

    private FundingCycle openCycle() {
        FundingCycle cycle = FundingCycle.builder()
                .startup(startup)
                .roundType(InvestmentRound.SEED)
                .targetAmount(50_000_000L)
                .currency("INR")
                .status(FundingCycleStatus.OPEN)
                .openedAt(Instant.now())
                .build();
        cycle.setId(UUID.randomUUID());
        return cycle;
    }

    private FundingCycleRequest request(FundingCycleStatus status) {
        FundingCycleRequest request = new FundingCycleRequest();
        request.setRoundType(InvestmentRound.SEED);
        request.setTargetAmount(50_000_000L);
        request.setCurrency("INR");
        request.setStatus(status);
        return request;
    }

    private CommitmentRequest commitment(long amount, CommitmentStatus status) {
        CommitmentRequest request = new CommitmentRequest();
        request.setAmount(amount);
        request.setCurrency("INR");
        request.setStatus(status);
        return request;
    }


    // --- The firm's own book, and withdrawal ------------------------------------------------

    private FundingCommitment commitmentOf(VCFirm owner, long amount, CommitmentStatus status) {
        FundingCommitment c = FundingCommitment.builder()
                .fundingCycle(openCycle()).vcFirm(owner)
                .amount(amount).currency("INR").status(status)
                .committedAt(Instant.now()).build();
        c.setId(UUID.randomUUID());
        return c;
    }

    @Test
    void a_firms_book_is_scoped_to_the_session_not_to_a_parameter() {
        investorIs(VCRole.PORTFOLIO_MANAGER);
        Page<FundingCommitment> page = new PageImpl<>(List.of(commitmentOf(firm, 10_000_000L, CommitmentStatus.COMMITTED)));
        when(commitmentRepository.findFirmBook(eq(firm.getId()), isNull(), any(Pageable.class))).thenReturn(page);

        assertThat(service.listFirmCommitments(investor, null, PageRequest.of(0, 20))).hasSize(1);
        // The firm id came from the membership, so there is no request field to tamper with.
        verify(commitmentRepository).findFirmBook(eq(firm.getId()), isNull(), any(Pageable.class));
    }

    @Test
    void staff_may_read_their_own_firms_book_even_though_they_cannot_pledge() {
        investorIs(VCRole.STAFF);
        when(commitmentRepository.findFirmBook(eq(firm.getId()), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        assertThat(service.listFirmCommitments(investor, null, PageRequest.of(0, 20))).isEmpty();
    }

    @Test
    void someone_in_no_firm_has_no_book_to_read() {
        when(vcMemberRepository.findByUserId(investor.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.listFirmCommitments(investor, null, PageRequest.of(0, 20)))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void the_book_can_be_narrowed_to_one_band() {
        investorIs(VCRole.OWNER);
        when(commitmentRepository.findFirmBook(eq(firm.getId()), eq(CommitmentStatus.WITHDRAWN), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(commitmentOf(firm, 5_000_000L, CommitmentStatus.WITHDRAWN))));

        assertThat(service.listFirmCommitments(investor, CommitmentStatus.WITHDRAWN, PageRequest.of(0, 20)))
                .singleElement()
                .extracting(FundingCommitment::getStatus)
                .isEqualTo(CommitmentStatus.WITHDRAWN);
    }

    @Test
    void a_firm_can_withdraw_from_an_open_round() {
        investorIs(VCRole.OWNER);
        FundingCommitment mine = commitmentOf(firm, 20_000_000L, CommitmentStatus.COMMITTED);
        when(commitmentRepository.findWithCycleById(mine.getId())).thenReturn(Optional.of(mine));
        when(commitmentRepository.save(any(FundingCommitment.class))).thenAnswer(i -> i.getArgument(0));

        FundingCommitment result = service.updateCommitmentStatus(investor, mine.getId(), CommitmentStatus.WITHDRAWN);

        assertThat(result.getStatus()).isEqualTo(CommitmentStatus.WITHDRAWN);
        // The row survives: the founder needs to know the investor left, not find a gap.
        assertThat(result.getAmount()).isEqualTo(20_000_000L);
    }

    @Test
    void a_founder_cannot_withdraw_an_investors_commitment_for_them() {
        // No startup stub on purpose: the gate is firm membership alone, so the founder is turned
        // away for not being in the firm — owning the round never enters into it.
        when(vcMemberRepository.findByUserId(founder.getId())).thenReturn(Optional.empty());
        FundingCommitment theirs = commitmentOf(firm, 20_000_000L, CommitmentStatus.COMMITTED);
        when(commitmentRepository.findWithCycleById(theirs.getId())).thenReturn(Optional.of(theirs));

        assertThatThrownBy(() -> service.updateCommitmentStatus(founder, theirs.getId(), CommitmentStatus.WITHDRAWN))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void staff_cannot_withdraw_a_commitment() {
        investorIs(VCRole.STAFF);
        FundingCommitment mine = commitmentOf(firm, 20_000_000L, CommitmentStatus.COMMITTED);
        when(commitmentRepository.findWithCycleById(mine.getId())).thenReturn(Optional.of(mine));

        assertThatThrownBy(() -> service.updateCommitmentStatus(investor, mine.getId(), CommitmentStatus.WITHDRAWN))
                .isInstanceOf(UnauthorizedException.class);
        verify(commitmentRepository, never()).save(any());
    }

    @Test
    void a_withdrawn_firm_that_comes_back_reuses_its_row_rather_than_adding_a_second() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = openCycle();
        FundingCommitment withdrawn = FundingCommitment.builder()
                .fundingCycle(cycle).vcFirm(firm).amount(5_000_000L).currency("INR")
                .status(CommitmentStatus.WITHDRAWN).committedAt(Instant.now()).build();
        withdrawn.setId(UUID.randomUUID());

        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        when(commitmentRepository.findByFundingCycleIdAndVcFirmId(cycle.getId(), firm.getId()))
                .thenReturn(List.of(withdrawn));
        when(commitmentRepository.save(any(FundingCommitment.class))).thenAnswer(i -> i.getArgument(0));

        FundingCommitment revived = service.commit(investor, cycle.getId(),
                commitment(12_000_000L, CommitmentStatus.SOFT_COMMITTED));

        assertThat(revived.getId()).isEqualTo(withdrawn.getId());
        assertThat(revived.getStatus()).isEqualTo(CommitmentStatus.SOFT_COMMITTED);
        assertThat(revived.getAmount()).isEqualTo(12_000_000L);
    }

    // --- Rule 1: rounds belong to founders --------------------------------------------------

    @Test
    void an_investor_cannot_open_a_round() {
        when(startupMemberRepository.findByUserId(investor.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createCycle(investor, request(FundingCycleStatus.OPEN)))
                .isInstanceOf(UnauthorizedException.class);
        verify(cycleRepository, never()).save(any());
    }

    @Test
    void a_founder_cannot_edit_another_startups_round() {
        founderOwnsStartup();
        Startup other = TestDataBuilder.startup().build();
        other.setId(UUID.randomUUID());
        FundingCycle theirs = openCycle();
        theirs.setStartup(other);
        when(cycleRepository.findWithStartupById(theirs.getId())).thenReturn(Optional.of(theirs));

        assertThatThrownBy(() -> service.updateCycle(founder, theirs.getId(), request(FundingCycleStatus.OPEN)))
                .isInstanceOf(UnauthorizedException.class);
    }

    // --- One open round at a time -----------------------------------------------------------

    @Test
    void a_second_open_round_is_refused_with_a_sentence_the_founder_can_act_on() {
        founderOwnsStartup();
        when(cycleRepository.findByStartupIdAndStatus(startup.getId(), FundingCycleStatus.OPEN))
                .thenReturn(Optional.of(openCycle()));

        assertThatThrownBy(() -> service.createCycle(founder, request(FundingCycleStatus.OPEN)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("already have an open round");
    }

    @Test
    void a_closed_round_can_always_be_recorded_alongside_an_open_one() {
        founderOwnsStartup();
        when(cycleRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        FundingCycle saved = service.createCycle(founder, request(FundingCycleStatus.CLOSED));

        assertThat(saved.getStatus()).isEqualTo(FundingCycleStatus.CLOSED);
        verify(cycleRepository, never()).findByStartupIdAndStatus(any(), any());
    }

    // --- closedAt belongs to the server -----------------------------------------------------

    @Test
    void closing_a_round_stamps_the_time_and_reopening_clears_it() {
        founderOwnsStartup();
        FundingCycle cycle = openCycle();
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        when(cycleRepository.findByStartupIdAndStatus(startup.getId(), FundingCycleStatus.OPEN))
                .thenReturn(Optional.empty());
        when(cycleRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        FundingCycle closed = service.updateCycle(founder, cycle.getId(), request(FundingCycleStatus.CLOSED));
        assertThat(closed.getClosedAt()).isNotNull();

        FundingCycle reopened = service.updateCycle(founder, cycle.getId(), request(FundingCycleStatus.OPEN));
        assertThat(reopened.getClosedAt()).isNull();
    }

    @Test
    void the_currency_cannot_change_once_money_is_pledged_against_it() {
        founderOwnsStartup();
        FundingCycle cycle = openCycle();
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        when(commitmentRepository.findByFundingCycleIdOrderByCommittedAtDesc(cycle.getId()))
                .thenReturn(List.of(FundingCommitment.builder().amount(1L).build()));

        FundingCycleRequest request = request(FundingCycleStatus.OPEN);
        request.setCurrency("USD");

        assertThatThrownBy(() -> service.updateCycle(founder, cycle.getId(), request))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("currency");
    }

    // --- Rule 2: STAFF can read, not pledge --------------------------------------------------

    @Test
    void staff_cannot_commit_capital() {
        investorIs(VCRole.STAFF);

        // No round is stubbed on purpose: the role gate runs before the round is loaded, so a
        // STAFF member can't even probe which round ids exist.
        assertThatThrownBy(() -> service.commit(investor, UUID.randomUUID(),
                commitment(5_000_000L, CommitmentStatus.COMMITTED)))
                .isInstanceOf(UnauthorizedException.class);
        verify(commitmentRepository, never()).save(any());
        verify(cycleRepository, never()).findWithStartupById(any());
    }

    @Test
    void a_portfolio_manager_can_commit() {
        investorIs(VCRole.PORTFOLIO_MANAGER);
        FundingCycle cycle = openCycle();
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        when(commitmentRepository.findByFundingCycleIdAndVcFirmId(cycle.getId(), firm.getId()))
                .thenReturn(List.of());
        when(commitmentRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        FundingCommitment saved = service.commit(investor, cycle.getId(),
                commitment(5_000_000L, CommitmentStatus.SOFT_COMMITTED));

        assertThat(saved.getAmount()).isEqualTo(5_000_000L);
        assertThat(saved.getVcFirm()).isEqualTo(firm);
    }

    // --- A round that isn't open takes nothing ----------------------------------------------

    @Test
    void a_paused_round_takes_no_commitments() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = openCycle();
        cycle.setStatus(FundingCycleStatus.PAUSED);
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));

        assertThatThrownBy(() -> service.commit(investor, cycle.getId(), commitment(1_000_000L, CommitmentStatus.INDICATED)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("isn't open");
    }

    // --- Currency and ticket band ------------------------------------------------------------

    @Test
    void a_commitment_in_the_wrong_currency_is_refused_and_says_which_one_the_round_wants() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = openCycle();
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));

        CommitmentRequest request = commitment(1_000_000L, CommitmentStatus.COMMITTED);
        request.setCurrency("USD");

        assertThatThrownBy(() -> service.commit(investor, cycle.getId(), request))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("INR");
    }

    @Test
    void a_cheque_below_the_minimum_ticket_is_refused() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = openCycle();
        cycle.setMinTicketSize(5_000_000L);
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));

        assertThatThrownBy(() -> service.commit(investor, cycle.getId(), commitment(1_000_000L, CommitmentStatus.COMMITTED)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("minimum ticket");
    }

    @Test
    void a_cheque_above_the_maximum_ticket_is_refused() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = openCycle();
        cycle.setMaxTicketSize(5_000_000L);
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));

        assertThatThrownBy(() -> service.commit(investor, cycle.getId(), commitment(9_000_000L, CommitmentStatus.COMMITTED)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("maximum ticket");
    }

    @Test
    void a_ticket_band_that_cannot_contain_anything_is_refused() {
        founderOwnsStartup();
        FundingCycleRequest request = request(FundingCycleStatus.OPEN);
        request.setMinTicketSize(9_000_000L);
        request.setMaxTicketSize(1_000_000L);

        assertThatThrownBy(() -> service.createCycle(founder, request))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("minimum ticket size");
    }

    // --- One commitment per firm -------------------------------------------------------------

    @Test
    void committing_twice_updates_the_same_record_rather_than_adding_a_second_investor() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = openCycle();
        FundingCommitment existing = FundingCommitment.builder()
                .fundingCycle(cycle).vcFirm(firm).amount(2_000_000L).currency("INR")
                .status(CommitmentStatus.INDICATED).committedAt(Instant.now()).build();
        existing.setId(UUID.randomUUID());

        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        when(commitmentRepository.findByFundingCycleIdAndVcFirmId(cycle.getId(), firm.getId()))
                .thenReturn(List.of(existing));
        when(commitmentRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        FundingCommitment saved = service.commit(investor, cycle.getId(),
                commitment(8_000_000L, CommitmentStatus.COMMITTED));

        assertThat(saved.getId()).isEqualTo(existing.getId());
        assertThat(saved.getAmount()).isEqualTo(8_000_000L);
        assertThat(saved.getStatus()).isEqualTo(CommitmentStatus.COMMITTED);
    }

    // --- Rule 3: commitment visibility --------------------------------------------------------

    @Test
    void the_founder_sees_every_investor_on_their_round() {
        FundingCycle cycle = openCycle();
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        founderOwnsStartup();
        when(commitmentRepository.findByFundingCycleIdOrderByCommittedAtDesc(cycle.getId()))
                .thenReturn(List.of(FundingCommitment.builder().amount(1L).build(),
                        FundingCommitment.builder().amount(2L).build()));

        assertThat(service.listCommitments(founder, cycle.getId())).hasSize(2);
    }

    @Test
    void an_investor_sees_only_its_own_firms_commitment_never_a_rivals() {
        FundingCycle cycle = openCycle();
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        when(startupMemberRepository.findByUserId(investor.getId())).thenReturn(Optional.empty());
        investorIs(VCRole.STAFF);
        when(commitmentRepository.findByFundingCycleIdAndVcFirmId(cycle.getId(), firm.getId()))
                .thenReturn(List.of(FundingCommitment.builder().amount(1L).build()));

        assertThat(service.listCommitments(investor, cycle.getId())).hasSize(1);
        // The "everyone" query is never even reached for an investor.
        verify(commitmentRepository, never()).findByFundingCycleIdOrderByCommittedAtDesc(any());
    }

    // --- Rule 4: only the committing firm moves its own commitment ---------------------------

    @Test
    void a_founder_cannot_promote_an_investors_indication_into_a_commitment() {
        FundingCycle cycle = openCycle();
        FundingCommitment theirs = FundingCommitment.builder()
                .fundingCycle(cycle).vcFirm(firm).amount(1_000_000L).currency("INR")
                .status(CommitmentStatus.INDICATED).committedAt(Instant.now()).build();
        theirs.setId(UUID.randomUUID());

        when(commitmentRepository.findWithCycleById(theirs.getId())).thenReturn(Optional.of(theirs));
        when(vcMemberRepository.findByUserId(founder.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateCommitmentStatus(founder, theirs.getId(), CommitmentStatus.COMMITTED))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void a_rival_firm_cannot_move_someone_elses_commitment() {
        FundingCycle cycle = openCycle();
        VCFirm rival = TestDataBuilder.vcFirm().withName("Rival").build();
        rival.setId(UUID.randomUUID());
        FundingCommitment theirs = FundingCommitment.builder()
                .fundingCycle(cycle).vcFirm(rival).amount(1_000_000L).currency("INR")
                .status(CommitmentStatus.INDICATED).committedAt(Instant.now()).build();
        theirs.setId(UUID.randomUUID());

        when(commitmentRepository.findWithCycleById(theirs.getId())).thenReturn(Optional.of(theirs));
        investorIs(VCRole.OWNER);

        assertThatThrownBy(() -> service.updateCommitmentStatus(investor, theirs.getId(), CommitmentStatus.COMMITTED))
                .isInstanceOf(UnauthorizedException.class);
    }

    // --- Totals ------------------------------------------------------------------------------

    @Test
    void totals_keep_the_bands_apart_rather_than_summing_them_into_one_headline() {
        FundingCycle cycle = openCycle();
        when(commitmentRepository.sumByCycleAndStatus(List.of(cycle.getId()))).thenReturn(List.of(
                total(cycle.getId(), CommitmentStatus.COMMITTED, 10_000_000L, 1),
                total(cycle.getId(), CommitmentStatus.SOFT_COMMITTED, 5_000_000L, 2),
                total(cycle.getId(), CommitmentStatus.INDICATED, 3_000_000L, 3)));

        CycleTotals totals = service.totalsFor(cycle);

        assertThat(totals.committed()).isEqualTo(10_000_000L);
        assertThat(totals.softCommitted()).isEqualTo(5_000_000L);
        assertThat(totals.indicated()).isEqualTo(3_000_000L);
        assertThat(totals.commitmentCount()).isEqualTo(6);
        // What a founder could forecast: committed and soft, but never the indications.
        assertThat(totals.likely()).isEqualTo(15_000_000L);
    }

    @Test
    void a_round_with_no_commitments_reports_zeros_rather_than_nulls() {
        FundingCycle cycle = openCycle();
        when(commitmentRepository.sumByCycleAndStatus(List.of(cycle.getId()))).thenReturn(List.of());

        assertThat(service.totalsFor(cycle)).isEqualTo(CycleTotals.EMPTY);
    }

    private FundingCommitmentRepository.CommitmentTotal total(
            UUID cycleId, CommitmentStatus status, long amount, long count) {
        return new FundingCommitmentRepository.CommitmentTotal() {
            @Override public UUID getCycleId() { return cycleId; }
            @Override public CommitmentStatus getStatus() { return status; }
            @Override public long getTotal() { return amount; }
            @Override public long getCount() { return count; }
        };
    }

    // --- The firm's book as totals --------------------------------------------------------------

    private FundingCommitmentRepository.BookTotal bookRow(
            String currency, CommitmentStatus status, long total, long count) {
        return new FundingCommitmentRepository.BookTotal() {
            @Override public String getCurrency() { return currency; }
            @Override public CommitmentStatus getStatus() { return status; }
            @Override public long getTotal() { return total; }
            @Override public long getCount() { return count; }
        };
    }

    @Test
    void the_book_summary_keeps_signed_money_apart_from_conversation() {
        investorIs(VCRole.OWNER);
        when(commitmentRepository.sumFirmBookByCurrencyAndStatus(firm.getId())).thenReturn(List.of(
                bookRow("INR", CommitmentStatus.COMMITTED, 30_000_000L, 1),
                bookRow("INR", CommitmentStatus.SOFT_COMMITTED, 25_000_000L, 2),
                bookRow("INR", CommitmentStatus.INDICATED, 9_000_000L, 3)));
        when(commitmentRepository.countReadyToRecord(firm.getId())).thenReturn(0L);

        BookSummary summary = service.summarizeFirmBook(investor);

        assertThat(summary.getCommittedByCurrency()).containsExactly(entry("INR", 30_000_000L));
        // Committed plus soft. The indication is deliberately not in the forecast.
        assertThat(summary.getLikelyByCurrency()).containsExactly(entry("INR", 55_000_000L));
        assertThat(summary.getLiveCount()).isEqualTo(6);
    }

    @Test
    void the_book_summary_keeps_currencies_apart() {
        investorIs(VCRole.OWNER);
        when(commitmentRepository.sumFirmBookByCurrencyAndStatus(firm.getId())).thenReturn(List.of(
                bookRow("INR", CommitmentStatus.COMMITTED, 30_000_000L, 1),
                bookRow("USD", CommitmentStatus.COMMITTED, 500_000L, 1)));
        when(commitmentRepository.countReadyToRecord(firm.getId())).thenReturn(0L);

        // Summing them would invent a third exposure that doesn't exist.
        assertThat(service.summarizeFirmBook(investor).getCommittedByCurrency())
                .containsOnly(entry("INR", 30_000_000L), entry("USD", 500_000L));
    }

    @Test
    void the_book_summary_reports_what_is_waiting_to_be_recorded() {
        investorIs(VCRole.STAFF);
        when(commitmentRepository.sumFirmBookByCurrencyAndStatus(firm.getId())).thenReturn(List.of());
        when(commitmentRepository.countReadyToRecord(firm.getId())).thenReturn(2L);

        // Counted by the database across the whole book, not from a page of rows — the prompt has
        // to know about a closed round that happens to be on page two.
        assertThat(service.summarizeFirmBook(investor).getReadyToRecordCount()).isEqualTo(2);
    }

    @Test
    void a_firm_with_nothing_pledged_gets_zeros_rather_than_nulls() {
        investorIs(VCRole.OWNER);
        when(commitmentRepository.sumFirmBookByCurrencyAndStatus(firm.getId())).thenReturn(List.of());
        when(commitmentRepository.countReadyToRecord(firm.getId())).thenReturn(0L);

        BookSummary summary = service.summarizeFirmBook(investor);

        assertThat(summary.getCommittedByCurrency()).isEmpty();
        assertThat(summary.getLikelyByCurrency()).isEmpty();
        assertThat(summary.getLiveCount()).isZero();
    }

    @Test
    void someone_in_no_firm_has_no_book_summary_to_read() {
        when(vcMemberRepository.findByUserId(investor.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.summarizeFirmBook(investor))
                .isInstanceOf(UnauthorizedException.class);
    }

    // --- The event log ------------------------------------------------------------------------

    /** The row the service appended, for asserting on what was recorded. */
    private CommitmentEvent recordedEvent() {
        ArgumentCaptor<CommitmentEvent> captor = ArgumentCaptor.forClass(CommitmentEvent.class);
        verify(eventRepository).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void a_new_pledge_opens_the_event_log_with_a_creation_row() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = openCycle();
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        when(commitmentRepository.findByFundingCycleIdAndVcFirmId(cycle.getId(), firm.getId()))
                .thenReturn(List.of());
        when(commitmentRepository.save(any(FundingCommitment.class))).thenAnswer(i -> i.getArgument(0));

        service.commit(investor, cycle.getId(), commitment(10_000_000L, CommitmentStatus.INDICATED));

        CommitmentEvent event = recordedEvent();
        // Both "from" fields null together is what marks a creation — there is no type column.
        assertThat(event.getFromStatus()).isNull();
        assertThat(event.getFromAmount()).isNull();
        assertThat(event.isCreation()).isTrue();
        assertThat(event.getToStatus()).isEqualTo(CommitmentStatus.INDICATED);
        assertThat(event.getToAmount()).isEqualTo(10_000_000L);
        assertThat(event.getActor()).isEqualTo(investor);
        assertThat(event.getVcFirm()).isEqualTo(firm);
    }

    @Test
    void raising_a_pledge_records_both_sides_of_the_move() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = openCycle();
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        FundingCommitment existing = commitmentOf(firm, 5_000_000L, CommitmentStatus.INDICATED);
        when(commitmentRepository.findByFundingCycleIdAndVcFirmId(cycle.getId(), firm.getId()))
                .thenReturn(List.of(existing));
        when(commitmentRepository.save(any(FundingCommitment.class))).thenAnswer(i -> i.getArgument(0));

        service.commit(investor, cycle.getId(), commitment(12_000_000L, CommitmentStatus.COMMITTED));

        CommitmentEvent event = recordedEvent();
        // Both the band and the number moved, and the log has to carry each so the founder's
        // momentum chart can recompute the running totals at any point in time.
        assertThat(event.getFromStatus()).isEqualTo(CommitmentStatus.INDICATED);
        assertThat(event.getFromAmount()).isEqualTo(5_000_000L);
        assertThat(event.getToStatus()).isEqualTo(CommitmentStatus.COMMITTED);
        assertThat(event.getToAmount()).isEqualTo(12_000_000L);
        assertThat(event.isCreation()).isFalse();
    }

    @Test
    void changing_only_the_amount_is_recorded_as_a_change_not_a_creation() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = openCycle();
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        when(commitmentRepository.findByFundingCycleIdAndVcFirmId(cycle.getId(), firm.getId()))
                .thenReturn(List.of(commitmentOf(firm, 5_000_000L, CommitmentStatus.COMMITTED)));
        when(commitmentRepository.save(any(FundingCommitment.class))).thenAnswer(i -> i.getArgument(0));

        service.commit(investor, cycle.getId(), commitment(9_000_000L, CommitmentStatus.COMMITTED));

        CommitmentEvent event = recordedEvent();
        assertThat(event.getFromStatus()).isEqualTo(CommitmentStatus.COMMITTED);
        assertThat(event.getFromStatus()).isEqualTo(event.getToStatus());
        assertThat(event.getFromAmount()).isEqualTo(5_000_000L);
        assertThat(event.getToAmount()).isEqualTo(9_000_000L);
    }

    @Test
    void restating_an_unchanged_pledge_records_nothing() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = openCycle();
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        when(commitmentRepository.findByFundingCycleIdAndVcFirmId(cycle.getId(), firm.getId()))
                .thenReturn(List.of(commitmentOf(firm, 8_000_000L, CommitmentStatus.COMMITTED)));
        when(commitmentRepository.save(any(FundingCommitment.class))).thenAnswer(i -> i.getArgument(0));

        service.commit(investor, cycle.getId(), commitment(8_000_000L, CommitmentStatus.COMMITTED));

        // Nothing moved, so nothing happened in the round's life. A row here would put a step on
        // the founder's momentum chart where no money changed.
        verify(eventRepository, never()).save(any(CommitmentEvent.class));
    }

    @Test
    void a_withdrawal_is_recorded_like_any_other_move() {
        investorIs(VCRole.OWNER);
        FundingCommitment mine = commitmentOf(firm, 20_000_000L, CommitmentStatus.COMMITTED);
        when(commitmentRepository.findWithCycleById(mine.getId())).thenReturn(Optional.of(mine));
        when(commitmentRepository.save(any(FundingCommitment.class))).thenAnswer(i -> i.getArgument(0));

        service.updateCommitmentStatus(investor, mine.getId(), CommitmentStatus.WITHDRAWN);

        CommitmentEvent event = recordedEvent();
        assertThat(event.getFromStatus()).isEqualTo(CommitmentStatus.COMMITTED);
        assertThat(event.getToStatus()).isEqualTo(CommitmentStatus.WITHDRAWN);
        // The amount is unchanged by a withdrawal — what left the round is the whole pledge.
        assertThat(event.getToAmount()).isEqualTo(20_000_000L);
        assertThat(event.getFromAmount()).isEqualTo(20_000_000L);
    }

    @Test
    void the_founder_sees_every_investors_history() {
        FundingCycle cycle = openCycle();
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        founderOwnsStartup();
        when(eventRepository.findByFundingCycleIdOrderByOccurredAtAsc(cycle.getId()))
                .thenReturn(List.of(new CommitmentEvent(), new CommitmentEvent()));

        assertThat(service.listCycleHistory(founder, cycle.getId())).hasSize(2);
    }

    @Test
    void an_investor_sees_only_its_own_firms_history_never_a_rivals() {
        FundingCycle cycle = openCycle();
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        when(startupMemberRepository.findByUserId(investor.getId())).thenReturn(Optional.empty());
        investorIs(VCRole.STAFF);
        when(eventRepository.findByFundingCycleIdAndVcFirmIdOrderByOccurredAtAsc(cycle.getId(), firm.getId()))
                .thenReturn(List.of(new CommitmentEvent()));

        assertThat(service.listCycleHistory(investor, cycle.getId())).hasSize(1);
        // Timing shows a rival's process, not just its position — a sharper leak than the amount.
        verify(eventRepository, never()).findByFundingCycleIdOrderByOccurredAtAsc(any());
    }

    // --- Who can read a round -----------------------------------------------------------------

    @Test
    void a_closed_round_is_not_readable_by_a_firm_that_never_backed_it() {
        FundingCycle cycle = closedCycle();
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        when(startupMemberRepository.findByUserId(investor.getId())).thenReturn(Optional.empty());
        investorIs(VCRole.OWNER);
        when(commitmentRepository.findByFundingCycleIdAndVcFirmId(cycle.getId(), firm.getId()))
                .thenReturn(List.of());

        // Before the gate, any account with a round id could read any startup's closed round —
        // its target, its deck link and its data room.
        assertThatThrownBy(() -> service.getVisibleCycle(investor, cycle.getId()))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void a_closed_round_stays_readable_to_the_firm_that_backed_it() {
        FundingCycle cycle = closedCycle();
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        when(startupMemberRepository.findByUserId(investor.getId())).thenReturn(Optional.empty());
        investorIs(VCRole.OWNER);
        when(commitmentRepository.findByFundingCycleIdAndVcFirmId(cycle.getId(), firm.getId()))
                .thenReturn(List.of(commitmentOf(firm, 10_000_000L, CommitmentStatus.COMMITTED)));

        // Which is exactly what conversion needs: the round has to stay legible after it shuts.
        assertThat(service.getVisibleCycle(investor, cycle.getId())).isEqualTo(cycle);
    }

    @Test
    void a_founder_can_read_their_own_closed_round() {
        FundingCycle cycle = closedCycle();
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        founderOwnsStartup();

        assertThat(service.getVisibleCycle(founder, cycle.getId())).isEqualTo(cycle);
    }

    // --- Conversion: promised capital becomes deployed capital ---------------------------------

    private FundingCycle closedCycle() {
        FundingCycle cycle = FundingCycle.builder()
                .startup(startup)
                .roundType(InvestmentRound.SERIES_A)
                .targetAmount(250_000_000L)
                .currency("INR")
                .status(FundingCycleStatus.CLOSED)
                .openedAt(Instant.parse("2026-01-10T00:00:00Z"))
                .closedAt(Instant.parse("2026-03-05T09:30:00Z"))
                .build();
        cycle.setId(UUID.randomUUID());
        return cycle;
    }

    /** A committed pledge on a closed round — the only shape that converts. */
    private FundingCommitment convertiblePledge(FundingCycle cycle, long amount) {
        FundingCommitment pledge = FundingCommitment.builder()
                .fundingCycle(cycle).vcFirm(firm)
                .amount(amount).currency("INR").status(CommitmentStatus.COMMITTED)
                .committedAt(Instant.now()).build();
        pledge.setId(UUID.randomUUID());
        return pledge;
    }

    private void investmentIsCreated() {
        Investment created = Investment.builder().vcFirm(firm).startup(startup).build();
        created.setId(UUID.randomUUID());
        when(investmentService.createInvestment(any(User.class), any(InvestmentRequest.class)))
                .thenReturn(created);
    }

    private InvestmentRequest capturedInvestmentRequest() {
        ArgumentCaptor<InvestmentRequest> captor = ArgumentCaptor.forClass(InvestmentRequest.class);
        verify(investmentService).createInvestment(any(User.class), captor.capture());
        return captor.getValue();
    }

    @Test
    void a_closed_rounds_committed_pledge_becomes_an_investment() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = closedCycle();
        FundingCommitment pledge = convertiblePledge(cycle, 60_000_000L);
        when(commitmentRepository.findWithCycleById(pledge.getId())).thenReturn(Optional.of(pledge));
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        when(commitmentRepository.save(any(FundingCommitment.class))).thenAnswer(i -> i.getArgument(0));
        investmentIsCreated();

        FundingCommitment result = service.convert(investor, pledge.getId(), new ConvertCommitmentRequest());

        assertThat(result.isConverted()).isTrue();
        assertThat(result.getConvertedInvestment().getId()).isNotNull();
        // Still COMMITTED: a converted pledge is money that actually arrived, so it has to keep
        // counting toward the round's committed band rather than vanishing from it.
        assertThat(result.getStatus()).isEqualTo(CommitmentStatus.COMMITTED);
    }

    @Test
    void the_investment_takes_its_money_from_the_pledge_not_from_the_request() {
        investorIs(VCRole.PORTFOLIO_MANAGER);
        FundingCycle cycle = closedCycle();
        FundingCommitment pledge = convertiblePledge(cycle, 60_000_000L);
        when(commitmentRepository.findWithCycleById(pledge.getId())).thenReturn(Optional.of(pledge));
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        when(commitmentRepository.save(any(FundingCommitment.class))).thenAnswer(i -> i.getArgument(0));
        investmentIsCreated();

        ConvertCommitmentRequest request = new ConvertCommitmentRequest();
        request.setEquityPercentage(new BigDecimal("4.50"));

        service.convert(investor, pledge.getId(), request);

        InvestmentRequest sent = capturedInvestmentRequest();
        // The request has no amount, currency or round field at all, so a conversion can never
        // restate what was pledged. Equity is the one thing only the investor knows.
        assertThat(sent.getAmount()).isEqualTo(60_000_000L);
        assertThat(sent.getCurrency()).isEqualTo("INR");
        assertThat(sent.getRound()).isEqualTo(InvestmentRound.SERIES_A);
        assertThat(sent.getStartupId()).isEqualTo(startup.getId());
        assertThat(sent.getEquityPercentage()).isEqualByComparingTo("4.50");
    }

    @Test
    void the_investment_date_defaults_to_the_day_the_round_closed() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = closedCycle();
        FundingCommitment pledge = convertiblePledge(cycle, 10_000_000L);
        when(commitmentRepository.findWithCycleById(pledge.getId())).thenReturn(Optional.of(pledge));
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));
        when(commitmentRepository.save(any(FundingCommitment.class))).thenAnswer(i -> i.getArgument(0));
        investmentIsCreated();

        service.convert(investor, pledge.getId(), new ConvertCommitmentRequest());

        assertThat(capturedInvestmentRequest().getInvestmentDate())
                .isEqualTo(LocalDate.of(2026, 3, 5));
    }

    @Test
    void an_open_rounds_pledge_cannot_be_converted_yet() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = openCycle();
        FundingCommitment pledge = convertiblePledge(cycle, 10_000_000L);
        when(commitmentRepository.findWithCycleById(pledge.getId())).thenReturn(Optional.of(pledge));
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));

        assertThatThrownBy(() -> service.convert(investor, pledge.getId(), new ConvertCommitmentRequest()))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("closed");
        verify(investmentService, never()).createInvestment(any(), any());
    }

    @Test
    void an_indication_never_becomes_an_investment() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = closedCycle();
        FundingCommitment pledge = convertiblePledge(cycle, 10_000_000L);
        pledge.setStatus(CommitmentStatus.INDICATED);
        when(commitmentRepository.findWithCycleById(pledge.getId())).thenReturn(Optional.of(pledge));
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));

        assertThatThrownBy(() -> service.convert(investor, pledge.getId(), new ConvertCommitmentRequest()))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("isn't money yet");
        verify(investmentService, never()).createInvestment(any(), any());
    }

    @Test
    void a_withdrawn_pledge_never_becomes_an_investment() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = closedCycle();
        FundingCommitment pledge = convertiblePledge(cycle, 10_000_000L);
        pledge.setStatus(CommitmentStatus.WITHDRAWN);
        when(commitmentRepository.findWithCycleById(pledge.getId())).thenReturn(Optional.of(pledge));
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));

        assertThatThrownBy(() -> service.convert(investor, pledge.getId(), new ConvertCommitmentRequest()))
                .isInstanceOf(BusinessRuleViolationException.class);
        verify(investmentService, never()).createInvestment(any(), any());
    }

    @Test
    void a_pledge_cannot_be_converted_twice() {
        investorIs(VCRole.OWNER);
        FundingCycle cycle = closedCycle();
        FundingCommitment pledge = convertiblePledge(cycle, 10_000_000L);
        Investment already = Investment.builder().vcFirm(firm).startup(startup).build();
        already.setId(UUID.randomUUID());
        pledge.setConvertedInvestment(already);
        when(commitmentRepository.findWithCycleById(pledge.getId())).thenReturn(Optional.of(pledge));
        when(cycleRepository.findWithStartupById(cycle.getId())).thenReturn(Optional.of(cycle));

        // Without this, one pledge could be clicked into two portfolio rows and the firm would
        // double-count its own exposure.
        assertThatThrownBy(() -> service.convert(investor, pledge.getId(), new ConvertCommitmentRequest()))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("already in your portfolio");
        verify(investmentService, never()).createInvestment(any(), any());
    }

    @Test
    void staff_cannot_convert_a_pledge_because_they_cannot_create_investments() {
        investorIs(VCRole.STAFF);
        FundingCycle cycle = closedCycle();
        FundingCommitment pledge = convertiblePledge(cycle, 10_000_000L);
        when(commitmentRepository.findWithCycleById(pledge.getId())).thenReturn(Optional.of(pledge));

        // Rule 4, reached through the same policy that guards POST /api/investments.
        assertThatThrownBy(() -> service.convert(investor, pledge.getId(), new ConvertCommitmentRequest()))
                .isInstanceOf(UnauthorizedException.class);
        verify(investmentService, never()).createInvestment(any(), any());
    }

    @Test
    void a_founder_cannot_convert_an_investors_pledge_for_them() {
        when(vcMemberRepository.findByUserId(founder.getId())).thenReturn(Optional.empty());
        FundingCycle cycle = closedCycle();
        FundingCommitment pledge = convertiblePledge(cycle, 10_000_000L);
        when(commitmentRepository.findWithCycleById(pledge.getId())).thenReturn(Optional.of(pledge));

        // Closing the round is the founder's to do; writing into a fund's portfolio is not.
        assertThatThrownBy(() -> service.convert(founder, pledge.getId(), new ConvertCommitmentRequest()))
                .isInstanceOf(UnauthorizedException.class);
        verify(investmentService, never()).createInvestment(any(), any());
    }
}
