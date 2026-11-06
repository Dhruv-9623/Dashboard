package com.VentureCapitals.Dashboard.domain.funding;

import com.VentureCapitals.Dashboard.domain.investment.InvestmentRound;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Create or update a round. `closedAt` is deliberately absent: the server owns it. */
@Data
public class FundingCycleRequest {

    @NotNull(message = "Round type is required")
    private InvestmentRound roundType;

    @NotNull(message = "Target amount is required")
    @Positive(message = "Target amount must be more than zero")
    private Long targetAmount;

    @NotNull(message = "Currency is required")
    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a three-letter ISO code, such as INR")
    private String currency;

    @Positive(message = "Minimum ticket size must be more than zero")
    private Long minTicketSize;

    @Positive(message = "Maximum ticket size must be more than zero")
    private Long maxTicketSize;

    @NotNull(message = "Status is required")
    private FundingCycleStatus status;

    @Size(max = 512, message = "Pitch deck URL is too long")
    @Pattern(regexp = "^$|^https?://.+", message = "Pitch deck URL must start with http:// or https://")
    private String pitchDeckUrl;

    @Size(max = 512, message = "Data room URL is too long")
    @Pattern(regexp = "^$|^https?://.+", message = "Data room URL must start with http:// or https://")
    private String dataRoomUrl;
}
