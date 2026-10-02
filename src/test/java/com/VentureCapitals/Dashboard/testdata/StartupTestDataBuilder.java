package com.VentureCapitals.Dashboard.testdata;

import com.VentureCapitals.Dashboard.domain.startup.Startup;

public class StartupTestDataBuilder {

    private String name = TestDataBuilder.unique("Firm");

    public StartupTestDataBuilder withName(String name) {
        this.name = name;
        return this;
    }

    public Startup build() {
        return Startup.builder()
                .name(name)
                .build();
    }
}
