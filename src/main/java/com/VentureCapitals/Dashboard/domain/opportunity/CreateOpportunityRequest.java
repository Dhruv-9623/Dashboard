package com.VentureCapitals.Dashboard.domain.opportunity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateOpportunityRequest {
    @NotBlank(message = "Company name is required")
    @Size(max = 255, message = "Company name must be at most 255 characters")
    private String companyName;

    @Pattern(regexp = "^$|^https?://\\S+$", message = "Website must start with http:// or https://")
    @Size(max = 512, message = "Website must be at most 512 characters")
    private String website;

    @NotBlank(message = "Sector is required")
    @Size(max = 255, message = "Sector must be at most 255 characters")
    private String sector;

    @NotBlank(message = "Stage is required")
    @Pattern(regexp = "^(PRE_SEED|SEED|SERIES_A|SERIES_B|SERIES_C_PLUS|GROWTH)$", message = "Unknown stage")
    private String stage;

    @Positive(message = "The ask must be more than zero")
    private Long askAmount;

    @NotBlank(message = "Currency is required")
    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a three-letter ISO code, such as INR")
    private String currency;

    @Size(max = 5000, message = "Description must be at most 5000 characters")
    private String description;

    @Pattern(regexp = "^$|^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", message = "Enter a valid email address")
    @Size(max = 255, message = "Email must be at most 255 characters")
    private String contactEmail;
}
