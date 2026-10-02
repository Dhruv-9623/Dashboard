package com.VentureCapitals.Dashboard.api.pool;

import com.VentureCapitals.Dashboard.domain.pool.InterestLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PoolEntryDTO {
    private UUID id;
    private UUID vcFirmId;
    /** Null for companies not on the platform. */
    private UUID startupId;
    private String companyName;
    private String sector;
    private String stage;
    /** Null once the member who added it has left the firm. */
    private String addedByEmail;
    private List<String> tags;
    private String notes;
    private InterestLevel interestLevel;
    private Instant addedAt;
}
