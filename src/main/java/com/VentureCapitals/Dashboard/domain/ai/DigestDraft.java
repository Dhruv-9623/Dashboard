package com.VentureCapitals.Dashboard.domain.ai;

import com.VentureCapitals.Dashboard.domain.digest.AlertSeverity;

import java.util.List;
import java.util.UUID;

public record DigestDraft(String summaryMarkdown, List<Alert> alerts) {
    public record Alert(UUID investmentId, String company, AlertSeverity severity, String message) {
    }
}
