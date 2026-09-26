package com.VentureCapitals.Dashboard.api.startup;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.common.PageResponse;
import com.VentureCapitals.Dashboard.domain.startup.AddStartupMemberRequest;
import com.VentureCapitals.Dashboard.domain.startup.StartupRequest;
import com.VentureCapitals.Dashboard.domain.startup.StartupService;
import com.VentureCapitals.Dashboard.domain.startup.StartupStage;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/startups")
public class StartupController {
    private final StartupService startupService;
    private final StartupMapper startupMapper;

    public StartupController(StartupService startupService, StartupMapper startupMapper) {
        this.startupService = startupService;
        this.startupMapper = startupMapper;
    }

    /** Discovery: any signed-in user. Paged, alphabetical. */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<StartupDTO>>> searchStartups(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sector,
            @RequestParam(required = false) StartupStage stage,
            @RequestParam(defaultValue = "false") boolean raisingOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + PageResponse.DEFAULT_SIZE) int size) {
        var results = startupService.searchStartups(search, sector, stage, raisingOnly,
                PageResponse.pageable(page, size, Sort.by("name").ascending()));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(results, startupMapper::toDTO)));
    }

    /** The signed-in founder's startup, or null data before profile setup. */
    @GetMapping("/me")
    @PreAuthorize("hasRole('STARTUP')")
    public ResponseEntity<ApiResponse<StartupDTO>> getMyStartup(@CurrentUser User user) {
        StartupDTO dto = startupService.findStartupForUser(user.getId())
                .map(startupMapper::toDTO)
                .orElse(null);
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StartupDTO>> getStartup(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(startupMapper.toDTO(startupService.getStartup(id))));
    }

    @PostMapping
    @PreAuthorize("hasRole('STARTUP')")
    public ResponseEntity<ApiResponse<StartupDTO>> createStartup(
            @CurrentUser User user,
            @Valid @RequestBody StartupRequest request) {
        StartupDTO dto = startupMapper.toDTO(startupService.createStartup(user, request));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('STARTUP')")
    public ResponseEntity<ApiResponse<StartupDTO>> updateStartup(
            @CurrentUser User user,
            @PathVariable UUID id,
            @Valid @RequestBody StartupRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(startupMapper.toDTO(startupService.updateStartup(user, id, request))));
    }

    @GetMapping("/{id}/members")
    @PreAuthorize("hasRole('STARTUP')")
    public ResponseEntity<ApiResponse<List<StartupMemberDTO>>> getMembers(
            @CurrentUser User user,
            @PathVariable UUID id) {
        List<StartupMemberDTO> members = startupService.getMembers(user, id).stream()
                .map(startupMapper::toDTO)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(members));
    }

    @PostMapping("/{id}/members")
    @PreAuthorize("hasRole('STARTUP')")
    public ResponseEntity<ApiResponse<StartupMemberDTO>> addMember(
            @CurrentUser User user,
            @PathVariable UUID id,
            @Valid @RequestBody AddStartupMemberRequest request) {
        StartupMemberDTO dto = startupMapper.toDTO(startupService.addMember(user, id, request));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dto));
    }

    @DeleteMapping("/{id}/members/{memberId}")
    @PreAuthorize("hasRole('STARTUP')")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @CurrentUser User user,
            @PathVariable UUID id,
            @PathVariable UUID memberId) {
        startupService.removeMember(user, id, memberId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
