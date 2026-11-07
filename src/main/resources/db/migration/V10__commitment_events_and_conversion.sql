-- Round history, and the link from a pledge to the investment it became.
--
-- Two things that the ninth pass left out, and which turned out to be the same gap: nothing
-- recorded *when* a round's money arrived, so neither the founder's momentum chart nor the
-- question "did this pledge ever actually land?" could be answered from the data.

-- Every move a commitment has ever made. Append-only: rows are inserted and never updated or
-- deleted, which is what makes them trustworthy as history. Nothing in the application issues an
-- UPDATE against this table.
--
-- `from_status` / `from_amount` are NULL on the first row for a commitment, which is how a
-- creation is distinguished from a change without a separate event-type column: the pair of
-- before/after values already says what happened.
CREATE TABLE commitment_events (
    id               UUID PRIMARY KEY,
    commitment_id    UUID        NOT NULL,
    -- Denormalised from the commitment so a round's whole history is one indexed read, and so the
    -- founder's chart doesn't join through a table whose rows are per-firm.
    funding_cycle_id UUID        NOT NULL,
    vc_firm_id       UUID        NOT NULL,
    -- Who made the move. Null means no user did: seeded or imported data, and any transition the
    -- system makes on its own later. Every event written by a request carries its actor.
    actor_user_id    UUID,
    from_status      VARCHAR(20),
    to_status        VARCHAR(20) NOT NULL,
    from_amount      BIGINT,
    to_amount        BIGINT      NOT NULL,
    currency         VARCHAR(3)  NOT NULL,
    occurred_at      TIMESTAMP   NOT NULL,
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,
    CONSTRAINT fk_commitment_event_commitment FOREIGN KEY (commitment_id)
        REFERENCES funding_commitments (id) ON DELETE RESTRICT,
    CONSTRAINT fk_commitment_event_cycle FOREIGN KEY (funding_cycle_id)
        REFERENCES funding_cycles (id) ON DELETE RESTRICT,
    CONSTRAINT fk_commitment_event_firm FOREIGN KEY (vc_firm_id)
        REFERENCES vc_firms (id) ON DELETE RESTRICT,
    CONSTRAINT fk_commitment_event_actor FOREIGN KEY (actor_user_id)
        REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT ck_commitment_event_to_amount_positive CHECK (to_amount > 0),
    CONSTRAINT ck_commitment_event_from_amount_positive CHECK (from_amount IS NULL OR from_amount > 0),
    -- A creation has neither a previous status nor a previous amount; a change has both. Either
    -- side half-filled would mean the row can't be read.
    CONSTRAINT ck_commitment_event_from_pair CHECK (
        (from_status IS NULL AND from_amount IS NULL)
        OR (from_status IS NOT NULL AND from_amount IS NOT NULL)
    )
);

-- The founder's momentum chart: one round's events in time order.
CREATE INDEX idx_commitment_events_cycle_time ON commitment_events (funding_cycle_id, occurred_at);
-- A single pledge's trail, shown on the round detail page.
CREATE INDEX idx_commitment_events_commitment ON commitment_events (commitment_id, occurred_at);
-- An investor looking at its own activity on someone else's round.
CREATE INDEX idx_commitment_events_firm ON commitment_events (vc_firm_id, occurred_at DESC);

-- The pledge that became an investment.
--
-- A nullable link rather than a CONVERTED status, because a converted pledge is still committed
-- money and must keep counting toward the round's committed band — flipping its status would make
-- a fully funded round read as empty the moment its investors recorded what they had paid.
--
-- ON DELETE SET NULL: deleting the investment record releases the pledge, so it can be converted
-- again. The conversion's timestamp is not duplicated here — it is the investment's own
-- created_at, and keeping one copy means the two can't disagree.
ALTER TABLE funding_commitments
    ADD COLUMN converted_investment_id UUID;

ALTER TABLE funding_commitments
    ADD CONSTRAINT fk_commitment_converted_investment FOREIGN KEY (converted_investment_id)
        REFERENCES investments (id) ON DELETE SET NULL;

-- One investment belongs to at most one pledge. Without this, two firms' pledges could both claim
-- the same portfolio row and each would report it as theirs.
CREATE UNIQUE INDEX uq_commitment_converted_investment
    ON funding_commitments (converted_investment_id) WHERE converted_investment_id IS NOT NULL;
