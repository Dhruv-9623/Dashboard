package com.VentureCapitals.Dashboard.api.investment;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.common.PageResponse;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRequest;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentService;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentStatus;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentSummary;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** The signed-in VC's portfolio ("my firm" — the firm comes from the session, not the URL). */
@RestController
@RequestMapping("/api/investments")
@PreAuthorize("hasRole('VC')")
public class InvestmentController {
    private final InvestmentService investmentService;
    private final InvestmentMapper investmentMapper;

    public InvestmentController(InvestmentService investmentService, InvestmentMapper investmentMapper) {
        this.investmentService = investmentService;
        this.investmentMapper = investmentMapper;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<InvestmentDTO>>> listInvestments(
            @CurrentUser User user,
            @RequestParam(required = false) InvestmentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + PageResponse.DEFAULT_SIZE) int size) {
        var investments = investmentService.listInvestments(user, status,
                PageResponse.pageable(page, size, Sort.by("investmentDate").descending().and(Sort.by("id"))));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(investments, investmentMapper::toDTO)));
    }

    /** Totals per currency and counts per status across the whole portfolio (not just one page). */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<InvestmentSummary>> summary(@CurrentUser User user) {
        return ResponseEntity.ok(ApiResponse.ok(investmentService.summarize(user)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InvestmentDTO>> getInvestment(@CurrentUser User user, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(investmentMapper.toDTO(investmentService.getInvestment(user, id))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<InvestmentDTO>> createInvestment(
            @CurrentUser User user,
            @Valid @RequestBody InvestmentRequest request) {
        InvestmentDTO dto = investmentMapper.toDTO(investmentService.createInvestment(user, request));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<InvestmentDTO>> updateInvestment(
            @CurrentUser User user,
            @PathVariable UUID id,
            @Valid @RequestBody InvestmentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(investmentMapper.toDTO(investmentService.updateInvestment(user, id, request))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteInvestment(@CurrentUser User user, @PathVariable UUID id) {
        investmentService.deleteInvestment(user, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
