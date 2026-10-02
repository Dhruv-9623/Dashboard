package com.VentureCapitals.Dashboard.testdata;

import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import java.util.UUID;

/**
 * Builder for creating VCFirm test data.
 *
 * Usage:
 * VCFirm firm = TestDataBuilder.vcFirm().withName("Sequoia").build();
 */
public class VCFirmTestDataBuilder {

    // Null by default so repository saves insert rather than merge (see UserTestDataBuilder).
    private UUID id = null;
    private String name = TestDataBuilder.unique("Firm");
    private String description = "An early-stage fund.";
    private String website = "https://example.com";
    private Long aum = 100_000_000L;
    private String investmentStage = "SEED,SERIES_A,SERIES_B";
    private String location = "Bengaluru";
    private int foundedYear = 2015;

    public VCFirmTestDataBuilder withId(UUID id) {
        this.id = id;
        return this;
    }

    public VCFirmTestDataBuilder withName(String name) {
        this.name = name;
        return this;
    }

    public VCFirmTestDataBuilder withDescription(String description) {
        this.description = description;
        return this;
    }

    public VCFirmTestDataBuilder withWebsite(String website) {
        this.website = website;
        return this;
    }

    public VCFirmTestDataBuilder withAUM(Long aum) {
        this.aum = aum;
        return this;
    }

    public VCFirmTestDataBuilder withLocation(String location) {
        this.location = location;
        return this;
    }

    public VCFirmTestDataBuilder withFoundedYear(int year) {
        this.foundedYear = year;
        return this;
    }

    public VCFirm build() {
        VCFirm firm = VCFirm.builder()
                .name(name)
                .description(description)
                .website(website)
                .aum(aum)
                .investmentStage(investmentStage)
                .location(location)
                .foundedYear(foundedYear)
                .build();
        if (id != null) {
            firm.setId(id);
        }
        return firm;
    }
}
