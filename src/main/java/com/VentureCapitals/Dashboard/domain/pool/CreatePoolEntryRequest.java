package com.VentureCapitals.Dashboard.domain.pool;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePoolEntryRequest {
    private UUID startupId;
    private String companyName;
    private List<String> tags;
    private String notes;
    private InterestLevel interestLevel;
}
