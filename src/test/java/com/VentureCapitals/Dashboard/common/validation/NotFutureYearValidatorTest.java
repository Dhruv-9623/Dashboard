package com.VentureCapitals.Dashboard.common.validation;

import org.junit.jupiter.api.Test;

import java.time.Year;

import static org.assertj.core.api.Assertions.assertThat;

class NotFutureYearValidatorTest {
    private final NotFutureYearValidator validator = new NotFutureYearValidator();
    private final int thisYear = Year.now().getValue();

    @Test
    void this_year_and_earlier_pass() {
        assertThat(validator.isValid(thisYear, null)).isTrue();
        assertThat(validator.isValid(1999, null)).isTrue();
    }

    @Test
    void next_year_and_beyond_are_refused() {
        assertThat(validator.isValid(thisYear + 1, null)).isFalse();
        assertThat(validator.isValid(2099, null)).isFalse();
    }

    @Test
    void a_missing_year_passes_because_the_field_is_optional() {
        assertThat(validator.isValid(null, null)).isTrue();
    }
}
