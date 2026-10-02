package com.VentureCapitals.Dashboard.api.startup;

import com.VentureCapitals.Dashboard.domain.startup.StartupRole;
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
public class StartupMemberDTO {
    private UUID id;
    private UUID userId;
    private String userEmail;
    private UUID startupId;
    private StartupRole role;
    private Instant joinedAt;
}
