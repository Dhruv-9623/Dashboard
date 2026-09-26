-- Schema fixes from the backend review (REMAINING_WORK.md R-7).
-- Timestamp columns stay TIMESTAMP for now: converting to TIMESTAMPTZ needs a decision on how
-- existing values were written, so it is tracked separately.

-- A member who leaves a firm should not block their removal or delete the pool entries they
-- added: keep the entries and drop the attribution.
ALTER TABLE pool_entries ALTER COLUMN added_by DROP NOT NULL;
ALTER TABLE pool_entries DROP CONSTRAINT pool_entries_added_by_fkey;
ALTER TABLE pool_entries
    ADD CONSTRAINT fk_pool_entry_added_by FOREIGN KEY (added_by)
        REFERENCES vc_firm_members (id) ON DELETE SET NULL;

-- Investment records are financial history: deleting a startup must not silently delete them.
ALTER TABLE investments DROP CONSTRAINT investments_startup_id_fkey;
ALTER TABLE investments
    ADD CONSTRAINT fk_investment_startup FOREIGN KEY (startup_id)
        REFERENCES startups (id) ON DELETE RESTRICT;

-- Sector and stage for companies tracked in the pool that are not on the platform yet.
-- (On-platform entries read these from the startup itself.)
ALTER TABLE pool_entries ADD COLUMN company_sector VARCHAR(100);
ALTER TABLE pool_entries ADD COLUMN company_stage VARCHAR(50);

-- A firm tracks each on-platform startup at most once.
CREATE UNIQUE INDEX uq_pool_entry_firm_startup
    ON pool_entries (vc_firm_id, startup_id) WHERE startup_id IS NOT NULL;

-- Redundant: the UNIQUE constraints on these columns already create an index.
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_oauth_provider_id;
DROP INDEX IF EXISTS idx_vc_firm_members_user_id;

-- Missing: element-collection foreign keys and the filtered list queries.
CREATE INDEX idx_vc_firm_sectors_firm_id ON vc_firm_sectors (vc_firm_id);
CREATE INDEX idx_pool_entry_tags_entry_id ON pool_entry_tags (pool_entry_id);
CREATE INDEX idx_investments_firm_status ON investments (vc_firm_id, status);
CREATE INDEX idx_pool_entries_firm_interest ON pool_entries (vc_firm_id, interest_level);
