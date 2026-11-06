package com.VentureCapitals.Dashboard.api.funding;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.common.PageResponse;
import com.VentureCapitals.Dashboard.domain.funding.BookSummary;
import com.VentureCapitals.Dashboard.domain.funding.CommitmentStatus;
import com.VentureCapitals.Dashboard.domain.funding.CommitmentStatusRequest;
import com.VentureCapitals.Dashboard.domain.funding.ConvertCommitmentRequest;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitment;
import com.VentureCapitals.Dashboard.domain.funding.FundingService;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * A commitment on its own, addressed by id.
 *
 * <p>Separate from {@link FundingController} because the frontend reaches it at
 * `/api/commitments/{id}` — a commitment is edited by the firm that owns it, which doesn't
 * necessarily have the round in hand.
 */
@RestController
@RequestMapping("/api/commitments")
@PreAuthorize("hasRole('VC')")
public class CommitmentController {

    private final FundingService fundingService;

    public CommitmentController(FundingService fundingService) {
        this.fundingService = fundingService;
    }

    /**
     * The signed-in firm's own book — every pledge it has made, newest first.
     *
     * <p>Takes no firm id: the firm comes from the session, so there is nothing in the request to
     * change in order to read someone else's commitments.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<FundingCommitmentDTO>>> listMine(
            @CurrentUser User user,
            @RequestParam(required = false) CommitmentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<FundingCommitment> commitments = fundingService.listFirmCommitments(user, status,
                PageResponse.pageable(page, size, Sort.by(Sort.Direction.DESC, "committedAt")));

        return ResponseEntity.ok(ApiResponse.ok(
                PageResponse.from(commitments, FundingMapper::toBookDTO)));
    }

    /**
     * The firm's book as totals, across every pledge rather than one page of them.
     *
     * <p>Mirrors `GET /api/investments/summary`, and exists for the same reason: the figures at the
     * top of a paged, filterable list have to describe the whole set, or they change meaning as you
     * navigate.
     */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<BookSummary>> summary(@CurrentUser User user) {
        return ResponseEntity.ok(ApiResponse.ok(fundingService.summarizeFirmBook(user)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<FundingCommitmentDTO>> updateStatus(
            @CurrentUser User user,
            @PathVariable UUID id,
            @Valid @RequestBody CommitmentStatusRequest request) {

        return ResponseEntity.ok(ApiResponse.ok(FundingMapper.toDTO(
                fundingService.updateCommitmentStatus(user, id, request.getStatus()))));
    }

    /**
     * Record this pledge as an investment — the step where promised capital becomes deployed
     * capital.
     *
     * <p>A POST because it creates something: an {@code Investment} in the firm's portfolio, which
     * the response links to. Only the pledging firm's OWNER or PORTFOLIO_MANAGER may call it, only
     * once the round has closed, and only for a pledge that reached COMMITTED.
     */
    @PostMapping("/{id}/convert")
    public ResponseEntity<ApiResponse<FundingCommitmentDTO>> convert(
            @CurrentUser User user,
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) ConvertCommitmentRequest request) {

        ConvertCommitmentRequest body = request != null ? request : new ConvertCommitmentRequest();
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(FundingMapper.toDTO(
                fundingService.convert(user, id, body))));
    }
}
