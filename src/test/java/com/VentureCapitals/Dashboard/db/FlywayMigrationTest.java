package com.VentureCapitals.Dashboard.db;

import com.VentureCapitals.Dashboard.config.PostgresContainerTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs every Flyway migration against real PostgreSQL and then has Hibernate validate the result
 * against the entity mappings.
 *
 * <p>This is the only test that exercises the migrations at all: the rest of the suite runs on H2
 * with {@code ddl-auto=create-drop}, so a migration could be wrong, missing or contradict an
 * entity and every other test would still pass. {@code ddl-auto=validate} here is the assertion —
 * the context fails to start if a column, type or table named by an entity isn't in the migrated
 * schema.
 *
 * <p>The explicit checks below cover the parts of V7 that Hibernate can't see: foreign-key delete
 * rules and partial unique indexes.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.flyway.clean-disabled=false",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect",
})
class FlywayMigrationTest extends PostgresContainerTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void every_migration_applies_and_the_schema_matches_the_entity_mappings() {
        // Reaching this point means Flyway migrated and Hibernate's validate pass succeeded.
        List<String> applied = jdbc.queryForList(
                "select version from flyway_schema_history where success order by installed_rank", String.class);

        assertThat(applied).containsExactly("1", "2", "3", "4", "5", "7", "8", "9", "10");
    }

    @Test
    void removing_a_member_keeps_the_pool_entries_they_added() {
        // V7: added_by is nullable ON DELETE SET NULL. Before that, RESTRICT made a member who had
        // ever added a pool entry impossible to remove.
        assertThat(deleteRuleOf("fk_pool_entry_added_by")).isEqualTo("SET NULL");
        assertThat(jdbc.queryForObject("""
                select is_nullable from information_schema.columns
                 where table_name = 'pool_entries' and column_name = 'added_by'
                """, String.class)).isEqualTo("YES");
    }

    @Test
    void deleting_a_startup_cannot_silently_erase_investment_history() {
        // V7: RESTRICT, not CASCADE. A VC's record of what it paid must outlive the startup profile.
        assertThat(deleteRuleOf("fk_investment_startup")).isEqualTo("RESTRICT");
    }

    @Test
    void a_firm_tracks_each_on_platform_startup_at_most_once() {
        // Partial unique index: off-platform entries (startup_id null) are exempt.
        String definition = jdbc.queryForObject("""
                select indexdef from pg_indexes
                 where tablename = 'pool_entries' and indexname = 'uq_pool_entry_firm_startup'
                """, String.class);

        assertThat(definition)
                .contains("UNIQUE")
                .contains("vc_firm_id")
                .contains("startup_id")
                .contains("WHERE (startup_id IS NOT NULL)");
    }

    @Test
    void one_user_belongs_to_one_startup() {
        assertThat(jdbc.queryForObject("""
                select count(*) from pg_indexes
                 where tablename = 'startup_members' and indexdef like '%UNIQUE%user_id%'
                """, Integer.class)).isEqualTo(1);
    }

    @Test
    void indexes_duplicated_by_a_unique_constraint_are_gone() {
        assertThat(indexNames("users")).doesNotContain("idx_users_email", "idx_users_oauth_provider_id");
        assertThat(indexNames("vc_firm_members")).doesNotContain("idx_vc_firm_members_user_id");
    }

    @Test
    void the_filtered_list_queries_have_an_index_to_use() {
        assertThat(indexNames("investments")).contains("idx_investments_firm_status");
        assertThat(indexNames("pool_entries")).contains("idx_pool_entries_firm_interest");
        assertThat(indexNames("pool_entry_tags")).contains("idx_pool_entry_tags_entry_id");
        assertThat(indexNames("vc_firm_sectors")).contains("idx_vc_firm_sectors_firm_id");
    }

    @Test
    void a_startup_raises_one_round_at_a_time() {
        // Partial unique index: closed and paused rounds are unlimited, so the history stays.
        String definition = jdbc.queryForObject("""
                select indexdef from pg_indexes
                 where tablename = 'funding_cycles' and indexname = 'uq_funding_cycle_one_open_per_startup'
                """, String.class);

        assertThat(definition)
                .contains("UNIQUE")
                .contains("startup_id")
                .contains("WHERE ((status)::text = 'OPEN'::text)");
    }

    @Test
    void one_firm_pledges_once_per_round() {
        assertThat(jdbc.queryForObject("""
                select count(*) from pg_indexes
                 where tablename = 'funding_commitments' and indexdef like '%UNIQUE%funding_cycle_id, vc_firm_id%'
                """, Integer.class)).isEqualTo(1);
    }

    @Test
    void a_round_and_its_commitments_outlive_the_companies_on_either_side() {
        // RESTRICT, like investments: deleting a startup or a firm must not quietly erase the
        // record of what was agreed.
        assertThat(deleteRuleOf("fk_funding_cycle_startup")).isEqualTo("RESTRICT");
        assertThat(deleteRuleOf("fk_commitment_cycle")).isEqualTo("RESTRICT");
        assertThat(deleteRuleOf("fk_commitment_vc_firm")).isEqualTo("RESTRICT");
    }

    @Test
    void the_database_refuses_a_ticket_band_that_cannot_contain_anything() {
        assertThat(jdbc.queryForObject("""
                select count(*) from information_schema.table_constraints
                 where table_name = 'funding_cycles'
                   and constraint_name in ('ck_funding_cycle_ticket_band', 'ck_funding_cycle_target_positive')
                """, Integer.class)).isEqualTo(2);
    }

    @Test
    void the_deal_flow_query_has_an_index_to_use() {
        assertThat(indexNames("funding_cycles")).contains("idx_funding_cycles_status_opened");
        assertThat(indexNames("funding_commitments")).contains("idx_commitments_cycle", "idx_commitments_firm");
    }

    // --- V10: round history and conversion ----------------------------------------------------

    @Test
    void a_rounds_history_outlives_nothing_it_describes() {
        // RESTRICT on every side. An event log that can be deleted out from under itself is not a
        // record of anything — and the founder's momentum chart is read straight off these rows.
        assertThat(deleteRuleOf("fk_commitment_event_commitment")).isEqualTo("RESTRICT");
        assertThat(deleteRuleOf("fk_commitment_event_cycle")).isEqualTo("RESTRICT");
        assertThat(deleteRuleOf("fk_commitment_event_firm")).isEqualTo("RESTRICT");
        assertThat(deleteRuleOf("fk_commitment_event_actor")).isEqualTo("RESTRICT");
    }

    @Test
    void an_event_cannot_record_half_a_change() {
        // from_status and from_amount are null together (a creation) or set together (a change).
        // Either one on its own would leave a row that can't be read back.
        String definition = jdbc.queryForObject("""
                select pg_get_constraintdef(oid) from pg_constraint
                 where conname = 'ck_commitment_event_from_pair'
                """, String.class);

        assertThat(definition).contains("from_status IS NULL").contains("from_amount IS NULL");
    }

    @Test
    void the_momentum_chart_query_has_an_index_to_use() {
        assertThat(indexNames("commitment_events"))
                .contains("idx_commitment_events_cycle_time",
                        "idx_commitment_events_commitment",
                        "idx_commitment_events_firm");
    }

    @Test
    void deleting_an_investment_releases_the_pledge_it_came_from() {
        // SET NULL rather than RESTRICT: a firm that deletes a portfolio row should be able to
        // record the cheque again, not be blocked by a pledge pointing at the row it just removed.
        assertThat(deleteRuleOf("fk_commitment_converted_investment")).isEqualTo("SET NULL");
    }

    @Test
    void one_investment_belongs_to_at_most_one_pledge() {
        // Partial unique index: unconverted pledges all hold NULL and are exempt, so this
        // constrains only the ones that have actually claimed a portfolio row.
        String definition = jdbc.queryForObject("""
                select indexdef from pg_indexes
                 where tablename = 'funding_commitments'
                   and indexname = 'uq_commitment_converted_investment'
                """, String.class);

        assertThat(definition)
                .contains("UNIQUE")
                .contains("converted_investment_id")
                .contains("WHERE (converted_investment_id IS NOT NULL)");
    }

    private String deleteRuleOf(String constraintName) {
        return jdbc.queryForObject("""
                select rc.delete_rule
                  from information_schema.referential_constraints rc
                 where rc.constraint_name = ?
                """, String.class, constraintName);
    }

    private List<String> indexNames(String table) {
        return jdbc.queryForList("select indexname from pg_indexes where tablename = ?", String.class, table);
    }
}
