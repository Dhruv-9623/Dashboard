package com.VentureCapitals.Dashboard.domain.ai;

import com.VentureCapitals.Dashboard.domain.conflict.ConflictDimensionType;
import com.VentureCapitals.Dashboard.domain.digest.AlertSeverity;
import com.VentureCapitals.Dashboard.domain.opportunity.RecommendedAction;
import com.VentureCapitals.Dashboard.domain.signals.Sentiment;
import com.VentureCapitals.Dashboard.domain.signals.SignalType;
import com.VentureCapitals.Dashboard.domain.suggestion.SuggestionType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The engine's weights are product decisions, so they are pinned here: a change to one should be
 * a deliberate edit to a number in a test, not a drift nobody noticed.
 */
class HeuristicAIServiceTest {
    private final HeuristicAIService ai = new HeuristicAIService();

    private static final ThesisProfile THESIS = new ThesisProfile(
            Set.of("Fintech", "SaaS"), Set.of("SEED", "SERIES_A"), 10_000_000L, 100_000_000L, "INR");

    private static CompanyProfile company(String sector, String stage, Long ask, String description) {
        return new CompanyProfile(UUID.randomUUID(), "Acme", sector, stage, ask, "INR", description);
    }

    private static final String DETAILED = "Automated reconciliation for mid-market finance teams, plugging into Tally and Zoho Books.";

    // --- scoring ----------------------------------------------------------------------------

    @Test
    void a_company_that_fits_every_part_of_the_thesis_scores_a_hundred_and_is_pursued() {
        OpportunityScore score = ai.scoreOpportunity(THESIS, company("Fintech", "SEED", 50_000_000L, DETAILED));

        assertThat(score.fitScore()).isEqualTo(100);
        assertThat(score.action()).isEqualTo(RecommendedAction.PURSUE);
        assertThat(score.citations()).allMatch(OpportunityScore.Citation::supporting);
    }

    @Test
    void the_four_parts_carry_forty_thirty_twenty_and_ten() {
        assertThat(ai.scoreOpportunity(THESIS, company("Fintech", "GROWTH", 999_999_999L, null)).fitScore()).isEqualTo(40);
        assertThat(ai.scoreOpportunity(THESIS, company("Gaming", "SEED", 999_999_999L, null)).fitScore()).isEqualTo(30);
        assertThat(ai.scoreOpportunity(THESIS, company("Gaming", "GROWTH", 50_000_000L, null)).fitScore()).isEqualTo(20);
        assertThat(ai.scoreOpportunity(THESIS, company("Gaming", "GROWTH", 999_999_999L, DETAILED)).fitScore()).isEqualTo(10);
    }

    @Test
    void a_stage_one_step_outside_the_range_earns_partial_credit_and_says_so() {
        // Pre-Seed sits one step below Seed.
        OpportunityScore score = ai.scoreOpportunity(THESIS, company("Gaming", "PRE_SEED", 999_999_999L, null));

        assertThat(score.fitScore()).isEqualTo(12);
        assertThat(score.citations()).anyMatch(c -> c.thesisField().equals("stages")
                && !c.supporting() && c.claim().contains("one step outside"));
    }

    @Test
    void a_missing_ask_is_neither_rewarded_nor_punished_and_the_score_says_it_could_not_check() {
        OpportunityScore score = ai.scoreOpportunity(THESIS, company("Gaming", "GROWTH", null, null));

        assertThat(score.fitScore()).isEqualTo(10);
        assertThat(score.citations()).anyMatch(c -> c.thesisField().equals("chequeSize") && c.claim().contains("can't be checked"));
    }

    @Test
    void an_ask_in_another_currency_is_not_compared_against_a_rupee_range() {
        CompanyProfile dollars = new CompanyProfile(UUID.randomUUID(), "Acme", "Gaming", "GROWTH", 5_000_000L, "USD", null);

        OpportunityScore score = ai.scoreOpportunity(THESIS, dollars);

        assertThat(score.fitScore()).isEqualTo(10);
        assertThat(score.citations()).anyMatch(c -> c.claim().contains("aren't compared"));
    }

