-- Firm settings that had screens but no storage: the investment thesis and the plan tier.
-- Also the one piece of engagement data nothing recorded: who looked at whose profile.

-- Every firm starts on the free plan. NOT NULL with a default so existing rows are valid at once;
-- the CHECK keeps a typo from turning into a tier no screen knows how to draw.
ALTER TABLE vc_firms ADD COLUMN plan_tier VARCHAR(16) NOT NULL DEFAULT 'FREE';
ALTER TABLE vc_firms ADD CONSTRAINT ck_vc_firm_plan_tier CHECK (plan_tier IN ('FREE', 'STARTER', 'GROWTH'));

-- What Deal Triage scores incoming opportunities against. One per firm; replaced, not versioned.
CREATE TABLE vc_firm_theses (
    id              UUID PRIMARY KEY,
    vc_firm_id      UUID         NOT NULL,
    currency        VARCHAR(3)   NOT NULL DEFAULT 'INR',
    cheque_size_min BIGINT,
    cheque_size_max BIGINT,
    notes           TEXT,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    CONSTRAINT fk_thesis_vc_firm FOREIGN KEY (vc_firm_id) REFERENCES vc_firms (id) ON DELETE CASCADE,
    CONSTRAINT uq_thesis_per_firm UNIQUE (vc_firm_id),
    CONSTRAINT ck_thesis_cheque_band CHECK (
        cheque_size_min IS NULL OR cheque_size_max IS NULL OR cheque_size_min <= cheque_size_max
    ),
    CONSTRAINT ck_thesis_cheque_positive CHECK (
        (cheque_size_min IS NULL OR cheque_size_min >= 0) AND (cheque_size_max IS NULL OR cheque_size_max >= 0)
    )
);

CREATE TABLE vc_firm_thesis_sectors (
    thesis_id UUID         NOT NULL,
    sector    VARCHAR(255) NOT NULL,
    CONSTRAINT fk_thesis_sector_thesis FOREIGN KEY (thesis_id) REFERENCES vc_firm_theses (id) ON DELETE CASCADE
);
CREATE INDEX idx_thesis_sectors_thesis ON vc_firm_thesis_sectors (thesis_id);

CREATE TABLE vc_firm_thesis_stages (
    thesis_id UUID        NOT NULL,
    stage     VARCHAR(32) NOT NULL,
    CONSTRAINT fk_thesis_stage_thesis FOREIGN KEY (thesis_id) REFERENCES vc_firm_theses (id) ON DELETE CASCADE
);
CREATE INDEX idx_thesis_stages_thesis ON vc_firm_thesis_stages (thesis_id);

-- One row per viewer, profile and day. The Insights page asks "how many people looked", and a
-- founder refreshing a page ten times is one person, not ten. The unique key does the de-duping,
-- so recording a view is a plain insert that quietly does nothing the second time.
CREATE TABLE profile_views (
    id             UUID PRIMARY KEY,
    viewer_user_id UUID        NOT NULL,
    target_type    VARCHAR(16) NOT NULL,
    target_id      UUID        NOT NULL,
    viewed_on      DATE        NOT NULL,
    created_at     TIMESTAMP,
    updated_at     TIMESTAMP,
    CONSTRAINT fk_profile_view_viewer FOREIGN KEY (viewer_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_profile_view_target CHECK (target_type IN ('VC_FIRM', 'STARTUP')),
    CONSTRAINT uq_profile_view_per_day UNIQUE (viewer_user_id, target_type, target_id, viewed_on)
);
CREATE INDEX idx_profile_views_target ON profile_views (target_type, target_id);
