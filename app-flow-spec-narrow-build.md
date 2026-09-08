# App Flow Specification — VC Deal-Ops Platform (Narrow Build)

**Scope:** Deal Triage · Conflict Sentinel · Portfolio Pulse — VC-side only, web-first, on the existing Spring Boot monolith
**Source of scope:** Business Case v1.0 (22 July 2026), Sections 6, 7 and 10.2
**Supersedes:** the two-sided mutual-consent flow described in the April 2026 PRD v1.0 and Visual Companion — that flow is out of scope for this build

---

## 0. What this document is, and isn't

None of the five source documents (Validation Research, PRD v1.0, Visual Companion, Business Case) contain flow-level detail for this narrowed 3-feature scope. The Business Case describes *what* to build and in what order (Section 10.2) but not *how a user moves through it* screen by screen, or what each AI agent's inputs/outputs/tools are.

This document fills that gap. Everything below is newly constructed from:
- The feature descriptions in Business Case §6.1
- The build sequence and entity list in Business Case §10.2 (Foundation → Deal Triage → Conflict Sentinel → Portfolio Pulse → Billing)
- The AI Agent Specification *format* from PRD v1.0 §11 (When / Inputs / Outputs / Tools) — reused here because it is implementation-ready, not because the original agents are in scope

Anything not stated in the Business Case (exact alert thresholds, exact confidence-scoring method, etc.) is flagged as an open question in Section 8, not invented.

---

## 1. Foundation — before any feature works

Per Business Case §10.2, weeks 9–11:

- **Auth:** Self-serve sign-up. No external verification step (this build has no SEBI/SEC-style KYC — that was original-PRD scope only).
- **Roles:** Two only — **Owner**, **Member**. Not the five-role matrix (Owner/PM/Staff/Founder/Co-founder) from the original PRD.
- **Tenancy:** Every account is one Firm. Isolation enforced at the service layer.
- **Audit log:** Every write action is logged, immutable.
- **Storage:** Postgres with pgvector (for the embeddings Conflict Sentinel needs).

---

## 2. App-level flow

No such flow existed anywhere in the source documents for this scope — this is new.

```mermaid
flowchart TD
    A[Sign up] --> B[Choose plan: Free / Starter / Growth]
    B --> C[Set up firm: enter thesis]
    C --> D[Upload or enter portfolio]
    D --> E[Dashboard]
    E --> F{Pick a feature}
    F -->|Score a deal| G[Deal Triage]
    F -->|Check a conflict| H[Conflict Sentinel]
    F -->|Review portfolio| I[Portfolio Pulse]
```

Notes:
- Thesis capture (step C) and portfolio ingestion (step D) are both required setup — Deal Triage can't score without a thesis, Conflict Sentinel can't compare without a portfolio.
- The Dashboard is a single unified view (not role-specific) since there are only two roles and three features.

---

## 3. Feature: Deal Triage

### 3.1 User flow

```mermaid
flowchart TD
    A[Analyst logs new opportunity] --> B[Claude scoring agent runs]
    B --> C[Review queue: score + rationale]
    C --> D[Analyst approves or rejects]
    D --> E[Pipeline updated, audit logged]
```

### 3.2 Technical sequence

```mermaid
sequenceDiagram
  participant A as Analyst
  participant FE as Frontend
  participant BE as Backend
  participant DB as Postgres
  participant C as Claude API
  A->>FE: Submit opportunity
  FE->>BE: POST /opportunities
  BE->>DB: Save opportunity
  BE->>C: Send opportunity + thesis for scoring
  C-->>BE: Score plus citations
  BE->>DB: Store score
  BE-->>FE: Return result
  FE-->>A: Show in review queue
  A->>FE: Approve or reject
  FE->>BE: PATCH status
  BE->>DB: Update plus audit log
```

### 3.3 Agent spec

| | |
|---|---|
| **When** | Runs automatically on every new opportunity intake. On-demand re-score available. |
| **Inputs** | Opportunity details (company info, stage, sector, ask); firm's thesis (sectors, stages, cheque size) |
| **Outputs** | Fit score (0–100); short cited rationale; recommended action (pursue / pass / needs more info) |
| **Tools** | `thesis.match()`, `opportunity.get()`, `score.cite()` |

---

## 4. Feature: Conflict Sentinel

### 4.1 User flow

```mermaid
flowchart TD
    A[Portfolio data ingested: CSV or manual] --> B[New opportunity arrives]
    B --> C[Overlap analysis: semantic + rule-based]
    C --> D[Conflict report: confidence per dimension]
    D --> E[Analyst reviews: proceed or flag]
```

### 4.2 Technical sequence

