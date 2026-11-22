package com.VentureCapitals.Dashboard.domain.ai;

import com.VentureCapitals.Dashboard.common.MoneyFormat;
import com.VentureCapitals.Dashboard.domain.ai.ConflictAssessment.Dimension;
import com.VentureCapitals.Dashboard.domain.ai.ConflictAssessment.Match;
import com.VentureCapitals.Dashboard.domain.ai.DigestDraft.Alert;
import com.VentureCapitals.Dashboard.domain.ai.OpportunityScore.Citation;
import com.VentureCapitals.Dashboard.domain.conflict.ConflictDimensionType;
import com.VentureCapitals.Dashboard.domain.digest.AlertSeverity;
import com.VentureCapitals.Dashboard.domain.opportunity.RecommendedAction;
import com.VentureCapitals.Dashboard.domain.signals.Sentiment;
import com.VentureCapitals.Dashboard.domain.signals.SignalType;
import com.VentureCapitals.Dashboard.domain.suggestion.SuggestionType;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Rule-based judgement with the reasoning written out.
 *
 * <p>Every number here has a stated weight and every result carries the sentence that explains it,
 * so a user disagreeing with a score can see exactly which rule they disagree with. Weights are
 * constants at the top of each method rather than configuration: they are product decisions, and
 * a change should show up in a diff and a test.
 */
@Service
public class HeuristicAIService implements AIService {

