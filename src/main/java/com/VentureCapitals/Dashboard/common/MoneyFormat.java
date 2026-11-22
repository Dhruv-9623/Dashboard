package com.VentureCapitals.Dashboard.common;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.Locale;

/**
 * Money as a person reads it, for the messages the API writes itself.
 *
 * <p>Mirrors the frontend's {@code formatMoney}, so a rule error and the figure on the screen
 * beside it say the same thing. "This round's minimum ticket is 10000000 INR" was accurate and
 * unreadable; "₹1.00 Cr" is what the founder typed when they set the round up.
 */
public final class MoneyFormat {
    private static final long CRORE = 10_000_000L;
    private static final long LAKH = 100_000L;
    private static final long MILLION = 1_000_000L;

    private MoneyFormat() {
    }

    public static String format(long amount, String currency) {
        if ("INR".equals(currency)) {
            if (amount >= CRORE) return "₹" + scaled(amount, CRORE) + " Cr";
            if (amount >= LAKH) return "₹" + scaled(amount, LAKH) + " L";
            return "₹" + grouped(amount, new Locale("en", "IN"));
        }
        String symbol = "USD".equals(currency) ? "$" : currency + " ";
        if (amount >= MILLION) return symbol + scaled(amount, MILLION) + "M";
        return symbol + grouped(amount, Locale.US);
    }

    private static String scaled(long amount, long unit) {
        return BigDecimal.valueOf(amount)
                .divide(BigDecimal.valueOf(unit), 2, RoundingMode.HALF_UP)
                .toPlainString();
    }

    private static String grouped(long amount, Locale locale) {
        return NumberFormat.getIntegerInstance(locale).format(amount);
    }
}
