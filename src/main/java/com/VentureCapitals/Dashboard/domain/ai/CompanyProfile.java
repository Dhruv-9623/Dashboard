package com.VentureCapitals.Dashboard.domain.ai;

import java.util.UUID;

/** A company as the AI layer sees it: an opportunity being triaged, or a holding being compared against. */
public record CompanyProfile(UUID id, String name, String sector, String stage, Long askAmount,
                             String currency, String description) {
}