    @Test
    void an_ask_outside_the_cheque_range_costs_the_cheque_points_and_names_the_direction() {
        assertThat(ai.scoreOpportunity(THESIS, company("Fintech", "SEED", 500_000_000L, DETAILED)).citations())
                .anyMatch(c -> c.claim().contains("above your cheque range"));
        assertThat(ai.scoreOpportunity(THESIS, company("Fintech", "SEED", 1_000_000L, DETAILED)).citations())
                .anyMatch(c -> c.claim().contains("below your cheque range"));
    }

    @Test
    void the_recommendation_follows_the_score_bands() {
        assertThat(ai.scoreOpportunity(THESIS, company("Fintech", "SEED", 50_000_000L, null)).action())
                .isEqualTo(RecommendedAction.PURSUE);              // 90
        assertThat(ai.scoreOpportunity(THESIS, company("Fintech", "GROWTH", 999_999_999L, DETAILED)).action())
                .isEqualTo(RecommendedAction.NEEDS_MORE_INFO);     // 50
        assertThat(ai.scoreOpportunity(THESIS, company("Gaming", "GROWTH", 999_999_999L, null)).action())
                .isEqualTo(RecommendedAction.PASS);                // 0
    }

    @Test
    void sector_matching_ignores_case_and_surrounding_space() {
        assertThat(ai.scoreOpportunity(THESIS, company(" fintech ", "GROWTH", 999_999_999L, null)).fitScore()).isEqualTo(40);
    }

    @Test
    void with_no_thesis_there_is_no_score_rather_than_an_invented_one() {
        OpportunityScore score = ai.scoreOpportunity(null, company("Fintech", "SEED", 1L, DETAILED));

        assertThat(score.fitScore()).isNull();
        assertThat(score.action()).isEqualTo(RecommendedAction.NEEDS_MORE_INFO);
        assertThat(score.rationale()).contains("thesis");
    }

    @Test
    void the_rationale_states_the_score_and_both_sides_of_it() {
        OpportunityScore score = ai.scoreOpportunity(THESIS, company("Fintech", "GROWTH", null, null));

        assertThat(score.rationale()).startsWith("Fit score 50/100").contains("For:").contains("Against:");
    }

    // --- conflicts --------------------------------------------------------------------------

    private static CompanyProfile holding(String name, String sector, String description) {
        return new CompanyProfile(UUID.randomUUID(), name, sector, "SEED", null, "INR", description);
    }

    @Test
    void an_empty_portfolio_has_nothing_to_conflict_with() {
        ConflictAssessment result = ai.assessConflicts(company("Fintech", "SEED", null, DETAILED), List.of());

        assertThat(result.overall()).isZero();
        assertThat(result.dimensions()).hasSize(3).allMatch(d -> d.confidence() == 0 && d.matches().isEmpty());
    }

    @Test
    void holdings_in_the_same_sector_raise_the_sector_dimension_and_name_themselves() {
        ConflictAssessment result = ai.assessConflicts(company("Fintech", "SEED", null, null),
                List.of(holding("Ledgerly", "Fintech", null), holding("Shiprack", "Logistics", null)));

        ConflictAssessment.Dimension sector = dimension(result, ConflictDimensionType.SECTOR_OVERLAP);
        assertThat(sector.confidence()).isEqualTo(0.35);
        assertThat(sector.matches()).extracting(ConflictAssessment.Match::companyName).containsExactly("Ledgerly");
    }

    @Test
    void several_holdings_in_one_sector_are_a_concentration_not_a_note() {
        ConflictAssessment result = ai.assessConflicts(company("Fintech", "SEED", null, null),
                List.of(holding("A", "Fintech", null), holding("B", "Fintech", null), holding("C", "Fintech", null)));

        assertThat(dimension(result, ConflictDimensionType.SECTOR_OVERLAP).confidence()).isEqualTo(0.85);
    }

    @Test
    void two_companies_selling_to_the_same_buyers_raise_the_customer_dimension() {
        ConflictAssessment result = ai.assessConflicts(
                company("Fintech", "SEED", null, "Payments automation for mid-market finance teams."),
                List.of(holding("Ledgerly", "Fintech", "Reconciliation for mid-market finance teams."),
                        holding("Kisan", "Agritech", "A marketplace for farmers and cooperatives.")));

        ConflictAssessment.Dimension customer = dimension(result, ConflictDimensionType.CUSTOMER_OVERLAP);
        assertThat(customer.confidence()).isPositive();
        assertThat(customer.matches()).extracting(ConflictAssessment.Match::companyName).containsExactly("Ledgerly");
    }

