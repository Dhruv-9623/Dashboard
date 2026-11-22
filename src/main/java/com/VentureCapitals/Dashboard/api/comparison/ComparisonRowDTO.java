package com.VentureCapitals.Dashboard.api.comparison;

import com.VentureCapitals.Dashboard.api.startup.StartupDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComparisonRowDTO {
    private StartupDTO startup;
    private Long totalRaised;
    private String currency;
    private String openRound;
    private long investorCount;
}
