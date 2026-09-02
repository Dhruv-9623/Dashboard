package com.VentureCapitals.Dashboard.api.vc;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.common.ErrorCode;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.AddMemberRequest;
import com.VentureCapitals.Dashboard.domain.vc.CreateVCFirmRequest;
import com.VentureCapitals.Dashboard.domain.vc.UpdateVCFirmRequest;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmService;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCRole;
import com.VentureCapitals.Dashboard.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
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

@Slf4j
@RestController
@RequestMapping("/api/vc/firms")
public class VCFirmController {
    private final VCFirmService vcFirmService;
    private final VCFirmMapper vcFirmMapper;

    public VCFirmController(VCFirmService vcFirmService, VCFirmMapper vcFirmMapper) {
        this.vcFirmService = vcFirmService;
        this.vcFirmMapper = vcFirmMapper;
    }

    @PostMapping
    @PreAuthorize("hasRole('VC')")
    public ResponseEntity<ApiResponse<VCFirmDTO>> createFirm(
            @CurrentUser User user,
            @Valid @RequestBody CreateVCFirmRequest request) {

        VCFirm firm = vcFirmService.createFirm(user, request);
        VCFirmDTO firmDTO = vcFirmMapper.toDTO(firm);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(firmDTO));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('VC')")
    public ResponseEntity<ApiResponse<VCFirmDTO>> getFirm(
            @CurrentUser User user,
            @PathVariable UUID id) {

        VCFirm firm = vcFirmService.getFirm(id);
        VCMember membership = vcFirmService.getUserFirmMembership(user.getId());

        if (!membership.getFirm().getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(ErrorCode.UNAUTHORIZED,
                            "You do not have access to this firm"));
        }

        VCFirmDTO firmDTO = vcFirmMapper.toDTO(firm);
        return ResponseEntity.ok(ApiResponse.ok(firmDTO));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('VC')")
    public ResponseEntity<ApiResponse<VCFirmDTO>> updateFirm(
            @CurrentUser User user,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateVCFirmRequest request) {

        VCFirm firm = vcFirmService.updateFirm(id, user, request);
        VCFirmDTO firmDTO = vcFirmMapper.toDTO(firm);

        return ResponseEntity.ok(ApiResponse.ok(firmDTO));
    }

    @GetMapping("/{id}/members")
    @PreAuthorize("hasRole('VC')")
    public ResponseEntity<ApiResponse<List<VCMemberDTO>>> getFirmMembers(
            @CurrentUser User user,
            @PathVariable UUID id) {

        VCMember membership = vcFirmService.getUserFirmMembership(user.getId());
        if (!membership.getFirm().getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(ErrorCode.UNAUTHORIZED,
                            "You do not have access to this firm"));
        }

        List<VCMember> members = vcFirmService.getFirmMembers(id);
        List<VCMemberDTO> memberDTOs = members.stream()
                .map(vcFirmMapper::toDTO)
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(memberDTOs));
    }

    @PostMapping("/{id}/members")
    @PreAuthorize("hasRole('VC')")
    public ResponseEntity<ApiResponse<VCMemberDTO>> addMember(
            @CurrentUser User user,
            @PathVariable UUID id,
            @Valid @RequestBody AddMemberRequest request) {

        vcFirmService.addMember(id, user, request);
        VCMember member = vcFirmService.getUserFirmMembership(request.getUserId());
        VCMemberDTO memberDTO = vcFirmMapper.toDTO(member);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(memberDTO));
    }

    @PutMapping("/{id}/members/{memberId}/role")
    @PreAuthorize("hasRole('VC')")
    public ResponseEntity<ApiResponse<VCMemberDTO>> changeMemberRole(
            @CurrentUser User user,
            @PathVariable UUID id,
            @PathVariable UUID memberId,
            @RequestParam VCRole newRole) {

        vcFirmService.changeMemberRole(id, user, memberId, newRole);
        VCMember member = vcFirmService.getFirmMembers(id).stream()
                .filter(m -> m.getId().equals(memberId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        VCMemberDTO memberDTO = vcFirmMapper.toDTO(member);
        return ResponseEntity.ok(ApiResponse.ok(memberDTO));
    }

    @DeleteMapping("/{id}/members/{memberId}")
    @PreAuthorize("hasRole('VC')")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @CurrentUser User user,
            @PathVariable UUID id,
            @PathVariable UUID memberId) {

        vcFirmService.removeMember(id, user, memberId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