    @Test
    void a_description_that_does_not_say_who_it_sells_to_is_reported_as_unjudgeable_not_as_clear() {
        ConflictAssessment result = ai.assessConflicts(company("Fintech", "SEED", null, "We make software."),
                List.of(holding("Ledgerly", "Fintech", "Reconciliation for finance teams.")));

        ConflictAssessment.Dimension customer = dimension(result, ConflictDimensionType.CUSTOMER_OVERLAP);
        assertThat(customer.confidence()).isZero();
        assertThat(customer.summary()).contains("can't be judged");
    }

    @Test
    void a_product_in_the_same_sector_with_the_same_language_reads_as_competing() {
        ConflictAssessment result = ai.assessConflicts(
                company("Fintech", "SEED", null, "Automated invoice reconciliation and bank statement matching."),
                List.of(holding("Ledgerly", "Fintech", "Automated invoice reconciliation and bank statement matching for finance."),
                        holding("Shiprack", "Logistics", "Freight visibility for exporters.")));

        ConflictAssessment.Dimension product = dimension(result, ConflictDimensionType.COMPETITIVE_PRODUCT);
        assertThat(product.confidence()).isGreaterThan(0.6);
        assertThat(product.matches()).extracting(ConflictAssessment.Match::companyName).containsExactly("Ledgerly");
    }

    @Test
    void the_overall_figure_leans_toward_the_worst_dimension_and_stays_in_range() {
        ConflictAssessment result = ai.assessConflicts(
                company("Fintech", "SEED", null, "Automated invoice reconciliation for finance teams."),
                List.of(holding("A", "Fintech", "Automated invoice reconciliation for finance teams."),
                        holding("B", "Fintech", null), holding("C", "Fintech", null)));

        double worst = result.dimensions().stream().mapToDouble(ConflictAssessment.Dimension::confidence).max().orElse(0);
        assertThat(result.overall()).isBetween(0.0, 1.0).isGreaterThan(worst * 0.6);
        assertThat(result.dimensions()).extracting(ConflictAssessment.Dimension::confidence).allMatch(c -> c >= 0 && c <= 1);
    }

    private static ConflictAssessment.Dimension dimension(ConflictAssessment result, ConflictDimensionType type) {
        return result.dimensions().stream().filter(d -> d.type() == type).findFirst().orElseThrow();
    }

    // --- digest -----------------------------------------------------------------------------

    private static DigestFacts facts(List<DigestFacts.Holding> holdings, List<DigestFacts.OpenRound> rounds,
                                     List<DigestFacts.SignalFact> signals, List<DigestFacts.UnrecordedPledge> pledges) {
        return new DigestFacts("Meridian Ventures", LocalDate.of(2026, 10, 8), LocalDate.of(2026, 11, 7),
                holdings, rounds, signals, pledges);
    }

    private static DigestFacts.Holding held(String company, String sector, long amount) {
        return new DigestFacts.Holding(UUID.randomUUID(), company, sector, amount, "INR");
    }

    @Test
    void a_firm_with_no_positions_is_told_so_plainly() {
        DigestDraft draft = ai.composeDigest(facts(List.of(), List.of(), List.of(), List.of()));

        assertThat(draft.summaryMarkdown()).contains("No active positions yet");
        assertThat(draft.alerts()).isEmpty();
    }

    @Test
    void the_summary_states_capital_at_work_in_the_screens_own_units() {
        DigestDraft draft = ai.composeDigest(facts(
                List.of(held("Ledgerly", "Fintech", 60_000_000L), held("Shiprack", "Logistics", 25_000_000L)),
                List.of(), List.of(), List.of()));

        assertThat(draft.summaryMarkdown()).contains("₹8.50 Cr").contains("2 positions").contains("Nothing needs your attention");
    }

    @Test
    void a_portfolio_company_raising_a_round_is_an_info_alert_linked_to_the_position() {
        DigestFacts.Holding ledgerly = held("Ledgerly", "Fintech", 60_000_000L);

        DigestDraft draft = ai.composeDigest(facts(List.of(ledgerly),
                List.of(new DigestFacts.OpenRound(ledgerly.investmentId(), "Ledgerly", "SERIES A")),
                List.of(), List.of()));

        assertThat(draft.alerts()).singleElement().satisfies(alert -> {
            assertThat(alert.severity()).isEqualTo(AlertSeverity.INFO);
            assertThat(alert.investmentId()).isEqualTo(ledgerly.investmentId());
            assertThat(alert.message()).contains("pro-rata");
        });
    }