```mermaid
sequenceDiagram
  participant A as Analyst
  participant FE as Frontend
  participant BE as Backend
  participant DB as Postgres plus pgvector
  participant C as Claude API
  A->>FE: Trigger conflict check
  FE->>BE: POST /conflict-check
  BE->>DB: Fetch portfolio embeddings
  DB-->>BE: Candidate matches
  BE->>C: Compare deal vs candidates
  C-->>BE: Conflict report plus confidence
  BE->>DB: Store conflict report
  BE-->>FE: Return report
  FE-->>A: Display conflict flags
```

### 4.3 Agent spec

| | |
|---|---|
| **When** | Triggered manually before a new investment decision, per Business Case §6.1 |
| **Inputs** | Candidate company details; current portfolio (ingested via CSV or manual entry — no Carta integration in this build) |
| **Outputs** | Conflict report: sector overlap, customer overlap, competitive-product overlap, each with a confidence score |
| **Tools** | `portfolio.embed()`, `portfolio.compare()`, `overlap.score()` |

**Open question (not specified anywhere in the source docs):** whether the confidence score is shown per-dimension or as one blended number. Flag for the discovery interviews.

---

## 5. Feature: Portfolio Pulse

### 5.1 User flow

```mermaid
flowchart TD
    A[Scheduled job triggers weekly] --> B[Fetch portfolio company data]
    B --> C[Claude summarizes updates]
    C --> D[Alert rules evaluated]
    D --> E[Digest emailed to VC]
```

### 5.2 Technical sequence

```mermaid
sequenceDiagram
  participant S as Scheduler
  participant BE as Backend
  participant DB as Postgres
  participant C as Claude API
  participant E as Email service
  participant V as VC user
  S->>BE: Trigger weekly digest
  BE->>DB: Fetch company data
  BE->>C: Summarize updates
  C-->>BE: Digest narrative
  BE->>BE: Evaluate alert rules
  BE->>E: Send digest email
  E-->>V: Digest delivered
  V->>BE: Open dashboard for detail
```

### 5.3 Agent spec

| | |
|---|---|
| **When** | Weekly scheduled job. On-demand button also available. |
| **Inputs** | Portfolio company records; latest status/metrics entered by the fund |
| **Outputs** | Markdown digest: per-company status, alerts, plain-English summary |
| **Tools** | `portfolio.get()`, `alerts.evaluate()`, `digest.compose()` |

**Open question:** exact alert-rule thresholds (e.g., what counts as "stale data" or a metric "decline") are not specified in the Business Case — needs a founder decision before this ships.

---

## 6. Data model (scoped to this build only)

```mermaid
erDiagram
  FIRM ||--o{ USER : employs
  FIRM ||--o{ THESIS : defines
  FIRM ||--o{ OPPORTUNITY : evaluates
  FIRM ||--o{ PORTFOLIOCOMPANY : holds
  OPPORTUNITY ||--o| CONFLICTREPORT : generates
  PORTFOLIOCOMPANY ||--o{ CONFLICTREPORT : "compared against"
  FIRM ||--o{ DIGEST : receives
  FIRM {
    uuid id PK
    string name
    string plan_tier
  }
  USER {
    uuid id PK
    uuid firm_id FK
    string role
  }
  THESIS {
    uuid id PK
    uuid firm_id FK
    string sectors
    string stages
    string cheque_size
  }
  OPPORTUNITY {
    uuid id PK
    uuid firm_id FK
    string company_name
    int fit_score
    string status
  }
  PORTFOLIOCOMPANY {
    uuid id PK
    uuid firm_id FK
    string name
    string sector
    string status
  }
  CONFLICTREPORT {
    uuid id PK
    uuid opportunity_id FK
    float confidence
  }
  DIGEST {
    uuid id PK
    uuid firm_id FK
    date sent_at
  }
```

This is deliberately smaller than the original PRD's data model — no `Like`, `Match`, `Message`, `PoolEntry`, `Wishlist`, or `Event` entities, because none of those concepts exist in the narrowed build.

---

## 7. Explicitly out of scope for this flow

Per Business Case §6.3, deferred until the reinstatement triggers listed there are met:

- Mutual-consent matching (the Like → Match state machine from the original PRD)
- Founder-side app entirely
- Native iOS / Android apps
- Multi-role RBAC (PM, Staff, Founder, Co-founder)
- Pool of companies / market database

If any of these get reinstated later, the flows in this document need to be re-scoped — they currently assume none of them exist.

---

## 8. Open questions (genuinely undecided, not just deferred)

1. Conflict Sentinel: per-dimension confidence display, or one blended score?
2. Portfolio Pulse: exact alert-rule thresholds for "decline" or "stale."
3. Deal Triage: does the review queue support bulk approve/reject, or one-at-a-time only?
4. None of the source documents specify what happens to an opportunity after "needs more info" — does it re-enter the queue, or wait for manual follow-up?

These need a founder decision, not more research — they weren't addressed in the discovery-interview plan either.
