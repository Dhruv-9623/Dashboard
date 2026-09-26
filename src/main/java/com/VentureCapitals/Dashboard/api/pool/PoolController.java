package com.VentureCapitals.Dashboard.api.pool;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.common.PageResponse;
import com.VentureCapitals.Dashboard.domain.pool.InterestLevel;
import com.VentureCapitals.Dashboard.domain.pool.PoolEntryRequest;
import com.VentureCapitals.Dashboard.domain.pool.PoolEntryService;
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

/** The signed-in VC's pool of tracked companies ("my firm", from the session). */
@RestController
@RequestMapping("/api/pool")
@PreAuthorize("hasRole('VC')")
public class PoolController {
    private final PoolEntryService poolEntryService;
    private final PoolEntryMapper poolEntryMapper;

    public PoolController(PoolEntryService poolEntryService, PoolEntryMapper poolEntryMapper) {
        this.poolEntryService = poolEntryService;
        this.poolEntryMapper = poolEntryMapper;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PoolEntryDTO>>> listPoolEntries(
            @CurrentUser User user,
            @RequestParam(required = false) InterestLevel interestLevel,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + PageResponse.DEFAULT_SIZE) int size) {
        var entries = poolEntryService.listPoolEntries(user, interestLevel,
                PageResponse.pageable(page, size, Sort.by("createdAt").descending().and(Sort.by("id"))));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(entries, poolEntryMapper::toDTO)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PoolEntryDTO>> createPoolEntry(
            @CurrentUser User user,
            @Valid @RequestBody PoolEntryRequest request) {
        PoolEntryDTO dto = poolEntryMapper.toDTO(poolEntryService.createPoolEntry(user, request));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PoolEntryDTO>> updatePoolEntry(
            @CurrentUser User user,
            @PathVariable UUID id,
            @Valid @RequestBody PoolEntryRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(poolEntryMapper.toDTO(poolEntryService.updatePoolEntry(user, id, request))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePoolEntry(@CurrentUser User user, @PathVariable UUID id) {
        poolEntryService.deletePoolEntry(user, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