    @Test
    void bad_news_outranks_good_and_regulatory_bad_news_is_critical() {
        UUID id = UUID.randomUUID();
        DigestDraft draft = ai.composeDigest(facts(List.of(held("Ledgerly", "Fintech", 1L)), List.of(),
                List.of(new DigestFacts.SignalFact(id, "Ledgerly", "Wins a big client", SignalType.PRODUCT, Sentiment.POSITIVE),
                        new DigestFacts.SignalFact(id, "Ledgerly", "RBI notice served", SignalType.REGULATORY, Sentiment.NEGATIVE),
                        new DigestFacts.SignalFact(id, "Ledgerly", "Two senior exits", SignalType.HIRING, Sentiment.NEGATIVE)),
                List.of()));

        assertThat(draft.alerts()).extracting(DigestDraft.Alert::severity)
                .containsExactly(AlertSeverity.CRITICAL, AlertSeverity.WARNING, AlertSeverity.INFO);
    }

    @Test
    void a_closed_round_pledge_that_was_never_recorded_is_flagged() {
        DigestDraft draft = ai.composeDigest(facts(List.of(held("Ledgerly", "Fintech", 1L)), List.of(), List.of(),
                List.of(new DigestFacts.UnrecordedPledge("Freightwise", 50_000_000L, "INR"))));

        assertThat(draft.alerts()).singleElement().satisfies(alert -> {
            assertThat(alert.severity()).isEqualTo(AlertSeverity.WARNING);
            assertThat(alert.message()).contains("₹5.00 Cr").contains("Freightwise").contains("isn't recorded");
        });
    }

    @Test
    void one_sector_dominating_a_real_portfolio_is_flagged_as_concentration() {
        DigestDraft draft = ai.composeDigest(facts(
                List.of(held("A", "Fintech", 70_000_000L), held("B", "Fintech", 70_000_000L), held("C", "Logistics", 20_000_000L)),
                List.of(), List.of(), List.of()));

        assertThat(draft.alerts()).anyMatch(a -> a.message().contains("Fintech is 88%"));
    }

    @Test
    void two_positions_are_not_called_a_concentration() {
        DigestDraft draft = ai.composeDigest(facts(
                List.of(held("A", "Fintech", 90_000_000L), held("B", "Logistics", 10_000_000L)),
                List.of(), List.of(), List.of()));

        assertThat(draft.alerts()).isEmpty();
    }

    // --- matching ---------------------------------------------------------------------------

    private static MatchCandidate candidate(String name, Set<String> sectors, Set<String> stages, boolean live) {
        return new MatchCandidate(UUID.randomUUID(), name, sectors, stages, null, null, live);
    }

    private static final MatchSubject INVESTOR = new MatchSubject(SuggestionType.STARTUP_FOR_VC,
            Set.of("Fintech", "SaaS"), Set.of("SEED", "SERIES_A"), 10_000_000L, 100_000_000L);

    @Test
    void a_startup_raising_in_the_right_sector_and_stage_is_the_best_match_for_an_investor() {
        MatchCandidate good = candidate("Good", Set.of("Fintech"), Set.of("SEED"), true);
        MatchCandidate ok = candidate("Ok", Set.of("Fintech"), Set.of("GROWTH"), false);
        MatchCandidate wrong = candidate("Wrong", Set.of("Gaming"), Set.of("GROWTH"), true);

        List<MatchSuggestion> out = ai.suggestMatches(INVESTOR, List.of(wrong, ok, good), 8);

        assertThat(out).extracting(MatchSuggestion::candidateId).containsExactly(good.id(), ok.id());
        assertThat(out.get(0).score()).isGreaterThan(out.get(1).score()).isLessThanOrEqualTo(1.0);
        assertThat(out.get(0).reasoning()).contains("Fintech").contains("Is raising right now");
    }

