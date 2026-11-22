package com.VentureCapitals.Dashboard.api.digest;

import com.VentureCapitals.Dashboard.domain.digest.AlertSeverity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DigestDTO {
    private UUID id;
    private UUID vcFirmId;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private Instant sentAt;
    private String summaryMarkdown;
    private List<AlertDTO> alerts;
    private int companyCount;
    private Instant createdAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AlertDTO {
        private UUID investmentId;
        private String startupName;
        private AlertSeverity severity;
        private String message;
    }
}
