package com.VentureCapitals.Dashboard.domain.comparison;

import com.VentureCapitals.Dashboard.domain.funding.CommitmentStatus;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitment;
import com.VentureCapitals.Dashboard.domain.funding.FundingCommitmentRepository;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycle;
import com.VentureCapitals.Dashboard.domain.funding.FundingCycleRepository;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Side-by-side comparison of startups for due diligence (CLAUDE.md §11). Stateless: nothing is
 * stored, the figures are derived from what exists.
 *
 * <p>The money columns describe the startup's <em>open</em> round and nothing older. That is a
 * choice about what an investor is entitled to see. The size of a round that is currently raising
 * is already public in deal flow; a closed round's pledges are visible only to the firms that
 * took part (Business Rule 3), and a comparison tool that summed them would hand every investor
 * every rival's history.
 */
@Service
@Transactional(readOnly = true)
public class ComparisonService {
    public static final int MAX_STARTUPS = 6;

    private final StartupRepository startups;
    private final FundingCycleRepository cycles;
    private final FundingCommitmentRepository commitments;

    public ComparisonService(StartupRepository startups, FundingCycleRepository cycles,
                             FundingCommitmentRepository commitments) {
        this.startups = startups;
        this.cycles = cycles;
        this.commitments = commitments;
    }

    /** Rows in the order the ids were given. An id that matches no startup is simply left out. */
    public List<ComparisonRow> compare(List<UUID> requested) {
        Set<UUID> ids = new LinkedHashSet<>(requested);
        Map<UUID, Startup> found = new HashMap<>();
        startups.findAllById(ids).forEach(s -> found.put(s.getId(), s));
        if (found.isEmpty()) return List.of();

        Map<UUID, FundingCycle> open = new HashMap<>();
        cycles.findOpenAmong(found.keySet()).forEach(c -> open.put(c.getStartup().getId(), c));

        Map<UUID, Long> signed = new HashMap<>();
        Map<UUID, Set<UUID>> investors = new HashMap<>();
        for (FundingCommitment pledge : commitments.findLiveOnOpenRounds(found.keySet())) {
            UUID startupId = pledge.getFundingCycle().getStartup().getId();
            investors.computeIfAbsent(startupId, k -> new HashSet<>()).add(pledge.getVcFirm().getId());
            if (pledge.getStatus() == CommitmentStatus.COMMITTED) {
                signed.merge(startupId, pledge.getAmount(), Long::sum);
            }
        }

        List<ComparisonRow> rows = new ArrayList<>();
        for (UUID id : ids) {
            Startup startup = found.get(id);
            if (startup == null) continue;
            FundingCycle round = open.get(id);
            rows.add(new ComparisonRow(startup, round != null,
                    round == null ? null : signed.getOrDefault(id, 0L),
                    round == null ? "INR" : round.getCurrency(),
                    round == null ? null : round.getRoundType().name(),
                    investors.getOrDefault(id, Set.of()).size()));
        }
        return rows;
    }
}
