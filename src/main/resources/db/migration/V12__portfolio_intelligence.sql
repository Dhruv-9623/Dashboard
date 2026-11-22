-- Deal triage, conflict checks, portfolio digests and signals (CLAUDE.md §7, §10).
--
-- Opportunities, reports and digests belong to a firm and are a record of what it considered, so
-- they use RESTRICT like investments and funding rounds do. Signals are public news and outlive
-- the companies they mention, so those links are SET NULL.

CREATE TABLE opportunities (
    id                 UUID PRIMARY KEY,
    vc_firm_id         UUID         NOT NULL,
    created_by         UUID,
    company_name       VARCHAR(255) NOT NULL,
    website            VARCHAR(512),
    sector             VARCHAR(255) NOT NULL,
    stage              VARCHAR(32)  NOT NULL,
    ask_amount         BIGINT,
    currency           VARCHAR(3)   NOT NULL,
    description        TEXT,
    contact_email      VARCHAR(255),
    fit_score          INTEGER,
    rationale          TEXT,
    recommended_action VARCHAR(24),
    status             VARCHAR(24)  NOT NULL,
    decision_note      TEXT,
    scored_at          TIMESTAMP,
    created_at         TIMESTAMP,
    updated_at         TIMESTAMP,
    CONSTRAINT fk_opportunity_vc_firm FOREIGN KEY (vc_firm_id) REFERENCES vc_firms (id) ON DELETE RESTRICT,
    CONSTRAINT fk_opportunity_created_by FOREIGN KEY (created_by) REFERENCES vc_firm_members (id) ON DELETE SET NULL,
    CONSTRAINT ck_opportunity_score_range CHECK (fit_score IS NULL OR (fit_score >= 0 AND fit_score <= 100)),
    CONSTRAINT ck_opportunity_ask_positive CHECK (ask_amount IS NULL OR ask_amount > 0)
);
CREATE INDEX idx_opportunities_firm_status ON opportunities (vc_firm_id, status, created_at DESC);

-- The claims behind a score, in the order they were made.
CREATE TABLE opportunity_citations (
    opportunity_id UUID         NOT NULL,
    position       INTEGER      NOT NULL,
    claim          VARCHAR(600) NOT NULL,
    thesis_field   VARCHAR(64)  NOT NULL,
    supporting     BOOLEAN      NOT NULL,
    PRIMARY KEY (opportunity_id, position),
    CONSTRAINT fk_citation_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE
);

-- One current report per opportunity; running the check again replaces it.
CREATE TABLE conflict_reports (
    id                     UUID PRIMARY KEY,
    opportunity_id         UUID          NOT NULL,
    vc_firm_id             UUID          NOT NULL,
    overall_confidence     NUMERIC(4, 3) NOT NULL,
    compared_company_count INTEGER       NOT NULL,
    generated_at           TIMESTAMP     NOT NULL,
    created_at             TIMESTAMP,
    updated_at             TIMESTAMP,
    CONSTRAINT fk_conflict_report_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE,
    CONSTRAINT fk_conflict_report_firm FOREIGN KEY (vc_firm_id) REFERENCES vc_firms (id) ON DELETE RESTRICT,
    CONSTRAINT uq_conflict_report_per_opportunity UNIQUE (opportunity_id),
    CONSTRAINT ck_conflict_report_confidence CHECK (overall_confidence >= 0 AND overall_confidence <= 1)
);
CREATE INDEX idx_conflict_reports_firm ON conflict_reports (vc_firm_id, generated_at DESC);

CREATE TABLE conflict_dimensions (
    id         UUID PRIMARY KEY,
    report_id  UUID          NOT NULL,
    position   INTEGER       NOT NULL,
    dimension  VARCHAR(32)   NOT NULL,
    confidence NUMERIC(4, 3) NOT NULL,
    summary    TEXT          NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_conflict_dimension_report FOREIGN KEY (report_id) REFERENCES conflict_reports (id) ON DELETE CASCADE,
    CONSTRAINT ck_conflict_dimension_confidence CHECK (confidence >= 0 AND confidence <= 1)
);
CREATE INDEX idx_conflict_dimensions_report ON conflict_dimensions (report_id);

CREATE TABLE conflict_matches (
    dimension_id           UUID         NOT NULL,
    position               INTEGER      NOT NULL,
    portfolio_company_id   UUID         NOT NULL,
    portfolio_company_name VARCHAR(255) NOT NULL,
    note                   VARCHAR(600) NOT NULL,
    PRIMARY KEY (dimension_id, position),
    CONSTRAINT fk_conflict_match_dimension FOREIGN KEY (dimension_id) REFERENCES conflict_dimensions (id) ON DELETE CASCADE
);

CREATE TABLE digests (
    id               UUID PRIMARY KEY,
    vc_firm_id       UUID      NOT NULL,
    period_start     DATE      NOT NULL,
    period_end       DATE      NOT NULL,
    summary_markdown TEXT      NOT NULL,
    company_count    INTEGER   NOT NULL,
    sent_at          TIMESTAMP,
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,
    CONSTRAINT fk_digest_firm FOREIGN KEY (vc_firm_id) REFERENCES vc_firms (id) ON DELETE RESTRICT,
    CONSTRAINT ck_digest_period CHECK (period_end >= period_start)
);
CREATE INDEX idx_digests_firm ON digests (vc_firm_id, created_at DESC);

CREATE TABLE digest_alerts (
    digest_id     UUID         NOT NULL,
    position      INTEGER      NOT NULL,
    investment_id UUID,
    startup_name  VARCHAR(255),
    severity      VARCHAR(16)  NOT NULL,
    message       VARCHAR(600) NOT NULL,
    PRIMARY KEY (digest_id, position),
    CONSTRAINT fk_digest_alert_digest FOREIGN KEY (digest_id) REFERENCES digests (id) ON DELETE CASCADE
);

CREATE TABLE signals (
    id                 UUID PRIMARY KEY,
    related_startup_id UUID,
    related_vc_firm_id UUID,
    source_url         VARCHAR(512),
    headline           VARCHAR(300) NOT NULL,
    summary            TEXT,
    signal_type        VARCHAR(16)  NOT NULL,
    sentiment          VARCHAR(16)  NOT NULL,
    published_at       TIMESTAMP    NOT NULL,
    ai_generated       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMP,
    updated_at         TIMESTAMP,
    CONSTRAINT fk_signal_startup FOREIGN KEY (related_startup_id) REFERENCES startups (id) ON DELETE SET NULL,
    CONSTRAINT fk_signal_vc_firm FOREIGN KEY (related_vc_firm_id) REFERENCES vc_firms (id) ON DELETE SET NULL
);
CREATE INDEX idx_signals_published ON signals (published_at DESC);
CREATE INDEX idx_signals_startup ON signals (related_startup_id);
