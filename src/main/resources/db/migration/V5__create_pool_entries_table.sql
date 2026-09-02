CREATE TABLE pool_entries (
    id UUID PRIMARY KEY,
    vc_firm_id UUID NOT NULL,
    startup_id UUID,
    company_name VARCHAR(255),
    added_by UUID NOT NULL,
    notes TEXT,
    interest_level VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (vc_firm_id) REFERENCES vc_firms(id) ON DELETE CASCADE,
    FOREIGN KEY (startup_id) REFERENCES startups(id) ON DELETE SET NULL,
    FOREIGN KEY (added_by) REFERENCES vc_firm_members(id) ON DELETE RESTRICT,
    CHECK ((startup_id IS NOT NULL AND company_name IS NULL) OR (startup_id IS NULL AND company_name IS NOT NULL))
);

CREATE TABLE pool_entry_tags (
    pool_entry_id UUID NOT NULL,
    tag VARCHAR(255),
    FOREIGN KEY (pool_entry_id) REFERENCES pool_entries(id) ON DELETE CASCADE
);

CREATE INDEX idx_pool_entries_vc_firm_id ON pool_entries(vc_firm_id);
CREATE INDEX idx_pool_entries_startup_id ON pool_entries(startup_id);
CREATE INDEX idx_pool_entries_interest_level ON pool_entries(interest_level);
