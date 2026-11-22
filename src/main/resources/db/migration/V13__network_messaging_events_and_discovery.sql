-- The network side: mutual-consent messaging, wishlists, outreach, events and AI suggestions
-- (CLAUDE.md §4–§6, §8, §9).

-- --- Mutual-consent messaging (Business Rule 1) ----------------------------------------------

CREATE TABLE connection_requests (
    id            UUID PRIMARY KEY,
    from_user_id  UUID         NOT NULL,
    to_user_id    UUID         NOT NULL,
    status        VARCHAR(16)  NOT NULL,
    message       VARCHAR(1000),
    requested_at  TIMESTAMP    NOT NULL,
    responded_at  TIMESTAMP,
    created_at    TIMESTAMP,
    updated_at    TIMESTAMP,
    CONSTRAINT fk_connection_from FOREIGN KEY (from_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_connection_to FOREIGN KEY (to_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT ck_connection_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    CONSTRAINT ck_connection_not_self CHECK (from_user_id <> to_user_id),
    -- A response has a time, and only a response does.
    CONSTRAINT ck_connection_responded CHECK ((status = 'PENDING') = (responded_at IS NULL))
);

-- One live request per direction between two people. A declined one doesn't count, so a founder
-- who was turned down can ask again later; a pending or accepted one blocks a duplicate.
CREATE UNIQUE INDEX uq_connection_live_pair
    ON connection_requests (from_user_id, to_user_id) WHERE status IN ('PENDING', 'ACCEPTED');
CREATE INDEX idx_connection_to ON connection_requests (to_user_id, requested_at DESC);
CREATE INDEX idx_connection_from ON connection_requests (from_user_id, requested_at DESC);

-- A conversation exists because a request was accepted, and for no other reason. The mandatory,
-- unique foreign key makes "chat without consent" unrepresentable rather than merely checked.
CREATE TABLE conversations (
    id                    UUID PRIMARY KEY,
    connection_request_id UUID NOT NULL,
    created_at            TIMESTAMP,
    updated_at            TIMESTAMP,
    CONSTRAINT fk_conversation_request FOREIGN KEY (connection_request_id)
        REFERENCES connection_requests (id) ON DELETE RESTRICT,
    CONSTRAINT uq_conversation_per_request UNIQUE (connection_request_id)
);

CREATE TABLE messages (
    id              UUID PRIMARY KEY,
    conversation_id UUID      NOT NULL,
    sender_user_id  UUID      NOT NULL,
    body            TEXT      NOT NULL,
    sent_at         TIMESTAMP NOT NULL,
    read_at         TIMESTAMP,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    CONSTRAINT fk_message_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE RESTRICT,
    CONSTRAINT fk_message_sender FOREIGN KEY (sender_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT ck_message_body CHECK (char_length(body) BETWEEN 1 AND 5000)
);
CREATE INDEX idx_messages_conversation ON messages (conversation_id, sent_at);

-- --- Wishlist --------------------------------------------------------------------------------

CREATE TABLE wishlist_items (
    id            UUID PRIMARY KEY,
    owner_user_id UUID         NOT NULL,
    target_type   VARCHAR(16)  NOT NULL,
    target_id     UUID         NOT NULL,
    note          VARCHAR(500),
    saved_at      TIMESTAMP    NOT NULL,
    created_at    TIMESTAMP,
    updated_at    TIMESTAMP,
    CONSTRAINT fk_wishlist_owner FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_wishlist_target_type CHECK (target_type IN ('VC_FIRM', 'STARTUP')),
    CONSTRAINT uq_wishlist_item UNIQUE (owner_user_id, target_type, target_id)
);
CREATE INDEX idx_wishlist_target ON wishlist_items (target_type, target_id);

-- --- Company outreach ------------------------------------------------------------------------

CREATE TABLE outreach (
    id              UUID PRIMARY KEY,
    from_firm_id    UUID         NOT NULL,
    sent_by_user_id UUID,
    to_startup_id   UUID         NOT NULL,
    subject         VARCHAR(200) NOT NULL,
    body            TEXT         NOT NULL,
    status          VARCHAR(16)  NOT NULL,
    sent_at         TIMESTAMP    NOT NULL,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    CONSTRAINT fk_outreach_firm FOREIGN KEY (from_firm_id) REFERENCES vc_firms (id) ON DELETE RESTRICT,
    CONSTRAINT fk_outreach_sender FOREIGN KEY (sent_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_outreach_startup FOREIGN KEY (to_startup_id) REFERENCES startups (id) ON DELETE RESTRICT,
    CONSTRAINT ck_outreach_status CHECK (status IN ('SENT', 'SEEN', 'RESPONDED', 'IGNORED')),
    CONSTRAINT ck_outreach_body CHECK (char_length(body) BETWEEN 1 AND 5000)
);
CREATE INDEX idx_outreach_firm ON outreach (from_firm_id, sent_at DESC);
CREATE INDEX idx_outreach_startup ON outreach (to_startup_id);

-- --- Events ----------------------------------------------------------------------------------

CREATE TABLE events (
    id           UUID PRIMARY KEY,
    host_user_id UUID         NOT NULL,
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    event_type   VARCHAR(16)  NOT NULL,
    start_time   TIMESTAMP    NOT NULL,
    end_time     TIMESTAMP,
    location     VARCHAR(255),
    virtual_link VARCHAR(512),
    is_public    BOOLEAN      NOT NULL,
    created_at   TIMESTAMP,
    updated_at   TIMESTAMP,
    CONSTRAINT fk_event_host FOREIGN KEY (host_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT ck_event_type CHECK (event_type IN ('DEMO_DAY', 'NETWORKING', 'OFFICE_HOURS', 'WEBINAR')),
    CONSTRAINT ck_event_times CHECK (end_time IS NULL OR end_time > start_time)
);
CREATE INDEX idx_events_start ON events (start_time);

CREATE TABLE event_attendees (
    id          UUID PRIMARY KEY,
    event_id    UUID        NOT NULL,
    user_id     UUID        NOT NULL,
    rsvp_status VARCHAR(16) NOT NULL,
    rsvp_at     TIMESTAMP   NOT NULL,
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP,
    CONSTRAINT fk_attendee_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT fk_attendee_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_attendee_rsvp CHECK (rsvp_status IN ('GOING', 'MAYBE', 'NOT_GOING')),
    CONSTRAINT uq_attendee_per_event UNIQUE (event_id, user_id)
);
CREATE INDEX idx_attendees_user ON event_attendees (user_id);

-- --- AI suggestions --------------------------------------------------------------------------

-- One row per person and target, so regenerating refreshes a suggestion instead of piling up a
-- second copy — and a suggestion someone dismissed stays dismissed.
CREATE TABLE ai_suggestions (
    id              UUID PRIMARY KEY,
    for_user_id     UUID          NOT NULL,
    suggestion_type VARCHAR(20)   NOT NULL,
    target_id       UUID          NOT NULL,
    score           NUMERIC(4, 3) NOT NULL,
    reasoning       TEXT          NOT NULL,
    status          VARCHAR(16)   NOT NULL,
    generated_at    TIMESTAMP     NOT NULL,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    CONSTRAINT fk_suggestion_user FOREIGN KEY (for_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_suggestion_type CHECK (suggestion_type IN ('VC_FOR_STARTUP', 'STARTUP_FOR_VC')),
    CONSTRAINT ck_suggestion_status CHECK (status IN ('PENDING', 'DISMISSED', 'ACTIONED')),
    CONSTRAINT ck_suggestion_score CHECK (score >= 0 AND score <= 1),
    CONSTRAINT uq_suggestion_target UNIQUE (for_user_id, target_id)
);
CREATE INDEX idx_suggestions_user ON ai_suggestions (for_user_id, status, score DESC);
