package com.VentureCapitals.Dashboard.domain.startup;

/** Company stage shown on profiles and used for discovery filters. Matches the frontend's STAGES. */
public enum StartupStage {
    PRE_SEED,
    SEED,
    SERIES_A,
    SERIES_B,
    SERIES_C_PLUS,
    GROWTH;

    /**
     * Reads a stage written either as the enum name ({@code SERIES_A}) or as people write it
     * ({@code Series A}, {@code Pre-Seed}, {@code Series C+}).
     *
     * <p>Needed because a firm's profile stores its investment stage as the label it picked from a
     * dropdown, while everything else on the platform speaks in enum names. Empty when the text
     * is neither — free text such as "Early stage" is not guessed at.
     */
    public static java.util.Optional<StartupStage> parse(String text) {
        if (text == null || text.isBlank()) return java.util.Optional.empty();
        String normalised = text.trim().toUpperCase(java.util.Locale.ROOT)
                .replace("+", "_PLUS").replaceAll("[\\s-]+", "_");
        for (StartupStage stage : values()) {
            if (stage.name().equals(normalised)) return java.util.Optional.of(stage);
        }
        return java.util.Optional.empty();
    }
}
