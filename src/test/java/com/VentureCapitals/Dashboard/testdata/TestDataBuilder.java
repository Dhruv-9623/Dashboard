package com.VentureCapitals.Dashboard.testdata;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Central factory for test data.
 *
 * <pre>
 * User user = TestDataBuilder.user().withEmail("test@example.com").build();
 * VCFirm firm = TestDataBuilder.vcFirm().withName("Sequoia").build();
 * </pre>
 *
 * <p>Defaults are unique but <em>deterministic</em>: {@link #unique} appends a counter rather than
 * a random value. Random defaults (this used JavaFaker) make a failure reproduce only sometimes,
 * and a test that needs a particular value should say so with a {@code with…} call anyway.
 */
public class TestDataBuilder {

    private static final AtomicLong SEQUENCE = new AtomicLong();

    /** A value unique within the JVM, e.g. {@code unique("firm")} → {@code "firm-7"}. */
    public static String unique(String prefix) {
        return prefix + "-" + SEQUENCE.incrementAndGet();
    }

    public static UserTestDataBuilder user() {
        return new UserTestDataBuilder();
    }

    public static VCFirmTestDataBuilder vcFirm() {
        return new VCFirmTestDataBuilder();
    }

    public static StartupTestDataBuilder startup() {
        return new StartupTestDataBuilder();
    }

    public static InvestmentTestDataBuilder investment() {
        return new InvestmentTestDataBuilder();
    }
}
