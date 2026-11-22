package com.VentureCapitals.Dashboard.domain.ai;

import com.VentureCapitals.Dashboard.domain.signals.Sentiment;
import com.VentureCapitals.Dashboard.domain.signals.SignalType;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Everything the digest is written from — gathered by the service, so the writer needs no database. */
public record DigestFacts(String firmName, LocalDate from, LocalDate to, List<Holding> holdings,
                          List<OpenRound> openRounds, List<SignalFact> signals, List<UnrecordedPledge> pledges) {

    public record Holding(UUID investmentId, String company, String sector, long amount, String currency) {
    }

    public record OpenRound(UUID investmentId, String company, String round) {
    }

    public record SignalFact(UUID investmentId, String company, String headline, SignalType type, Sentiment sentiment) {
    }

    public record UnrecordedPledge(String company, long amount, String currency) {
    }
}
