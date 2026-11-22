package com.VentureCapitals.Dashboard.domain.ai;

import com.VentureCapitals.Dashboard.domain.conflict.ConflictDimensionType;

import java.util.List;
import java.util.UUID;

/** @param overall 0–1, blended across the dimensions */
public record ConflictAssessment(double overall, List<Dimension> dimensions) {

    public record Dimension(ConflictDimensionType type, double confidence, String summary, List<Match> matches) {
    }

    public record Match(UUID companyId, String companyName, String note) {
    }
}
