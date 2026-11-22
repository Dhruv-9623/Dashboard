package com.VentureCapitals.Dashboard.api.signals;

import com.VentureCapitals.Dashboard.domain.signals.Sentiment;
import com.VentureCapitals.Dashboard.domain.signals.SignalType;
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
public class SignalDTO {
    private UUID id;
    private UUID relatedStartupId;
    private String relatedStartupName;
    private UUID relatedVCFirmId;
    private String relatedVCFirmName;
    private String sourceUrl;
    private String headline;
    private String summary;
    private SignalType signalType;
    private Sentiment sentiment;
    private Instant publishedAt;
    private boolean aiGenerated;
}