    /** Stage order, so "one step away" means something. Matches the enum, not the display labels. */
    private static final List<String> STAGE_ORDER =
            List.of("PRE_SEED", "SEED", "SERIES_A", "SERIES_B", "SERIES_C_PLUS", "GROWTH");

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH);

    // --- Scoring ----------------------------------------------------------------------------

    @Override
    public OpportunityScore scoreOpportunity(ThesisProfile thesis, CompanyProfile candidate) {
        if (thesis == null || thesis.sectors().isEmpty() || thesis.stages().isEmpty()) {
            return new OpportunityScore(null,
                    "There is no investment thesis to score against yet. Set one in Settings and rescore this opportunity.",
                    List.of(), RecommendedAction.NEEDS_MORE_INFO);
        }

        // 40 sector + 30 stage + 20 cheque + 10 detail = 100.
        int score = 0;
        List<Citation> citations = new ArrayList<>();

        if (containsIgnoreCase(thesis.sectors(), candidate.sector())) {
            score += 40;
            citations.add(new Citation(candidate.sector() + " is one of the sectors in your thesis ("
                    + String.join(", ", thesis.sectors()) + ").", "sectors", true));
        } else {
            citations.add(new Citation(candidate.sector() + " is outside the sectors in your thesis ("
                    + String.join(", ", thesis.sectors()) + ").", "sectors", false));
        }

        int distance = stageDistance(thesis.stages(), candidate.stage());
        if (distance == 0) {
            score += 30;
            citations.add(new Citation(label(candidate.stage()) + " is a stage you invest at ("
                    + thesis.stages().stream().map(HeuristicAIService::label).collect(Collectors.joining(", ")) + ").", "stages", true));
        } else if (distance == 1) {
            score += 12;
            citations.add(new Citation(label(candidate.stage()) + " is one step outside the stages you invest at.", "stages", false));
        } else {
            citations.add(new Citation(label(candidate.stage()) + " is well outside the stages you invest at.", "stages", false));
        }

        score += chequeFit(thesis, candidate, citations);

        String description = candidate.description() == null ? "" : candidate.description().trim();
        if (description.length() >= 80) {
            score += 10;
            citations.add(new Citation("It is specific about what it does: \"" + opening(description) + "\".", "notes", true));
        } else {
            citations.add(new Citation("Little detail was provided, so treat this score as an estimate.", "notes", false));
        }

        RecommendedAction action = score >= 70 ? RecommendedAction.PURSUE
                : score <= 39 ? RecommendedAction.PASS
                : RecommendedAction.NEEDS_MORE_INFO;
        return new OpportunityScore(score, rationale(score, citations), citations, action);
    }

    private static int chequeFit(ThesisProfile thesis, CompanyProfile candidate, List<Citation> citations) {
        if (candidate.askAmount() == null) {
            citations.add(new Citation("No ask was given, so the cheque size can't be checked.", "chequeSize", false));
            return 10;
        }
        if (thesis.currency() != null && candidate.currency() != null
                && !thesis.currency().equals(candidate.currency())) {
            citations.add(new Citation("The ask is in " + candidate.currency() + " and your cheque range is in "
                    + thesis.currency() + ", so they aren't compared.", "chequeSize", false));
            return 10;
        }
        if (thesis.chequeMin() == null && thesis.chequeMax() == null) {
            citations.add(new Citation("Your thesis sets no cheque limits.", "chequeSize", true));
            return 20;
        }
        long ask = candidate.askAmount();
        boolean aboveFloor = thesis.chequeMin() == null || ask >= thesis.chequeMin();
        boolean belowCeiling = thesis.chequeMax() == null || ask <= thesis.chequeMax();
        String currency = thesis.currency() == null ? candidate.currency() : thesis.currency();
        if (aboveFloor && belowCeiling) {
            citations.add(new Citation("The ask of " + MoneyFormat.format(ask, currency)
                    + " is inside your cheque range" + rangeText(thesis, currency) + ".", "chequeSize", true));
            return 20;
        }
        citations.add(new Citation("The ask of " + MoneyFormat.format(ask, currency) + " is "
                + (aboveFloor ? "above" : "below") + " your cheque range" + rangeText(thesis, currency) + ".", "chequeSize", false));
        return 0;
    }

    private static String rationale(int score, List<Citation> citations) {
        String favouring = citations.stream().filter(Citation::supporting).map(Citation::claim)
                .collect(Collectors.joining(" "));
        String against = citations.stream().filter(c -> !c.supporting()).map(Citation::claim)
                .collect(Collectors.joining(" "));
        StringBuilder out = new StringBuilder("Fit score " + score + "/100 against your thesis.");
        if (!favouring.isEmpty()) out.append(" For: ").append(favouring);
        if (!against.isEmpty()) out.append(" Against: ").append(against);
        return out.toString();
    }

    // --- Conflicts --------------------------------------------------------------------------

    @Override
    public ConflictAssessment assessConflicts(CompanyProfile candidate, List<CompanyProfile> holdings) {
        List<Dimension> dimensions = List.of(
                sectorOverlap(candidate, holdings),
                customerOverlap(candidate, holdings),
                competitiveProduct(candidate, holdings));

        double max = dimensions.stream().mapToDouble(Dimension::confidence).max().orElse(0);
        double mean = dimensions.stream().mapToDouble(Dimension::confidence).average().orElse(0);
        // Weighted toward the worst dimension: one serious collision is not diluted by two clean ones.
        return new ConflictAssessment(round(0.6 * max + 0.4 * mean), dimensions);
    }

    private static Dimension sectorOverlap(CompanyProfile candidate, List<CompanyProfile> holdings) {
        List<Match> matches = holdings.stream()
                .filter(h -> h.sector() != null && h.sector().equalsIgnoreCase(candidate.sector()))
                .map(h -> new Match(h.id(), h.name(), "Also operates in " + candidate.sector() + "."))
                .toList();
        if (matches.isEmpty()) {
            return new Dimension(ConflictDimensionType.SECTOR_OVERLAP, 0,
                    "No current holding operates in " + candidate.sector() + ".", List.of());
        }
        // One neighbour is a note; several is a concentration.
        double confidence = Math.min(1.0, 0.35 + 0.25 * (matches.size() - 1));
        return new Dimension(ConflictDimensionType.SECTOR_OVERLAP, round(confidence),
                matches.size() + (matches.size() == 1 ? " holding operates" : " holdings operate") + " in "
                        + candidate.sector() + ": " + names(matches) + ".", matches);
    }

    private static Dimension customerOverlap(CompanyProfile candidate, List<CompanyProfile> holdings) {
        Set<String> wanted = TextSimilarity.audience(candidate.description());
        if (wanted.isEmpty()) {
            return new Dimension(ConflictDimensionType.CUSTOMER_OVERLAP, 0,
                    "The description doesn't say who the company sells to, so customer overlap can't be judged.", List.of());
        }
        List<Match> matches = new ArrayList<>();
        double best = 0;
        for (CompanyProfile holding : holdings) {
            Set<String> theirs = TextSimilarity.audience(holding.description());
            double similarity = TextSimilarity.jaccard(wanted, theirs);
            if (similarity >= 0.2) {
                Set<String> shared = new java.util.TreeSet<>(wanted);
                shared.retainAll(theirs);
                matches.add(new Match(holding.id(), holding.name(),
                        "Sells to a similar audience (" + TextSimilarity.preview(shared) + ")."));
                best = Math.max(best, similarity);
            }
        }
        if (matches.isEmpty()) {
            return new Dimension(ConflictDimensionType.CUSTOMER_OVERLAP, 0,
                    "No portfolio company describes the same buyers.", List.of());
        }
        return new Dimension(ConflictDimensionType.CUSTOMER_OVERLAP, round(Math.min(1.0, best * 1.5)),
                "Sells to buyers that " + names(matches) + " also target.", matches);
    }

    private static Dimension competitiveProduct(CompanyProfile candidate, List<CompanyProfile> holdings) {
        Set<String> product = TextSimilarity.terms(candidate.description());
        List<Match> matches = new ArrayList<>();
        double best = 0;
        for (CompanyProfile holding : holdings) {
            boolean sameSector = holding.sector() != null && holding.sector().equalsIgnoreCase(candidate.sector());
            double words = TextSimilarity.jaccard(product, TextSimilarity.terms(holding.description()));
            // Shared sector is half the case; shared vocabulary has to supply the rest.
            double score = Math.min(1.0, (sameSector ? 0.35 : 0) + 1.5 * words);
            if (score >= 0.35) {
                matches.add(new Match(holding.id(), holding.name(),
                        sameSector ? "Same sector, with overlapping product language." : "Overlapping product language."));
                best = Math.max(best, score);
            }
        }
        if (matches.isEmpty()) {
            return new Dimension(ConflictDimensionType.COMPETITIVE_PRODUCT, 0,
                    "No holding's product reads as competing.", List.of());
        }
        return new Dimension(ConflictDimensionType.COMPETITIVE_PRODUCT, round(best),
                "The product may compete with " + names(matches) + ".", matches);
    }

    // --- Digest -----------------------------------------------------------------------------

    @Override
    public DigestDraft composeDigest(DigestFacts facts) {
        List<Alert> alerts = new ArrayList<>();

        for (DigestFacts.OpenRound round : facts.openRounds()) {
            alerts.add(new Alert(round.investmentId(), round.company(), AlertSeverity.INFO,
                    round.company() + " is raising a " + round.round() + " round — worth checking your pro-rata."));
        }
        // A company's own "opened a round" headline is the same event as the open-round alert above,
        // and the same headline can arrive from two feeds: say each thing once.
        Set<String> raising = facts.openRounds().stream().map(DigestFacts.OpenRound::company).collect(Collectors.toSet());
        Set<String> said = new HashSet<>();
        for (DigestFacts.SignalFact signal : facts.signals()) {
            if (signal.type() == SignalType.FUNDING && signal.sentiment() == Sentiment.POSITIVE
                    && raising.contains(signal.company())) {
                continue;
            }
            if (!said.add(signal.company() + "|" + signal.headline().trim().toLowerCase(Locale.ROOT))) {
                continue;
            }
            if (signal.sentiment() == Sentiment.NEGATIVE) {
                AlertSeverity severity = signal.type() == SignalType.REGULATORY ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
                alerts.add(new Alert(signal.investmentId(), signal.company(), severity, signal.headline()));
            } else if (signal.sentiment() == Sentiment.POSITIVE) {
                alerts.add(new Alert(signal.investmentId(), signal.company(), AlertSeverity.INFO, signal.headline()));
            }
        }
        for (DigestFacts.UnrecordedPledge pledge : facts.pledges()) {
            alerts.add(new Alert(null, pledge.company(), AlertSeverity.WARNING,
                    "Your " + MoneyFormat.format(pledge.amount(), pledge.currency()) + " pledge to " + pledge.company()
                            + " has closed but isn't recorded as an investment yet."));
        }

        Map<String, Long> bySector = new LinkedHashMap<>();
        Map<String, Long> byCurrency = new LinkedHashMap<>();
        for (DigestFacts.Holding holding : facts.holdings()) {
            bySector.merge(holding.sector() == null ? "Other" : holding.sector(), holding.amount(), Long::sum);
            byCurrency.merge(holding.currency(), holding.amount(), Long::sum);
        }
        long total = bySector.values().stream().mapToLong(Long::longValue).sum();
        bySector.entrySet().stream().max(Map.Entry.comparingByValue()).ifPresent(top -> {
            double share = total == 0 ? 0 : (double) top.getValue() / total;
            if (byCurrency.size() == 1 && facts.holdings().size() > 2 && share > 0.6) {
                alerts.add(new Alert(null, null, AlertSeverity.WARNING, top.getKey() + " is "
                        + Math.round(share * 100) + "% of capital at work — worth watching for concentration."));
            }
        });

        alerts.sort(Comparator.comparing((Alert a) -> a.severity()).reversed());
        return new DigestDraft(summary(facts, byCurrency, bySector, total, alerts), alerts);
    }

    private static String summary(DigestFacts facts, Map<String, Long> byCurrency, Map<String, Long> bySector,
                                  long total, List<Alert> alerts) {
        StringBuilder out = new StringBuilder();
        out.append("**").append(facts.firmName()).append("** — portfolio digest, ")
                .append(DAY.format(facts.from())).append(" to ").append(DAY.format(facts.to())).append("\n\n");

        if (facts.holdings().isEmpty()) {
            return out.append("No active positions yet. Record an investment and this digest starts tracking it.").toString();
        }

        String money = byCurrency.entrySet().stream()
                .map(e -> MoneyFormat.format(e.getValue(), e.getKey())).collect(Collectors.joining(" + "));
        out.append("**Capital at work:** ").append(money).append(" across ")
                .append(facts.holdings().size()).append(facts.holdings().size() == 1 ? " position" : " positions").append(".\n");
        bySector.entrySet().stream().max(Map.Entry.comparingByValue()).ifPresent(top -> {
            if (byCurrency.size() == 1 && total > 0) {
                out.append("**Largest sector:** ").append(top.getKey()).append(" (")
                        .append(Math.round(100.0 * top.getValue() / total)).append("%).\n");
            }
        });

        out.append("\n");
        if (alerts.isEmpty()) {
            out.append("Nothing needs your attention this period.");
        } else {
            out.append("**").append(alerts.size()).append(alerts.size() == 1 ? " thing" : " things")
                    .append(" to look at:**\n");
            alerts.stream().limit(6).forEach(a -> out.append("- ").append(a.message()).append("\n"));
        }
        return out.toString().stripTrailing();
    }

    // --- Matching ---------------------------------------------------------------------------

    @Override
    public List<MatchSuggestion> suggestMatches(MatchSubject subject, List<MatchCandidate> candidates, int limit) {
        // An investor can act on a startup that is raising; a founder looking at investors has no
        // equivalent, so that term is left out of the ceiling rather than silently capping scores.
        double ceiling = subject.type() == SuggestionType.STARTUP_FOR_VC ? 1.0 : 0.9;

        return candidates.stream()
                .map(candidate -> match(subject, candidate, ceiling))
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparingDouble(MatchSuggestion::score).reversed()
                        .thenComparing(s -> s.candidateId().toString()))
                .limit(limit)
                .toList();
    }

    private static MatchSuggestion match(MatchSubject subject, MatchCandidate candidate, double ceiling) {
        double raw = 0;
        List<String> reasons = new ArrayList<>();

        Set<String> sharedSectors = intersectionIgnoreCase(subject.sectors(), candidate.sectors());
        if (!sharedSectors.isEmpty()) {
            raw += 0.5;
            reasons.add("Works in " + String.join(" and ", sharedSectors) + ".");
        }

        int distance = minStageDistance(subject.stages(), candidate.stages());
        if (distance == 0) {
            raw += 0.3;
            reasons.add("Stage lines up.");
        } else if (distance == 1) {
            raw += 0.12;
            reasons.add("Stage is one step away.");
        }

        if (rangesOverlap(subject.rangeMin(), subject.rangeMax(), candidate.rangeMin(), candidate.rangeMax())) {
            raw += 0.1;
            reasons.add("Cheque and ticket ranges overlap.");
        }
        if (subject.type() == SuggestionType.STARTUP_FOR_VC && candidate.live()) {
            raw += 0.1;
            reasons.add("Is raising right now.");
        }

        // A sector or a stage has to be in common; ranges and timing alone are not a reason to introduce anyone.
        if (sharedSectors.isEmpty() && distance != 0) return null;
        if (raw < 0.4) return null;
        return new MatchSuggestion(candidate.id(), round(Math.min(1.0, raw / ceiling)), String.join(" ", reasons));
    }

    // --- shared helpers ---------------------------------------------------------------------

    private static boolean containsIgnoreCase(Set<String> values, String wanted) {
        return wanted != null && values.stream().anyMatch(v -> v.equalsIgnoreCase(wanted.trim()));
    }

    private static Set<String> intersectionIgnoreCase(Set<String> a, Set<String> b) {
        Set<String> out = new java.util.TreeSet<>();
        for (String x : a) {
            for (String y : b) {
                if (x.equalsIgnoreCase(y)) out.add(x);
            }
        }
        return out;
    }

    private static int stageDistance(Set<String> stages, String stage) {
        return minStageDistance(stages, Set.of(stage == null ? "" : stage));
    }

    private static int minStageDistance(Set<String> a, Set<String> b) {
        int best = Integer.MAX_VALUE;
        for (String x : a) {
            for (String y : b) {
                int i = STAGE_ORDER.indexOf(x), j = STAGE_ORDER.indexOf(y);
                if (i >= 0 && j >= 0) best = Math.min(best, Math.abs(i - j));
            }
        }
        return best;
    }

    private static boolean rangesOverlap(Long minA, Long maxA, Long minB, Long maxB) {
        if (minA == null && maxA == null) return false;
        if (minB == null && maxB == null) return false;
        long lowA = minA == null ? 0 : minA, highA = maxA == null ? Long.MAX_VALUE : maxA;
        long lowB = minB == null ? 0 : minB, highB = maxB == null ? Long.MAX_VALUE : maxB;
        return lowA <= highB && lowB <= highA;
    }

    private static String names(List<Match> matches) {
        return matches.stream().map(Match::companyName).collect(Collectors.joining(", "));
    }

    /** " (₹1.00 Cr to ₹10.00 Cr)" — the limits the ask is being held against, so the claim can be checked. */
    private static String rangeText(ThesisProfile thesis, String currency) {
        if (thesis.chequeMin() != null && thesis.chequeMax() != null) {
            return " (" + MoneyFormat.format(thesis.chequeMin(), currency) + " to "
                    + MoneyFormat.format(thesis.chequeMax(), currency) + ")";
        }
        if (thesis.chequeMin() != null) return " (from " + MoneyFormat.format(thesis.chequeMin(), currency) + ")";
        if (thesis.chequeMax() != null) return " (up to " + MoneyFormat.format(thesis.chequeMax(), currency) + ")";
        return "";
    }

    /** The first sentence of a description, trimmed to a line, for quoting back to the reader. */
    private static String opening(String description) {
        String first = description.split("(?<=[.!?])\\s", 2)[0].trim();
        if (first.endsWith(".")) first = first.substring(0, first.length() - 1);
        if (first.length() <= 90) return first;
        String cut = first.substring(0, 89);
        int space = cut.lastIndexOf(' ');
        return (space > 40 ? cut.substring(0, space) : cut).trim() + "…";
    }

    private static String label(String stage) {
        if (stage == null) return "This stage";
        return switch (stage) {
            case "PRE_SEED" -> "Pre-Seed";
            case "SEED" -> "Seed";
            case "SERIES_A" -> "Series A";
            case "SERIES_B" -> "Series B";
            case "SERIES_C_PLUS" -> "Series C+";
            case "GROWTH" -> "Growth";
            default -> stage;
        };
    }

    private static double round(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }
}
