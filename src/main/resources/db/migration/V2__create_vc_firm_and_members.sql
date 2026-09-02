CREATE TABLE vc_firms (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(255),
    aum BIGINT,
    investment_stage VARCHAR(100),
    location VARCHAR(255),
    founded_year INTEGER,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE vc_firm_sectors (
    vc_firm_id UUID NOT NULL,
    sector VARCHAR(255),
    FOREIGN KEY (vc_firm_id) REFERENCES vc_firms(id) ON DELETE CASCADE
);

CREATE TABLE vc_firm_members (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    firm_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,
    joined_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (firm_id) REFERENCES vc_firms(id) ON DELETE CASCADE
);

CREATE INDEX idx_vc_firm_members_firm_id ON vc_firm_members(firm_id);
CREATE INDEX idx_vc_firm_members_user_id ON vc_firm_members(user_id);

CREATE UNIQUE INDEX uq_vc_firm_single_owner ON vc_firm_members(firm_id) WHERE role = 'OWNER';
