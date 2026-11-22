package com.VentureCapitals.Dashboard.domain.ai;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * How alike two pieces of prose are, by the words they share.
 *
 * <p>Crude on purpose and honest about it: it knows nothing about meaning, only vocabulary. It is
 * what lets a conflict check say "these two descriptions talk about the same buyers" without a
 * model, and it is the first thing a model-backed {@link AIService} would replace.
 */
final class TextSimilarity {
    private static final Pattern NON_WORD = Pattern.compile("[^\\p{L}\\p{N}]+");
    // Words that carry no product or customer meaning, however often they recur in a pitch.
    private static final Set<String> STOP_WORDS = Set.of(
            "that", "this", "with", "from", "their", "they", "them", "your", "ours", "into", "over",
            "have", "has", "for", "and", "the", "are", "was", "will", "been", "more", "than", "such",
            "also", "using", "used", "uses", "help", "helps", "build", "built", "platform", "company",
            "startup", "solution", "software", "product", "products", "service", "services", "india",
            "indian", "teams", "team", "business", "businesses", "customers", "customer", "everything");

    private TextSimilarity() {
    }

    static Set<String> terms(String text) {
        if (text == null || text.isBlank()) return Set.of();
        Set<String> out = new HashSet<>();
        for (String word : NON_WORD.split(text.toLowerCase(Locale.ROOT))) {
            if (word.length() >= 4 && !STOP_WORDS.contains(word)) out.add(stem(word));
        }
        return out;
    }

    /**
     * The words describing who a company sells to: what follows "for" or "to" in its description,
     * up to the next punctuation. "Automated reconciliation for mid-market finance teams" yields
     * {@code mid, market, finance}; a description with no such phrase yields nothing, and the
     * caller treats that as "can't tell" rather than "no overlap".
     */
    static Set<String> audience(String description) {
        if (description == null) return Set.of();
        String lower = description.toLowerCase(Locale.ROOT);
        Set<String> out = new HashSet<>();
        for (String marker : new String[]{" for ", " to "}) {
            int at = lower.indexOf(marker);
            if (at < 0) continue;
            String clause = lower.substring(at + marker.length()).split("[.;,]")[0];
            out.addAll(terms(clause));
        }
        return out;
    }

    /** |A ∩ B| / |A ∪ B|, 0 when either side is empty. */
    static double jaccard(Set<String> a, Set<String> b) {
        if (a.isEmpty() || b.isEmpty()) return 0;
        long shared = a.stream().filter(b::contains).count();
        long union = a.size() + b.size() - shared;
        return union == 0 ? 0 : (double) shared / union;
    }

    private static String stem(String word) {
        // Enough to make "payments" and "payment", "teams" and "team" meet; not a real stemmer.
        for (String suffix : new String[]{"ing", "ies", "es", "s"}) {
            if (word.length() > suffix.length() + 3 && word.endsWith(suffix)) {
                return suffix.equals("ies") ? word.substring(0, word.length() - 3) + "y"
                        : word.substring(0, word.length() - suffix.length());
            }
        }
        return word;
    }

    static String preview(Set<String> terms) {
        return String.join(", ", Arrays.stream(terms.toArray(String[]::new)).sorted().limit(4).toList());
    }
}
