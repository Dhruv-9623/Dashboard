CREATE TABLE investments (
    id UUID PRIMARY KEY,
    vc_firm_id UUID NOT NULL,
    startup_id UUID NOT NULL,
    investment_date DATE NOT NULL,
    amount BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL,
    round VARCHAR(50) NOT NULL,
    equity_percentage NUMERIC(5,2),
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (vc_firm_id) REFERENCES vc_firms(id) ON DELETE CASCADE,
    FOREIGN KEY (startup_id) REFERENCES startups(id) ON DELETE CASCADE
);

CREATE INDEX idx_investments_vc_firm_id ON investments(vc_firm_id);
CREATE INDEX idx_investments_startup_id ON investments(startup_id);
CREATE INDEX idx_investments_status ON investments(status);
