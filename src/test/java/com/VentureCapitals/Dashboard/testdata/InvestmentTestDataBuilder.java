package com.VentureCapitals.Dashboard.testdata;

import com.VentureCapitals.Dashboard.domain.investment.Investment;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentRound;
import com.VentureCapitals.Dashboard.domain.investment.InvestmentStatus;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public class InvestmentTestDataBuilder {

    private VCFirm vcFirm;
    private Startup startup;
    private LocalDate investmentDate = LocalDate.now();
    private Long amount = 500000L;
    private String currency = "USD";
    private InvestmentRound round = InvestmentRound.SEED;
    private BigDecimal equityPercentage = new BigDecimal("5.0");
    private InvestmentStatus status = InvestmentStatus.ACTIVE;
    private String notes = null;

    public InvestmentTestDataBuilder withVCFirm(VCFirm vcFirm) {
        this.vcFirm = vcFirm;
        return this;
    }

    public InvestmentTestDataBuilder withStartup(Startup startup) {
        this.startup = startup;
        return this;
    }

    public InvestmentTestDataBuilder withAmount(Long amount) {
        this.amount = amount;
        return this;
    }

    public InvestmentTestDataBuilder withRound(InvestmentRound round) {
        this.round = round;
        return this;
    }

    public InvestmentTestDataBuilder withStatus(InvestmentStatus status) {
        this.status = status;
        return this;
    }

    public Investment build() {
        // Use test data if not provided
        VCFirm finalVCFirm = vcFirm != null ? vcFirm : TestDataBuilder.vcFirm().build();
        Startup finalStartup = startup != null ? startup : TestDataBuilder.startup().build();

        return Investment.builder()
                .vcFirm(finalVCFirm)
                .startup(finalStartup)
                .investmentDate(investmentDate)
                .amount(amount)
                .currency(currency)
                .round(round)
                .equityPercentage(equityPercentage)
                .status(status)
                .notes(notes)
                .build();
    }
}