    @Test
    void timing_and_money_alone_are_not_a_reason_to_introduce_anyone() {
        MatchCandidate noFit = new MatchCandidate(UUID.randomUUID(), "Off", Set.of("Gaming"), Set.of("GROWTH"),
                20_000_000L, 50_000_000L, true);

        assertThat(ai.suggestMatches(INVESTOR, List.of(noFit), 8)).isEmpty();
    }

    @Test
    void a_founder_is_matched_to_investors_by_sector_stage_and_ticket_overlap() {
        MatchSubject founder = new MatchSubject(SuggestionType.VC_FOR_STARTUP,
                Set.of("Fintech"), Set.of("SEED"), 20_000_000L, 60_000_000L);
        MatchCandidate fit = new MatchCandidate(UUID.randomUUID(), "Fit", Set.of("Fintech", "SaaS"),
                Set.of("SEED", "SERIES_A"), 10_000_000L, 100_000_000L, false);
        MatchCandidate elsewhere = new MatchCandidate(UUID.randomUUID(), "Elsewhere", Set.of("Climate"),
                Set.of("GROWTH"), null, null, false);

        List<MatchSuggestion> out = ai.suggestMatches(founder, List.of(elsewhere, fit), 8);

        assertThat(out).singleElement().satisfies(match -> {
            assertThat(match.candidateId()).isEqualTo(fit.id());
            assertThat(match.score()).isEqualTo(1.0);   // every term a founder can score on, against a ceiling of 0.9
            assertThat(match.reasoning()).contains("Cheque and ticket ranges overlap");
        });
    }

    @Test
    void the_shortlist_is_capped_and_ordered_best_first() {
        List<MatchCandidate> many = java.util.stream.IntStream.range(0, 20)
                .mapToObj(i -> candidate("S" + i, Set.of("Fintech"), i % 2 == 0 ? Set.of("SEED") : Set.of("GROWTH"), i % 3 == 0))
                .toList();

        List<MatchSuggestion> out = ai.suggestMatches(INVESTOR, many, 5);

        assertThat(out).hasSize(5);
        assertThat(out).extracting(MatchSuggestion::score).isSortedAccordingTo(java.util.Comparator.reverseOrder());
    }

    @Test
    void an_open_round_and_the_headline_announcing_it_are_one_item_not_two() {
        DigestDraft draft = ai.composeDigest(facts(
                List.of(held("Ledgerly", "Fintech", 60_000_000L)),
                List.of(new DigestFacts.OpenRound(UUID.randomUUID(), "Ledgerly", "Series A")),
                List.of(new DigestFacts.SignalFact(UUID.randomUUID(), "Ledgerly", "Ledgerly opened a Series A round",
                                SignalType.FUNDING, Sentiment.POSITIVE),
                        new DigestFacts.SignalFact(UUID.randomUUID(), "Ledgerly", "Ledgerly adds Tally Prime sync",
                                SignalType.PRODUCT, Sentiment.POSITIVE)),
                List.of()));

        assertThat(draft.alerts()).extracting(DigestDraft.Alert::message)
                .containsExactlyInAnyOrder("Ledgerly is raising a Series A round — worth checking your pro-rata.",
                        "Ledgerly adds Tally Prime sync");
    }

    @Test
    void the_same_headline_arriving_twice_is_said_once() {
        DigestFacts.SignalFact first = new DigestFacts.SignalFact(UUID.randomUUID(), "Vaultline", "Vaultline hires a head of compliance",
                SignalType.HIRING, Sentiment.POSITIVE);
        DigestDraft draft = ai.composeDigest(facts(List.of(held("Vaultline", "SaaS", 10_000_000L)), List.of(),
                List.of(first, first), List.of()));

        assertThat(draft.alerts()).hasSize(1);
    }

    @Test
    void a_score_names_the_thesis_values_and_quotes_the_company_rather_than_reciting_a_template() {
        OpportunityScore score = ai.scoreOpportunity(THESIS, company("Fintech", "SEED", 50_000_000L, DETAILED));

        assertThat(score.rationale())
                .contains("Fintech is one of the sectors in your thesis (")
                .contains("Seed is a stage you invest at (")
                .contains("inside your cheque range (₹1.00 Cr to ₹10.00 Cr)")
                .contains("\"Automated reconciliation for mid-market finance teams, plugging into Tally and Zoho Books\"")
                .doesNotContain("enough to judge");
    }
}
