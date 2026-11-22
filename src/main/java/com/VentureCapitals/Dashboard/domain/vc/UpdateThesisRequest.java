package com.VentureCapitals.Dashboard.domain.vc;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** The whole thesis, replaced in one go (PUT semantics). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateThesisRequest {
    // Scoring needs something to score against, which is why these two are required.
    @NotEmpty(message = "Pick at least one sector — Deal Triage scores against these.")
    @Size(max = 30, message = "Choose at most 30 sectors")
    private List<@Size(max = 100, message = "A sector name must be at most 100 characters") String> sectors;

    @NotEmpty(message = "Pick at least one stage.")
    @Size(max = 10, message = "Choose at most 10 stages")
    private List<@Pattern(regexp = "^(PRE_SEED|SEED|SERIES_A|SERIES_B|SERIES_C_PLUS|GROWTH)$",
            message = "Unknown stage") String> stages;

    @PositiveOrZero(message = "Minimum cheque size can't be negative")
    private Long chequeSizeMin;

    @PositiveOrZero(message = "Maximum cheque size can't be negative")
    private Long chequeSizeMax;

    @NotNull(message = "Currency is required")
    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a three-letter ISO code, such as INR")
    private String currency;

    @Size(max = 5000, message = "Notes must be at most 5000 characters")
    private String notes;
}
