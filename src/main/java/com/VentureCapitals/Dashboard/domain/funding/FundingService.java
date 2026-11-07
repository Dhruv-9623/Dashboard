package com.VentureCapitals.Dashboard.domain.funding;

import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;
import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.domain.investment.Investment;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRequest;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentService;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupMember;
import com.VentureCapitals.Dashboard.domain.startup.StartupMemberRepository;
import com.VentureCapitals.Dashboard.domain.startup.StartupStage;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Funding rounds and the commitments against them (CLAUDE.md §3, Rule 3).
 *
 * <p>The rules enforced here, each of which has a test:
 * <ol>
 *   <li>Only a FOUNDER or CO_FOUNDER opens or edits a round, and only their own startup's.</li>
 *   <li>A VC commits capital only as OWNER or PORTFOLIO_MANAGER — STAFF can read, not pledge.</li>
 *   <li><b>A firm sees only its own commitment on someone else's round.</b> Rival commitments are
 *       competitively sensitive and must never leak through deal flow; the founder sees all.</li>
 *   <li>Only the committing firm moves its own commitment along the ladder — a founder cannot
 *       promote someone's indication into a commitment.</li>
 *   <li>One commitment per firm per round; a second is an update.</li>
 *   <li>A paused or closed round takes no commitments.</li>
 *   <li>A commitment is in the round's currency and inside its ticket band.</li>
 *   <li>`closedAt` is the server's to set, on the transition into CLOSED.</li>
 *   <li>Every change to a commitment appends a {@link CommitmentEvent}; nothing rewrites one.</li>
 *   <li>A pledge becomes an {@link Investment} only after the round closes, only if it reached
 *       COMMITTED, and only when its own firm confirms it — Rule 4 keeps portfolio records on the
 *       VC side, so the founder closing the round cannot write into anyone's portfolio.</li>
 * </ol>
 */
@Slf4j
@Service
@Transactional(readOnly = true)
public class FundingService {

    private final FundingCycleRepository cycleRepository;
    private final FundingCommitmentRepository commitmentRepository;
    private final CommitmentEventRepository eventRepository;
    private final StartupMemberRepository startupMemberRepository;
    private final FirmAccessPolicy firmAccessPolicy;
    private final InvestmentService investmentService;

    public FundingService(FundingCycleRepository cycleRepository,
                          FundingCommitmentRepository commitmentRepository,
                          CommitmentEventRepository eventRepository,
                          StartupMemberRepository startupMemberRepository,
                          FirmAccessPolicy firmAccessPolicy,
                          InvestmentService investmentService) {
        this.cycleRepository = cycleRepository;
        this.commitmentRepository = commitmentRepository;
        this.eventRepository = eventRepository;
        this.startupMemberRepository = startupMemberRepository;
        this.firmAccessPolicy = firmAccessPolicy;
        this.investmentService = investmentService;
    }

    // --- Rounds -----------------------------------------------------------------------------

    /** The signed-in founder's own rounds, newest first. */
    public List<FundingCycle> listMine(User actor) {
        Startup startup = requireFounderStartup(actor);
        return cycleRepository.findByStartupIdOrderByOpenedAtDesc(startup.getId());
    }

