package com.VentureCapitals.Dashboard.domain.vc;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Full replacement of the editable firm fields (PUT semantics), so name is still required. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateVCFirmRequest {
    @NotBlank(message = "Firm name is required")
    @Size(max = 255, message = "Firm name must be at most 255 characters")
    private String name;

    @Size(max = 5000, message = "Description must be at most 5000 characters")
    private String description;

    @Pattern(regexp = "^https?://\\S+$", message = "Website must start with http:// or https://")
    @Size(max = 255, message = "Website must be at most 255 characters")
    private String website;

    @PositiveOrZero(message = "AUM can't be negative")
    private Long aum;

    @Size(max = 100, message = "Investment stage must be at most 100 characters")
    private String investmentStage;

    @Size(max = 30, message = "Choose at most 30 sectors")
    private List<String> sectors;

    @Size(max = 255, message = "Location must be at most 255 characters")
    private String location;

    @Min(value = 1900, message = "Founded year looks too early")
    @Max(value = 2100, message = "Founded year looks too late")
    private Integer foundedYear;
}
