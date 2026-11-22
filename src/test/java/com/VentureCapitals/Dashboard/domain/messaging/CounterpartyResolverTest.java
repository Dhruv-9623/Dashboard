package com.VentureCapitals.Dashboard.domain.messaging;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CounterpartyResolverTest {

    @Test
    void a_person_is_called_by_the_name_in_their_address() {
        assertThat(CounterpartyResolver.personName("priya.shah@lumen.health", "Lumen Labs")).isEqualTo("Priya Shah");
    }

    @Test
    void an_address_that_is_only_a_role_falls_back_to_the_organisation() {
        // "Founder" and "Owner" tell a reader nothing; the organisation is what they recognise.
        assertThat(CounterpartyResolver.personName("founder@demo.dashboard.test", "Ledgerly")).isEqualTo("Ledgerly");
        assertThat(CounterpartyResolver.personName("Owner@demo.dashboard.test", "Meridian Ventures")).isEqualTo("Meridian Ventures");
        assertThat(CounterpartyResolver.personName("cofounder@demo.dashboard.test", "Ledgerly")).isEqualTo("Ledgerly");
    }

    @Test
    void a_role_address_with_no_organisation_still_gets_a_readable_name() {
        assertThat(CounterpartyResolver.personName("founder@demo.dashboard.test", null)).isEqualTo("Founder");
    }
}
