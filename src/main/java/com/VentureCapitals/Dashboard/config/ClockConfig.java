package com.VentureCapitals.Dashboard.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * The time source for code that asks "what is upcoming?" or "this quarter?".
 *
 * <p>A bean rather than {@code Instant.now()} in the service, so a test can hand in a fixed clock
 * and say what "now" is instead of building data relative to the day the suite happens to run.
 */
@Configuration
public class ClockConfig {
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
