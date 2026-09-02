package com.VentureCapitals.Dashboard.api.vc;

import com.VentureCapitals.Dashboard.domain.vc.VCRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VCMemberDTO {
    private UUID id;
    private UUID userId;
    private String userEmail;
    private UUID firmId;
    private VCRole role;
    private Instant joinedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
