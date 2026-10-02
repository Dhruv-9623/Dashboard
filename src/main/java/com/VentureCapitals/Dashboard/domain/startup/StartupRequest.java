package com.VentureCapitals.Dashboard.domain.startup;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Body for POST and PUT /api/startups (full replacement of the editable profile fields). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StartupRequest {
    private static final String HTTP_URL = "^https?://\\S+$";

    @NotBlank(message = "Company name is required")
    @Size(max = 255, message = "Company name must be at most 255 characters")
    private String name;

    @Size(max = 5000, message = "Description must be at most 5000 characters")
    private String description;

    // http(s) only: these are rendered as links, so javascript: and similar schemes are rejected.
    @Pattern(regexp = HTTP_URL, message = "Website must start with http:// or https://")
    @Size(max = 255, message = "Website must be at most 255 characters")
    private String website;

    @Pattern(regexp = HTTP_URL, message = "Logo URL must start with http:// or https://")
    @Size(max = 512, message = "Logo URL must be at most 512 characters")
    private String logoUrl;

    @NotBlank(message = "Choose a sector")
    @Size(max = 100, message = "Sector must be at most 100 characters")
    private String sector;

    @NotNull(message = "Choose a stage")
    private StartupStage stage;

    @Size(max = 255, message = "Location must be at most 255 characters")
    private String location;

    @Min(value = 1900, message = "Founded year looks too early")
    @Max(value = 2100, message = "Founded year looks too late")
    private Integer foundedYear;

    @PositiveOrZero(message = "Revenue can't be negative")
    private Long annualRevenue;

    @Min(value = 1, message = "Team size must be at least 1")
    @Max(value = 1_000_000, message = "Team size looks too large")
    private Integer teamSize;

    @Pattern(regexp = HTTP_URL, message = "Pitch deck URL must start with http:// or https://")
    @Size(max = 512, message = "Pitch deck URL must be at most 512 characters")
    private String pitchDeckUrl;
}