    /** Open rounds across the platform — the VC-side deal flow. */
    public Page<FundingCycle> listOpen(String sector, StartupStage stage, UUID startupId, Pageable pageable) {
        String normalisedSector = (sector == null || sector.isBlank()) ? null : sector.trim();
        return cycleRepository.findOpen(normalisedSector, stage, startupId, pageable);
    public Page<FundingCycle> listOpen(String sector, StartupStage stage, Pageable pageable) {
        String normalisedSector = (sector == null || sector.isBlank()) ? null : sector.trim();
        return cycleRepository.findOpen(normalisedSector, stage, pageable);
    }

    /** The internal lookup. Applies no visibility rules — callers that serve the API use
     * {@link #getVisibleCycle} instead. */
    public FundingCycle getCycle(UUID cycleId) {
        return cycleRepository.findWithStartupById(cycleId)
                .orElseThrow(() -> new EntityNotFoundException("Funding round not found"));
    }

    /**
     * A round as this actor is allowed to see it, which is what every read path through the API
     * uses.
     *
     * <p>Three ways in, and no others: it is your own startup's round, it is open to the market,
     * or your firm has pledged into it. The third is what keeps a closed round readable by the
     * investors who backed it — they still need it to record what they paid — without making every
     * startup's paused and closed rounds readable by anyone holding an account.
     */
    public FundingCycle getVisibleCycle(User actor, UUID cycleId) {
        FundingCycle cycle = getCycle(cycleId);
        if (isFounderOf(actor, cycle) || cycle.getStatus() == FundingCycleStatus.OPEN) {
            return cycle;
        }

        boolean backedIt = firmAccessPolicy.findMembership(actor)
                .map(membership -> !commitmentRepository
                        .findByFundingCycleIdAndVcFirmId(cycleId, membership.getFirm().getId()).isEmpty())
                .orElse(false);
        if (!backedIt) {
            throw new UnauthorizedException("You don't have access to this round");
        }
        return cycle;
    }

    @Transactional
    public FundingCycle createCycle(User actor, FundingCycleRequest request) {
        Startup startup = requireFounderStartup(actor);
        validateTicketBand(request);

        // Rule: one open round at a time. The partial unique index enforces it in the database as
        // well, but catching it here turns a 409 into a sentence the founder can act on.
        if (request.getStatus() == FundingCycleStatus.OPEN) {
            cycleRepository.findByStartupIdAndStatus(startup.getId(), FundingCycleStatus.OPEN)
                    .ifPresent(existing -> {
                        throw new BusinessRuleViolationException(
                                "You already have an open round. Close or pause it before opening another.");
                    });
        }

        FundingCycle cycle = FundingCycle.builder()
                .startup(startup)
                .roundType(request.getRoundType())
                .targetAmount(request.getTargetAmount())
                .currency(request.getCurrency())
                .minTicketSize(request.getMinTicketSize())
                .maxTicketSize(request.getMaxTicketSize())
                .status(request.getStatus())
                .pitchDeckUrl(blankToNull(request.getPitchDeckUrl()))
                .dataRoomUrl(blankToNull(request.getDataRoomUrl()))
                .openedAt(Instant.now())
                .closedAt(request.getStatus() == FundingCycleStatus.CLOSED ? Instant.now() : null)
                .build();

        FundingCycle saved = cycleRepository.save(cycle);
        log.info("Funding round opened: startupId={}, cycleId={}", startup.getId(), saved.getId());
        return saved;
    }

    @Transactional
    public FundingCycle updateCycle(User actor, UUID cycleId, FundingCycleRequest request) {
        Startup startup = requireFounderStartup(actor);
        FundingCycle cycle = getCycle(cycleId);
        if (!cycle.getStartup().getId().equals(startup.getId())) {
            throw new UnauthorizedException("You can only manage your own startup's rounds");
        }
        validateTicketBand(request);

        if (request.getStatus() == FundingCycleStatus.OPEN && cycle.getStatus() != FundingCycleStatus.OPEN) {
            cycleRepository.findByStartupIdAndStatus(startup.getId(), FundingCycleStatus.OPEN)
                    .filter(other -> !other.getId().equals(cycleId))
                    .ifPresent(other -> {
                        throw new BusinessRuleViolationException(
                                "Another round is already open. Close or pause it first.");
                    });
        }

        // Currency can't change once money is pledged against it: the commitments would silently
        // change meaning.
        if (!cycle.getCurrency().equals(request.getCurrency())
                && !commitmentRepository.findByFundingCycleIdOrderByCommittedAtDesc(cycleId).isEmpty()) {
            throw new BusinessRuleViolationException(
                    "This round already has commitments, so its currency can't change.");
        }

        cycle.setRoundType(request.getRoundType());
        cycle.setTargetAmount(request.getTargetAmount());
        cycle.setCurrency(request.getCurrency());
        cycle.setMinTicketSize(request.getMinTicketSize());
        cycle.setMaxTicketSize(request.getMaxTicketSize());
        cycle.setPitchDeckUrl(blankToNull(request.getPitchDeckUrl()));
        cycle.setDataRoomUrl(blankToNull(request.getDataRoomUrl()));
        applyStatus(cycle, request.getStatus());

        return cycleRepository.save(cycle);
    }

    /** closedAt belongs to the server: it marks when the round actually shut, not what a client sent. */
    private void applyStatus(FundingCycle cycle, FundingCycleStatus next) {
        if (cycle.getStatus() == next) return;
        cycle.setStatus(next);
        cycle.setClosedAt(next == FundingCycleStatus.CLOSED ? Instant.now() : null);
    }

    // --- Commitments ------------------------------------------------------------------------

    /**
     * The commitments on a round, as this actor is allowed to see them.
     *
     * <p>The founder sees every investor. A VC sees only its own firm — showing one fund what a
     * rival has pledged would turn deal flow into an information leak.
     */
    public List<FundingCommitment> listCommitments(User actor, UUID cycleId) {
        FundingCycle cycle = getVisibleCycle(actor, cycleId);

        if (isFounderOf(actor, cycle)) {
            return commitmentRepository.findByFundingCycleIdOrderByCommittedAtDesc(cycleId);
        }

        VCMember membership = firmAccessPolicy.requireAnyMembership(actor);
        return commitmentRepository.findByFundingCycleIdAndVcFirmId(cycleId, membership.getFirm().getId());
    }

    /**
     * How a round filled, in the order it happened.
     *
     * <p>Visibility mirrors {@link #listCommitments} for a sharper reason than amounts: the timing
     * of a rival's decisions shows its process, not just its position, so an investor sees only
     * its own firm's moves. The founder sees everything, which is the point — this is the data
     * behind their momentum chart.
     */
    public List<CommitmentEvent> listCycleHistory(User actor, UUID cycleId) {
        FundingCycle cycle = getVisibleCycle(actor, cycleId);

        if (isFounderOf(actor, cycle)) {
            return eventRepository.findByFundingCycleIdOrderByOccurredAtAsc(cycleId);
        }

        VCMember membership = firmAccessPolicy.requireAnyMembership(actor);
        return eventRepository.findByFundingCycleIdAndVcFirmIdOrderByOccurredAtAsc(
                cycleId, membership.getFirm().getId());
    }

    /**
     * Everything the actor's own firm has pledged, across every round.
     *
     * <p>The counterpart to the portfolio: investments are money deployed, this is money promised.
     * Any member may read it — STAFF can't move a commitment, but a fund's own book is not a
     * secret from its own analysts.
     *
     * <p>Scoped to the actor's firm by {@link FirmAccessPolicy}, never by a caller-supplied id,
     * so there is no parameter to tamper with to read a rival's book.
     */
    public Page<FundingCommitment> listFirmCommitments(User actor, CommitmentStatus status, Pageable pageable) {
        VCMember membership = firmAccessPolicy.requireAnyMembership(actor);
        return commitmentRepository.findFirmBook(membership.getFirm().getId(), status, pageable);
    }

    /**
     * The firm's book as four figures, computed across every pledge it holds.
     *
     * <p>Separate from {@link #listFirmCommitments} because the two answer different questions. The
     * list is a page of rows and can be filtered to one band; these totals describe the firm's
     * whole exposure and must not move when someone turns the page or picks a tab. Totalling the
     * rows on screen gave exactly that bug — the "Committed" figure dropped to zero on the Soft
     * tab.
     */
    public BookSummary summarizeFirmBook(User actor) {
        VCMember membership = firmAccessPolicy.requireAnyMembership(actor);
        UUID firmId = membership.getFirm().getId();

        Map<String, Long> committed = new LinkedHashMap<>();
        Map<String, Long> likely = new LinkedHashMap<>();
        long liveCount = 0;

        for (FundingCommitmentRepository.BookTotal row
                : commitmentRepository.sumFirmBookByCurrencyAndStatus(firmId)) {
            liveCount += row.getCount();
            if (row.getStatus() == CommitmentStatus.COMMITTED) {
                committed.merge(row.getCurrency(), row.getTotal(), Long::sum);
            }
            if (row.getStatus() == CommitmentStatus.COMMITTED
                    || row.getStatus() == CommitmentStatus.SOFT_COMMITTED) {
                likely.merge(row.getCurrency(), row.getTotal(), Long::sum);
            }
        }

        return BookSummary.builder()
                .committedByCurrency(committed)
                .likelyByCurrency(likely)
                .liveCount(liveCount)
                .readyToRecordCount(commitmentRepository.countReadyToRecord(firmId))
                .build();
    }

    @Transactional
    public FundingCommitment commit(User actor, UUID cycleId, CommitmentRequest request) {
        VCMember membership = firmAccessPolicy.requireAnyMembership(actor);
        firmAccessPolicy.require(actor, membership.getFirm().getId(), FirmAccessPolicy.INVESTMENT_EDITORS);

        FundingCycle cycle = getCycle(cycleId);
        if (cycle.getStatus() != FundingCycleStatus.OPEN) {
            throw new BusinessRuleViolationException("This round isn't open for commitments.");
        }
        if (!cycle.getCurrency().equals(request.getCurrency())) {
            throw new BusinessRuleViolationException(
                    "This round is raising in " + cycle.getCurrency() + ".");
        }
        validateTicket(cycle, request.getAmount());

        // A second commitment from the same firm is that firm changing its number.
        Optional<FundingCommitment> existing = commitmentRepository
                .findByFundingCycleIdAndVcFirmId(cycleId, membership.getFirm().getId())
                .stream()
                .findFirst();

        // Read before the setters run. Both stay null for a brand-new pledge, which is how the
        // event log tells a creation apart from a change without carrying an event-type column.
        CommitmentStatus previousStatus = existing.map(FundingCommitment::getStatus).orElse(null);
        Long previousAmount = existing.map(FundingCommitment::getAmount).orElse(null);

        FundingCommitment commitment = existing
                .orElseGet(() -> FundingCommitment.builder()
                        .fundingCycle(cycle)
                        .vcFirm(membership.getFirm())
                        .committedAt(Instant.now())
                        .build());

        commitment.setAmount(request.getAmount());
        commitment.setCurrency(request.getCurrency());
        commitment.setStatus(request.getStatus());

        FundingCommitment saved = commitmentRepository.save(commitment);
        recordEvent(actor, saved, previousStatus, previousAmount);
        log.info("Commitment recorded: cycleId={}, firmId={}, status={}",
                cycleId, membership.getFirm().getId(), saved.getStatus());
        return saved;
    }

    @Transactional
    public FundingCommitment updateCommitmentStatus(User actor, UUID commitmentId, CommitmentStatus status) {
        FundingCommitment commitment = commitmentRepository.findWithCycleById(commitmentId)
                .orElseThrow(() -> new EntityNotFoundException("Commitment not found"));

        // Only the firm that made it. A founder watching their round can't talk an investor's
        // indication up into a commitment on their behalf.
        firmAccessPolicy.require(actor, commitment.getVcFirm().getId(), FirmAccessPolicy.INVESTMENT_EDITORS);

        if (commitment.getFundingCycle().getStatus() != FundingCycleStatus.OPEN) {
            throw new BusinessRuleViolationException("This round isn't open any more.");
        }

        CommitmentStatus previousStatus = commitment.getStatus();
        commitment.setStatus(status);

        FundingCommitment saved = commitmentRepository.save(commitment);
        recordEvent(actor, saved, previousStatus, commitment.getAmount());
        return saved;
    }

    /**
     * The firm writing its own closed-round pledge into its portfolio.
     *
     * <p>This is the only place the two halves of a firm's exposure meet: promised capital becomes
     * deployed capital. It runs on the investor's confirmation rather than automatically when the
     * founder closes the round, for two reasons — Rule 4 puts portfolio records on the VC side, so
     * a founder's action must not write into anyone's portfolio; and the equity received is a
     * number only the investor knows.
     */
    @Transactional
    public FundingCommitment convert(User actor, UUID commitmentId, ConvertCommitmentRequest request) {
        FundingCommitment commitment = commitmentRepository.findWithCycleById(commitmentId)
                .orElseThrow(() -> new EntityNotFoundException("Commitment not found"));

        // The same gate as POST /api/investments, applied to the firm that pledged.
        firmAccessPolicy.require(actor, commitment.getVcFirm().getId(), FirmAccessPolicy.INVESTMENT_EDITORS);

        FundingCycle cycle = getCycle(commitment.getFundingCycle().getId());
        if (cycle.getStatus() != FundingCycleStatus.CLOSED) {
            throw new BusinessRuleViolationException(
                    "You can record this as an investment once the round has closed.");
        }
        if (commitment.getStatus() != CommitmentStatus.COMMITTED) {
            throw new BusinessRuleViolationException(
                    "Only a committed pledge becomes an investment. An indication isn't money yet.");
        }
        if (commitment.isConverted()) {
            throw new BusinessRuleViolationException("This pledge is already in your portfolio.");
        }

        InvestmentRequest investmentRequest = InvestmentRequest.builder()
                .startupId(cycle.getStartup().getId())
                .investmentDate(request.getInvestmentDate() != null
                        ? request.getInvestmentDate()
                        : closingDate(cycle))
                // Amount, currency and round come from the pledge and the round, never from the
                // request. A conversion that could restate the number would make the pledge, and
                // every total built on it, meaningless.
                .amount(commitment.getAmount())
                .currency(commitment.getCurrency())
                .round(cycle.getRoundType())
                .equityPercentage(request.getEquityPercentage())
                .notes(request.getNotes())
                .build();

        Investment investment = investmentService.createInvestment(actor, investmentRequest);
        commitment.setConvertedInvestment(investment);
        FundingCommitment saved = commitmentRepository.save(commitment);

        log.info("Commitment converted to investment: commitmentId={}, investmentId={}, firmId={}",
                commitmentId, investment.getId(), commitment.getVcFirm().getId());
        return saved;
    }

    // --- Totals -----------------------------------------------------------------------------

    /** Per-status totals for several cycles in one query, keyed by cycle id. */
    public Map<UUID, CycleTotals> totalsFor(List<FundingCycle> cycles) {
        if (cycles.isEmpty()) return Map.of();

        List<UUID> ids = cycles.stream().map(FundingCycle::getId).toList();
        Map<UUID, Map<CommitmentStatus, Long>> amounts = new HashMap<>();
        Map<UUID, Map<CommitmentStatus, Long>> counts = new HashMap<>();

        for (FundingCommitmentRepository.CommitmentTotal row : commitmentRepository.sumByCycleAndStatus(ids)) {
            amounts.computeIfAbsent(row.getCycleId(), key -> new EnumMap<>(CommitmentStatus.class))
                    .put(row.getStatus(), row.getTotal());
            counts.computeIfAbsent(row.getCycleId(), key -> new EnumMap<>(CommitmentStatus.class))
                    .put(row.getStatus(), row.getCount());
        }

        Map<UUID, CycleTotals> totals = new HashMap<>();
        for (UUID id : ids) {
            totals.put(id, CycleTotals.from(
                    amounts.getOrDefault(id, Map.of()),
                    counts.getOrDefault(id, Map.of())));
        }
        return totals;
    }

    public CycleTotals totalsFor(FundingCycle cycle) {
        return totalsFor(List.of(cycle)).getOrDefault(cycle.getId(), CycleTotals.EMPTY);
    }

    // --- Helpers ----------------------------------------------------------------------------

    /**
     * Appends one row to the event log.
     *
     * <p>Takes the state the commitment was in beforehand, because by the time this runs the
     * entity already holds the new values. {@code previousStatus} and {@code previousAmount} are
     * null together for a creation.
     *
     * <p>A restatement that changes nothing is not recorded: a firm re-sending the same amount and
     * band is not an event in the round's life, and logging it would put steps on the founder's
     * momentum chart where no money moved.
     */
    private void recordEvent(User actor, FundingCommitment commitment,
                             CommitmentStatus previousStatus, Long previousAmount) {
        boolean unchanged = previousStatus == commitment.getStatus()
                && previousAmount != null
                && previousAmount.equals(commitment.getAmount());
        if (unchanged) return;

        eventRepository.save(CommitmentEvent.builder()
                .commitment(commitment)
                .fundingCycle(commitment.getFundingCycle())
                .vcFirm(commitment.getVcFirm())
                .actor(actor)
                .fromStatus(previousStatus)
                .fromAmount(previousAmount)
                .toStatus(commitment.getStatus())
                .toAmount(commitment.getAmount())
                .currency(commitment.getCurrency())
                .occurredAt(Instant.now())
                .build());
    }

    /**
     * The day a closed round shut, as a date.
     *
     * <p>`closedAt` is set by {@link #applyStatus} on the transition into CLOSED, so it is present
     * for every round this method can be reached with. The fallback is there because the column is
     * nullable and a NullPointerException here would surface as a 500 on a legitimate request.
     */
    private static LocalDate closingDate(FundingCycle cycle) {
        Instant closedAt = cycle.getClosedAt() != null ? cycle.getClosedAt() : Instant.now();
        return LocalDate.ofInstant(closedAt, ZoneOffset.UTC);
    }

    /** CLAUDE.md Rule 3: rounds belong to founders, not investors. */
    private Startup requireFounderStartup(User actor) {
        StartupMember membership = startupMemberRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new UnauthorizedException(
                        "Only a startup's founders can manage funding rounds"));
        return membership.getStartup();
    }

    private boolean isFounderOf(User actor, FundingCycle cycle) {
        return startupMemberRepository.findByUserId(actor.getId())
                .map(membership -> membership.getStartup().getId().equals(cycle.getStartup().getId()))
                .orElse(false);
    }

    private void validateTicketBand(FundingCycleRequest request) {
        Long min = request.getMinTicketSize();
        Long max = request.getMaxTicketSize();
        if (min != null && max != null && min > max) {
            throw new BusinessRuleViolationException(
                    "The minimum ticket size can't be larger than the maximum.");
        }
    }

    private void validateTicket(FundingCycle cycle, long amount) {
        if (cycle.getMinTicketSize() != null && amount < cycle.getMinTicketSize()) {
            throw new BusinessRuleViolationException(
                    "This round's minimum ticket is " + cycle.getMinTicketSize() + " " + cycle.getCurrency() + ".");
        }
        if (cycle.getMaxTicketSize() != null && amount > cycle.getMaxTicketSize()) {
            throw new BusinessRuleViolationException(
                    "This round's maximum ticket is " + cycle.getMaxTicketSize() + " " + cycle.getCurrency() + ".");
        }
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
