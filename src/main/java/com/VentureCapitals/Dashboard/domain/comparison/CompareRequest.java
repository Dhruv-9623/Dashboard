package com.VentureCapitals.Dashboard.domain.comparison;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompareRequest {
    @NotEmpty(message = "Pick at least one startup to compare")
    @Size(max = ComparisonService.MAX_STARTUPS, message = "Compare at most 6 startups at a time")
    private List<UUID> startupIds;
}
