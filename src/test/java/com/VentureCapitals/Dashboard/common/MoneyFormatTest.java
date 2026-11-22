package com.VentureCapitals.Dashboard.common;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MoneyFormatTest {

    @Test
    void rupees_read_in_crore_and_lakh_like_the_screen_does() {
        assertThat(MoneyFormat.format(10_000_000L, "INR")).isEqualTo("₹1.00 Cr");
        assertThat(MoneyFormat.format(250_000_000L, "INR")).isEqualTo("₹25.00 Cr");
        assertThat(MoneyFormat.format(9_000_000L, "INR")).isEqualTo("₹90.00 L");
        assertThat(MoneyFormat.format(150_000_000L, "INR")).isEqualTo("₹15.00 Cr");
    }

    @Test
    void small_rupee_amounts_use_indian_grouping() {
        assertThat(MoneyFormat.format(99_999L, "INR")).isEqualTo("₹99,999");
        assertThat(MoneyFormat.format(500L, "INR")).isEqualTo("₹500");
    }

    @Test
    void other_currencies_use_millions_and_their_own_symbol() {
        assertThat(MoneyFormat.format(2_000_000L, "USD")).isEqualTo("$2.00M");
        assertThat(MoneyFormat.format(500_000L, "USD")).isEqualTo("$500,000");
        assertThat(MoneyFormat.format(500_000L, "EUR")).isEqualTo("EUR 500,000");
    }
}
