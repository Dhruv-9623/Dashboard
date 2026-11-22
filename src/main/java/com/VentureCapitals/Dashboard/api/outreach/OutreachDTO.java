package com.VentureCapitals.Dashboard.api.outreach;

import com.VentureCapitals.Dashboard.domain.outreach.OutreachStatus;
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
public class OutreachDTO {
    private UUID id;
    private UUID fromFirmId;
    private String fromFirmName;
    private UUID toStartupId;
    private String toStartupName;
    private String subject;
    private String body;
    private OutreachStatus status;
    private Instant sentAt;
}
