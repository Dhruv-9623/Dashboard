package com.VentureCapitals.Dashboard.domain.pool;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdatePoolEntryRequest {
    private List<String> tags;
    private String notes;
    private InterestLevel interestLevel;
}
