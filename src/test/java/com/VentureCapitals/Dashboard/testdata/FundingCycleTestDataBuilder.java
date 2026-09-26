package com.VentureCapitals.Dashboard.testdata;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Placeholder builder for FundingCycle.
 * Will be fully implemented when the FundingCycle entity is created.
 *
 * Usage:
 * FundingCycleTestDataBuilder builder = TestDataBuilder.fundingCycle();
 * // To be implemented
 */
public class FundingCycleTestDataBuilder {

    private UUID id = UUID.randomUUID();
    private UUID startupId = UUID.randomUUID();
    private String roundType = "SEED";
    private BigDecimal targetAmount = new BigDecimal("2000000");

    public FundingCycleTestDataBuilder withId(UUID id) {
        this.id = id;
        return this;
    }

    public FundingCycleTestDataBuilder withStartupId(UUID startupId) {
        this.startupId = startupId;
        return this;
    }

    public FundingCycleTestDataBuilder withRoundType(String roundType) {
        this.roundType = roundType;
        return this;
    }

    public FundingCycleTestDataBuilder withTargetAmount(BigDecimal amount) {
        this.targetAmount = amount;
        return this;
    }

    public Object build() {
        // TODO: Implement when FundingCycle entity is created
        throw new UnsupportedOperationException(
            "FundingCycleTestDataBuilder.build() - Implement when FundingCycle entity is created"
        );
    }
}
