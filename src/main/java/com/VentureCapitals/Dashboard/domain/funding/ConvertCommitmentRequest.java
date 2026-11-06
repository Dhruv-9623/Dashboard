package com.VentureCapitals.Dashboard.domain.funding;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * The firm turning its own closed-round pledge into a portfolio record.
 *
 * <p>Everything here is optional, and everything absent is taken from the pledge or the round:
 * amount, currency and round type are already known and are deliberately not accepted from the
 * client, so a conversion can't quietly disagree with what was pledged. What only the investor
 * knows is the equity it received, which is why that is the one field worth asking for.
 */
@Data
public class ConvertCommitmentRequest {

    @DecimalMin(value = "0.00", message = "Equity can't be negative")
    @DecimalMax(value = "100.00", message = "Equity can't exceed 100%")
    @Digits(integer = 3, fraction = 2, message = "Equity allows at most 2 decimal places")
    private BigDecimal equityPercentage;

    /** Defaults to the day the round closed. */
    @PastOrPresent(message = "The investment date can't be in the future")
    private LocalDate investmentDate;

    @Size(max = 5000, message = "Notes must be at most 5000 characters")
    private String notes;
}
