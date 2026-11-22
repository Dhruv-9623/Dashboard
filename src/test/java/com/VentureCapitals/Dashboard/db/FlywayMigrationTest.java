package com.VentureCapitals.Dashboard.db;

import com.VentureCapitals.Dashboard.config.PostgresContainerTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

        assertThat(applied).containsExactly("1", "2", "3", "4", "5", "7", "8", "9", "10", "11", "12", "13", "14");
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

    // --- V11: thesis, plan, profile views ----------------------------------------------------

    @Test
    void a_firm_has_one_thesis_and_it_goes_when_the_firm_does() {
        assertThat(deleteRuleOf("fk_thesis_vc_firm")).isEqualTo("CASCADE");
        assertThat(jdbc.queryForObject("""
                select count(*) from pg_indexes
                 where tablename = 'vc_firm_theses' and indexdef like '%UNIQUE%vc_firm_id%'
                """, Integer.class)).isEqualTo(1);
    }

    @Test
    void every_firm_starts_on_the_free_plan_and_cannot_hold_an_unknown_one() {
        assertThat(jdbc.queryForObject("""
                select column_default from information_schema.columns
                 where table_name = 'vc_firms' and column_name = 'plan_tier'
                """, String.class)).contains("FREE");
        assertThat(jdbc.queryForObject("""
                select count(*) from information_schema.check_constraints where constraint_name = 'ck_vc_firm_plan_tier'
                """, Integer.class)).isEqualTo(1);
    }

    @Test
    void a_profile_view_is_one_row_per_viewer_profile_and_day() {
        // The unique key is what makes recording a view an idempotent insert.
        assertThat(jdbc.queryForObject("""
                select count(*) from pg_indexes
                 where tablename = 'profile_views' and indexname = 'uq_profile_view_per_day'
                """, Integer.class)).isEqualTo(1);
    }

    // --- V12: portfolio intelligence ---------------------------------------------------------

    @Test
    void a_firms_triage_record_outlives_nothing_it_describes_but_signals_outlive_their_subjects() {
        assertThat(deleteRuleOf("fk_opportunity_vc_firm")).isEqualTo("RESTRICT");
        assertThat(deleteRuleOf("fk_digest_firm")).isEqualTo("RESTRICT");
        // Public news about a company stays after the company is gone.
        assertThat(deleteRuleOf("fk_signal_startup")).isEqualTo("SET NULL");
        assertThat(deleteRuleOf("fk_signal_vc_firm")).isEqualTo("SET NULL");
    }

    @Test
    void there_is_one_current_conflict_report_per_opportunity() {
        assertThat(jdbc.queryForObject("""
                select count(*) from pg_indexes
                 where tablename = 'conflict_reports' and indexdef like '%UNIQUE%opportunity_id%'
                """, Integer.class)).isEqualTo(1);
    }

    @Test
    @org.springframework.transaction.annotation.Transactional
    void the_database_refuses_a_fit_score_outside_zero_to_one_hundred() {
        UUID firm = insertFirm();
        assertThatThrownBy(() -> jdbc.update("""
                insert into opportunities (id, vc_firm_id, company_name, sector, stage, currency, status, fit_score)
                values (?, ?, 'X', 'Fintech', 'SEED', 'INR', 'PENDING_REVIEW', 140)
                """, UUID.randomUUID(), firm))
                .hasMessageContaining("ck_opportunity_score_range");
    }

    // --- V13: messaging and the rest of the network ------------------------------------------

    @Test
    void a_conversation_can_only_exist_as_the_child_of_a_request_and_only_once() {
        // Business Rule 1 as structure: the request id is mandatory and unique, so a chat without
        // a request — or two chats for one — cannot be represented.
        assertThat(jdbc.queryForObject("""
                select is_nullable from information_schema.columns
                 where table_name = 'conversations' and column_name = 'connection_request_id'
                """, String.class)).isEqualTo("NO");
        assertThat(jdbc.queryForObject("""
                select count(*) from pg_indexes
                 where tablename = 'conversations' and indexdef like '%UNIQUE%connection_request_id%'
                """, Integer.class)).isEqualTo(1);
        assertThat(deleteRuleOf("fk_conversation_request")).isEqualTo("RESTRICT");
    }

    @Test
    @org.springframework.transaction.annotation.Transactional
    void a_request_cannot_be_sent_to_yourself() {
        UUID a = insertUser("a");

        assertThatThrownBy(() -> jdbc.update("""
                insert into connection_requests (id, from_user_id, to_user_id, status, requested_at)
                values (?, ?, ?, 'PENDING', now())
                """, UUID.randomUUID(), a, a)).hasMessageContaining("ck_connection_not_self");
    }

    // One rejected statement per test: Postgres aborts the whole transaction after the first.
    @Test
    @org.springframework.transaction.annotation.Transactional
    void an_answered_request_must_say_when_it_was_answered() {
        UUID a = insertUser("e");
        UUID b = insertUser("f");

        assertThatThrownBy(() -> jdbc.update("""
                insert into connection_requests (id, from_user_id, to_user_id, status, requested_at)
                values (?, ?, ?, 'ACCEPTED', now())
                """, UUID.randomUUID(), a, b)).hasMessageContaining("ck_connection_responded");
    }

    @Test
    @org.springframework.transaction.annotation.Transactional
    void a_live_request_blocks_a_duplicate_but_a_declined_one_does_not() {
        UUID a = insertUser("c");
        UUID b = insertUser("d");
        jdbc.update("""
                insert into connection_requests (id, from_user_id, to_user_id, status, requested_at, responded_at)
                values (?, ?, ?, 'REJECTED', now(), now())
                """, UUID.randomUUID(), a, b);

        // Turned down once: allowed to ask again.
        jdbc.update("""
                insert into connection_requests (id, from_user_id, to_user_id, status, requested_at)
                values (?, ?, ?, 'PENDING', now())
                """, UUID.randomUUID(), a, b);

        // But not twice while one is waiting.
        assertThatThrownBy(() -> jdbc.update("""
                insert into connection_requests (id, from_user_id, to_user_id, status, requested_at)
                values (?, ?, ?, 'PENDING', now())
                """, UUID.randomUUID(), a, b)).hasMessageContaining("uq_connection_live_pair");
    }

    @Test
    void wishlists_and_suggestions_go_with_their_owner_but_messages_do_not() {
        assertThat(deleteRuleOf("fk_wishlist_owner")).isEqualTo("CASCADE");
        assertThat(deleteRuleOf("fk_suggestion_user")).isEqualTo("CASCADE");
        assertThat(deleteRuleOf("fk_message_sender")).isEqualTo("RESTRICT");
        assertThat(deleteRuleOf("fk_connection_from")).isEqualTo("RESTRICT");
    }

    @Test
    void a_person_saves_a_profile_once_and_replies_to_an_event_once() {
        assertThat(jdbc.queryForObject("""
                select count(*) from pg_indexes
                 where tablename = 'wishlist_items' and indexdef like '%UNIQUE%owner_user_id, target_type, target_id%'
                """, Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("""
                select count(*) from pg_indexes
                 where tablename = 'event_attendees' and indexdef like '%UNIQUE%event_id, user_id%'
                """, Integer.class)).isEqualTo(1);
    }

    @Test
    @org.springframework.transaction.annotation.Transactional
    void an_event_cannot_end_before_it_starts() {
        UUID host = insertUser("h");
        assertThatThrownBy(() -> jdbc.update("""
                insert into events (id, host_user_id, title, event_type, start_time, end_time, is_public)
                values (?, ?, 'T', 'WEBINAR', '2026-12-01 10:00', '2026-12-01 09:00', true)
                """, UUID.randomUUID(), host)).hasMessageContaining("ck_event_times");
    }

    // --- helpers for the behaviour tests above -------------------------------------------------

    private UUID insertUser(String tag) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into users (id, email, user_type, is_active, created_at, updated_at)
                values (?, ?, 'VC', true, now(), now())
                """, id, tag + "-" + id + "@migration.test");
        return id;
    }

    private UUID insertFirm() {
        UUID id = UUID.randomUUID();
        jdbc.update("insert into vc_firms (id, name, created_at, updated_at) values (?, 'Test Fund', now(), now())", id);
        return id;
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

    // --- V14: one digest per firm per day ----------------------------------------------------

    @Test
    @org.springframework.transaction.annotation.Transactional
    void a_firm_cannot_have_two_digests_for_the_same_day() {
        UUID firm = insertFirm();
        String insert = """
                insert into digests (id, vc_firm_id, period_start, period_end, summary_markdown, company_count, created_at)
                values (?, ?, date '2026-10-08', date '2026-11-07', 's', 0, now())
                """;
        jdbc.update(insert, UUID.randomUUID(), firm);

        assertThatThrownBy(() -> jdbc.update(insert, UUID.randomUUID(), firm))
                .hasMessageContaining("uq_digests_firm_day");
    }
}
