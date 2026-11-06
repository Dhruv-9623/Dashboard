-- Funding cycles and commitments (CLAUDE.md §3).
--
-- Delete rules are RESTRICT throughout, for the same reason investments are: a round and the
-- commitments against it are a record of what was agreed, and deleting a startup or a firm must
-- not quietly erase it.

CREATE TABLE funding_cycles (
    id              UUID PRIMARY KEY,
    startup_id      UUID         NOT NULL,
    round_type      VARCHAR(32)  NOT NULL,
    target_amount   BIGINT       NOT NULL,
    currency        VARCHAR(3)   NOT NULL,
    min_ticket_size BIGINT,
    max_ticket_size BIGINT,
    status          VARCHAR(16)  NOT NULL,
    pitch_deck_url  VARCHAR(512),
    data_room_url   VARCHAR(512),
    opened_at       TIMESTAMP    NOT NULL,
    closed_at       TIMESTAMP,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    CONSTRAINT fk_funding_cycle_startup FOREIGN KEY (startup_id) REFERENCES startups (id) ON DELETE RESTRICT,
    CONSTRAINT ck_funding_cycle_target_positive CHECK (target_amount > 0),
    -- A band that can't contain anything is a data-entry error, not a configuration.
    CONSTRAINT ck_funding_cycle_ticket_band CHECK (
        min_ticket_size IS NULL OR max_ticket_size IS NULL OR min_ticket_size <= max_ticket_size
    )
);

-- A startup raises one round at a time. Paused and closed rounds are unlimited, so the history
-- stays, but two simultaneously OPEN rounds are a mistake rather than a strategy.
CREATE UNIQUE INDEX uq_funding_cycle_one_open_per_startup
    ON funding_cycles (startup_id) WHERE status = 'OPEN';

CREATE INDEX idx_funding_cycles_startup ON funding_cycles (startup_id);
-- The VC-side deal flow query: open rounds, newest first.
CREATE INDEX idx_funding_cycles_status_opened ON funding_cycles (status, opened_at DESC);

CREATE TABLE funding_commitments (
    id               UUID PRIMARY KEY,
    funding_cycle_id UUID        NOT NULL,
    vc_firm_id       UUID        NOT NULL,
    amount           BIGINT      NOT NULL,
    currency         VARCHAR(3)  NOT NULL,
    status           VARCHAR(20) NOT NULL,
    committed_at     TIMESTAMP   NOT NULL,
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,
    CONSTRAINT fk_commitment_cycle FOREIGN KEY (funding_cycle_id) REFERENCES funding_cycles (id) ON DELETE RESTRICT,
    CONSTRAINT fk_commitment_vc_firm FOREIGN KEY (vc_firm_id) REFERENCES vc_firms (id) ON DELETE RESTRICT,
    CONSTRAINT ck_commitment_amount_positive CHECK (amount > 0),
    -- One commitment per firm per round: a second cheque from the same investor is that firm
    -- changing its number, not a new investor.
    CONSTRAINT uq_commitment_cycle_firm UNIQUE (funding_cycle_id, vc_firm_id)
);

CREATE INDEX idx_commitments_cycle ON funding_commitments (funding_cycle_id);
CREATE INDEX idx_commitments_firm ON funding_commitments (vc_firm_id);
