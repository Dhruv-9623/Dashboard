package com.VentureCapitals.Dashboard.domain.ai;

import java.util.List;

/**
 * Every judgement the product makes on its users' behalf — how well a company fits a thesis,
 * whether it collides with the portfolio, what changed this month, who to introduce to whom —
 * goes through here (CLAUDE.md: AI calls never come from a controller or a business service).
 *
 * <p>The only implementation today is {@link HeuristicAIService}: explicit, deterministic rules
 * whose reasoning is written into every result. That is a deliberate first step rather than a
 * stand-in. It needs no API key, behaves identically in every environment and every test, and
 * each answer says why — which is what the citations on a score are for. A model-backed
 * implementation can replace it behind this interface without any caller changing.
 *
 * <p>Methods take and return plain records, never JPA entities, so an implementation that calls
 * out over the network doesn't have to be handed a lazy proxy.
 */
public interface AIService {

    /** Scores one opportunity against the firm's thesis. */
    OpportunityScore scoreOpportunity(ThesisProfile thesis, CompanyProfile candidate);

    /** Checks one candidate against everything the firm already holds. */
    ConflictAssessment assessConflicts(CompanyProfile candidate, List<CompanyProfile> holdings);

    /** Writes the portfolio digest from the facts about the period. */
    DigestDraft composeDigest(DigestFacts facts);

    /** Ranks introductions for one person from a pool of candidates, best first. */
    List<MatchSuggestion> suggestMatches(MatchSubject subject, List<MatchCandidate> candidates, int limit);
}
