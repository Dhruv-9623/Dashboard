package com.VentureCapitals.Dashboard.api.funding;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.common.PageResponse;
import com.VentureCapitals.Dashboard.domain.funding.CommitmentRequest;
import com.VentureCapitals.Dashboard.domain.funding.CommitmentStatusRequest;
import com.VentureCapitals.Dashboard.domain.funding.CycleTotals;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycle;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycleRequest;
import com.VentureCapitals.Dashboard.domain.funding.FundingService;
import com.VentureCapitals.Dashboard.domain.startup.StartupStage;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Funding rounds.
 *
 * <p>Two audiences on one resource: founders manage their own rounds, investors browse the open
 * ones and pledge against them. The role checks live in {@link FundingService} rather than on the
 * methods here, because several endpoints are legitimately reachable by both sides and differ only
 * in what they return.
 */
@RestController
@RequestMapping("/api/funding-cycles")
@PreAuthorize("isAuthenticated()")
public class FundingController {

    private final FundingService fundingService;

    public FundingController(FundingService fundingService) {
        this.fundingService = fundingService;
    }

    /** The signed-in founder's own rounds. */
    @GetMapping
    @PreAuthorize("hasRole('STARTUP')")
    public ResponseEntity<ApiResponse<List<FundingCycleDTO>>> listMine(@CurrentUser User user) {
        List<FundingCycle> cycles = fundingService.listMine(user);
        return ResponseEntity.ok(ApiResponse.ok(toDTOs(cycles)));
    }

    /** Open rounds across the platform — deal flow. Paged: this grows with the whole market. */
    @GetMapping("/open")
    @PreAuthorize("hasRole('VC')")
    public ResponseEntity<ApiResponse<PageResponse<FundingCycleDTO>>> listOpen(
            @RequestParam(required = false) String sector,
            @RequestParam(required = false) StartupStage stage,
            // Lets a startup's profile show its own open round without paging all of deal flow.
            @RequestParam(required = false) UUID startupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<FundingCycle> cycles = fundingService.listOpen(
                sector, stage, startupId, PageResponse.pageable(page, size, Sort.by(Sort.Direction.DESC, "openedAt")));
        Map<UUID, CycleTotals> totals = fundingService.totalsFor(cycles.getContent());

        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(cycles,
                cycle -> FundingMapper.toDTO(cycle, totals.getOrDefault(cycle.getId(), CycleTotals.EMPTY)))));
    }

    /**
     * One round.
     *
     * <p>Visibility is the service's call: your own startup's round, a round open to the market,
     * or one your firm has pledged into. Without that gate this endpoint handed every paused and
     * closed round — target, deck link, data room — to anyone with an account and a round id.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FundingCycleDTO>> getCycle(
            @CurrentUser User user, @PathVariable UUID id) {

        FundingCycle cycle = fundingService.getVisibleCycle(user, id);
        return ResponseEntity.ok(ApiResponse.ok(FundingMapper.toDTO(cycle, fundingService.totalsFor(cycle))));
    }

    /**
     * How the round filled, oldest move first.
     *
     * <p>The founder gets every investor's moves; an investor gets only its own firm's. Same rule
     * as the commitments list, applied in the service so no caller can opt out of it.
     */
    @GetMapping("/{id}/history")
    public ResponseEntity<ApiResponse<List<CommitmentEventDTO>>> listHistory(
            @CurrentUser User user, @PathVariable UUID id) {

        List<CommitmentEventDTO> events = fundingService.listCycleHistory(user, id).stream()
                .map(FundingMapper::toDTO)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(events));
    }

    @PostMapping
    @PreAuthorize("hasRole('STARTUP')")
    public ResponseEntity<ApiResponse<FundingCycleDTO>> createCycle(
            @CurrentUser User user,
            @Valid @RequestBody FundingCycleRequest request) {

        FundingCycle cycle = fundingService.createCycle(user, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(FundingMapper.toDTO(cycle, CycleTotals.EMPTY)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('STARTUP')")
    public ResponseEntity<ApiResponse<FundingCycleDTO>> updateCycle(
            @CurrentUser User user,
            @PathVariable UUID id,
            @Valid @RequestBody FundingCycleRequest request) {

        FundingCycle cycle = fundingService.updateCycle(user, id, request);
        return ResponseEntity.ok(ApiResponse.ok(FundingMapper.toDTO(cycle, fundingService.totalsFor(cycle))));
    }

    /**
     * The commitments on a round — all of them for the founder, only the caller's own firm for an
     * investor. The filtering is in the service, so no caller can opt out of it.
     */
    @GetMapping("/{id}/commitments")
    public ResponseEntity<ApiResponse<List<FundingCommitmentDTO>>> listCommitments(
            @CurrentUser User user, @PathVariable UUID id) {

        List<FundingCommitmentDTO> commitments = fundingService.listCommitments(user, id).stream()
                .map(FundingMapper::toDTO)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(commitments));
    }

    @PostMapping("/{id}/commitments")
    @PreAuthorize("hasRole('VC')")
    public ResponseEntity<ApiResponse<FundingCommitmentDTO>> commit(
            @CurrentUser User user,
            @PathVariable UUID id,
            @Valid @RequestBody CommitmentRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(FundingMapper.toDTO(fundingService.commit(user, id, request))));
    }

    private List<FundingCycleDTO> toDTOs(List<FundingCycle> cycles) {
        Map<UUID, CycleTotals> totals = fundingService.totalsFor(cycles);
        return cycles.stream()
                .map(cycle -> FundingMapper.toDTO(cycle, totals.getOrDefault(cycle.getId(), CycleTotals.EMPTY)))
                .toList();
    }
}
