package com.VentureCapitals.Dashboard.api.comparison;

import com.VentureCapitals.Dashboard.api.startup.StartupMapper;
import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.domain.comparison.CompareRequest;
import com.VentureCapitals.Dashboard.domain.comparison.ComparisonService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Side-by-side startups. A POST because the ids travel in the body, but nothing is created or
 * changed — it is a read.
 */
@RestController
@RequestMapping("/api/comparison")
@PreAuthorize("hasRole('VC')")
public class ComparisonController {
    private final ComparisonService comparisonService;
    private final StartupMapper startupMapper;

    public ComparisonController(ComparisonService comparisonService, StartupMapper startupMapper) {
        this.comparisonService = comparisonService;
        this.startupMapper = startupMapper;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<List<ComparisonRowDTO>>> compare(@Valid @RequestBody CompareRequest request) {
        List<ComparisonRowDTO> rows = comparisonService.compare(request.getStartupIds()).stream()
                .map(row -> ComparisonRowDTO.builder()
                        .startup(startupMapper.toDTO(row.startup(), row.raising()))
                        .totalRaised(row.totalRaised())
                        .currency(row.currency())
                        .openRound(row.openRound())
                        .investorCount(row.investorCount())
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(rows));
    }
}
