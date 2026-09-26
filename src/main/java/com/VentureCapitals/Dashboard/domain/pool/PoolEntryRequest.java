package com.VentureCapitals.Dashboard.domain.pool;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Body for both POST and PUT /api/pool. Either {@code startupId} (an on-platform company) or
 * {@code companyName} (off-platform) identifies the company; when both arrive, the startup wins
 * and the name is ignored — the frontend sends the startup's name alongside its id.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PoolEntryRequest {
    private UUID startupId;

    @Size(max = 255, message = "Company name must be at most 255 characters")
    private String companyName;

    /** Off-platform only; ignored for on-platform startups. */
    @Size(max = 100, message = "Sector must be at most 100 characters")
    private String sector;

    @Size(max = 50, message = "Stage must be at most 50 characters")
    private String stage;

    @Size(max = 20, message = "Use at most 20 tags")
    private List<@Size(max = 50, message = "Tags must be at most 50 characters") String> tags;

    @Size(max = 5000, message = "Notes must be at most 5000 characters")
    private String notes;

    @NotNull(message = "Choose an interest level")
    private InterestLevel interestLevel;
}
