-- Startup profile fields from CLAUDE.md. Sector and stage are required by the API on create and
-- update, but nullable here so pre-existing rows (name only) remain valid.
ALTER TABLE startups ADD COLUMN description TEXT;
ALTER TABLE startups ADD COLUMN website VARCHAR(255);
ALTER TABLE startups ADD COLUMN logo_url VARCHAR(512);
ALTER TABLE startups ADD COLUMN sector VARCHAR(100);
ALTER TABLE startups ADD COLUMN stage VARCHAR(50);
ALTER TABLE startups ADD COLUMN location VARCHAR(255);
ALTER TABLE startups ADD COLUMN founded_year INTEGER;
ALTER TABLE startups ADD COLUMN annual_revenue BIGINT;
ALTER TABLE startups ADD COLUMN team_size INTEGER;
ALTER TABLE startups ADD COLUMN pitch_deck_url VARCHAR(512);

CREATE INDEX idx_startups_sector ON startups (sector);
CREATE INDEX idx_startups_stage ON startups (stage);

-- Founders and co-founders. A user belongs to at most one startup (CLAUDE.md auth rules).
CREATE TABLE startup_members (
    id         UUID PRIMARY KEY,
    user_id    UUID        NOT NULL UNIQUE,
    startup_id UUID        NOT NULL,
    role       VARCHAR(50) NOT NULL,
    joined_at  TIMESTAMP   NOT NULL,
    created_at TIMESTAMP   NOT NULL,
    updated_at TIMESTAMP   NOT NULL,
    CONSTRAINT fk_startup_member_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_startup_member_startup FOREIGN KEY (startup_id) REFERENCES startups (id) ON DELETE CASCADE
);

CREATE INDEX idx_startup_members_startup_id ON startup_members (startup_id);
