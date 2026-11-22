package com.VentureCapitals.Dashboard.domain.ai;

import java.util.Set;

/** What a firm invests in, stripped to the values scoring needs. Null cheque bounds mean "no limit". */
public record ThesisProfile(Set<String> sectors, Set<String> stages, Long chequeMin, Long chequeMax,
                            String currency) {
}
