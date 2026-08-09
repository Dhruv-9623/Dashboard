# Dashboard — VC × Startup Platform

## What We're Building

A **Two-sided platform** connecting Venture Capitalists and Startups. Think LinkedIn meets Crunchbase, built natively for the Indian VC ecosystem, unified into a single product instead of five separate tools.

The strategic bet: every piece exists somewhere (AngelList, Tracxn, Notion, Slack) but nothing unifies them with proper role-based access, mutual-consent discovery, and embedded AI agents. We build the unified version with better execution.

**India-first GTM.** Indian VC market: $11B deployed in 2025, 12B+ in new funds, 2,072 active investors.

---

## Tech Stack

| Layer                 | Technology                                              |
|-----------------------|---------------------------------------------------------|
| Language              | Java 21                                                 |
| Framework             | Spring Boot 4.0.6                                       |
| ORM                   | Spring Data JPA + PostgreSQL                            |
| Cache / Sessions      | Redis (Spring Data Redis + Spring Session)              |
| Messaging             | Apache Kafka                                            |
| Auth                  | Spring Security OAuth2 Client                           |
| AI                    | Spring AI + Anthropic Claude (claude-sonnet / claude-haiku) |
| Boilerplate reduction | Lombok                                                  |
| Docs                  | Spring REST Docs                                        |
| Build                 | Maven                                                   |

Base package: `com.VentureCapitals.Dashboard`

---

## Domain Model (Entities to Build)

### Users & Roles

**Two user types, one `users` table with a `user_type` discriminator:**

```
User
├── id (UUID)
├── email
├── passwordHash
├── userType: VC | STARTUP
├── oauthProvider / oauthId  (for Google/LinkedIn login)
├── createdAt / updatedAt
└── isActive
```

**VC-side roles** (within a VC firm):
- `OWNER` — full admin, billing, can add/remove team members
- `PORTFOLIO_MANAGER` — manages portfolio companies, deal flow
- `STAFF` — read + limited actions

**Startup-side roles**:
- `FOUNDER` — full control of startup profile
- `CO_FOUNDER` — same as Founder

```
VCFirm
├── id (UUID)
├── name, description, website
├── aum, investmentStage, sectors (list)
├── location, foundedYear
└── members → List<VCMember>  (join table: vc_firm_members)

VCMember
├── user → User
├── firm → VCFirm
├── role: OWNER | PORTFOLIO_MANAGER | STAFF
└── joinedAt

Startup
├── id (UUID)
├── name, description, website, logoUrl
├── sector, stage (PRE_SEED | SEED | SERIES_A | ...)
├── location, foundedYear
├── annualRevenue, teamSize
├── pitchDeckUrl
└── members → List<StartupMember>

StartupMember
├── user → User
├── startup → Startup
├── role: FOUNDER | CO_FOUNDER
└── joinedAt
```

---

### Core Features & Their Entities

#### 1. Current Investments (VC Dashboard)
Portfolio view — which startups a VC firm has invested in, with deal metadata.

```
Investment
├── vcFirm → VCFirm
├── startup → Startup
├── investmentDate, amount, currency
├── round (SEED, SERIES_A, ...)
├── equityPercentage
├── status: ACTIVE | EXITED | WRITTEN_OFF
└── notes
```

#### 2. Pool (Companies Database)
VC's private/curated database of startups they're tracking (not yet invested).

```
PoolEntry
├── vcFirm → VCFirm
├── startup → Startup  (or unregistered company name if not on platform)
├── addedBy → VCMember
├── tags, notes
├── interestLevel: WATCHING | INTERESTED | HIGH_PRIORITY
└── addedAt
```

#### 3. Funding Cycles (Startup side)
Startups post funding rounds they're raising.

```
FundingCycle
├── startup → Startup
├── roundType (SEED, SERIES_A, ...)
├── targetAmount, currency
├── minTicketSize, maxTicketSize
├── status: OPEN | CLOSED | PAUSED
├── pitchDeckUrl, dataRoomUrl
├── openedAt, closedAt
└── commitments → List<FundingCommitment>

FundingCommitment
├── fundingCycle → FundingCycle
├── vcFirm → VCFirm
├── amount
├── status: INDICATED | SOFT_COMMITTED | COMMITTED
└── committedAt
```

#### 4. Mutual-Consent Messaging (Critical UX feature)
Chat only unlocks after both sides opt in. Founder likes VC → VC accepts → chat opens.

```
ConnectionRequest
├── fromUser → User
├── toUser → User
├── status: PENDING | ACCEPTED | REJECTED
├── requestedAt, respondedAt
└── message (optional intro)

Message
├── conversation → Conversation
├── sender → User
├── body
├── sentAt
└── readAt

Conversation
├── participants → List<User>  (always 2 for DMs)
├── connectionRequest → ConnectionRequest
└── createdAt
```

#### 5. Wishlist
VCs save startups they want to revisit; Startups save VCs they want to pitch.

```
WishlistItem
├── owner → User
├── targetType: VC_FIRM | STARTUP
├── targetId (UUID)
└── savedAt
```

#### 6. Events
Platform-native events (demo days, networking, office hours).

```
Event
├── title, description
├── eventType: DEMO_DAY | NETWORKING | OFFICE_HOURS | WEBINAR
├── hostedBy → User (or VCFirm)
├── startTime, endTime
├── location / virtualLink
├── isPublic
└── attendees → List<EventAttendee>

EventAttendee
├── event → Event
├── user → User
├── rsvpStatus: GOING | MAYBE | NOT_GOING
└── rsvpAt
```

#### 7. Signals / News
AI-curated news and signals about portfolio companies and tracked startups.

```
Signal
├── relatedStartup → Startup (nullable)
├── relatedVCFirm → VCFirm (nullable)
├── sourceUrl, headline, summary
├── signalType: FUNDING | HIRING | REGULATORY | MARKET | PRODUCT
├── sentiment: POSITIVE | NEUTRAL | NEGATIVE
├── publishedAt
└── aiGenerated (boolean)
```

#### 8. AI Suggestions
AI recommends VC → Startup matches and vice versa.

```
AISuggestion
├── forUser → User
├── suggestionType: VC_FOR_STARTUP | STARTUP_FOR_VC
├── targetId (UUID)
├── score (0.0–1.0)
├── reasoning (AI-generated text)
├── status: PENDING | DISMISSED | ACTIONED
└── generatedAt
```

#### 9. Company Outreach (VC initiates contact)
Formal outreach from VC to a startup not yet connected.

```
Outreach
├── fromFirm → VCFirm
├── toStartup → Startup
├── subject, body
├── status: SENT | SEEN | RESPONDED | IGNORED
└── sentAt
```

#### 10. Insights
Analytics shown to users — traction metrics, engagement, funnel data.
(Computed layer — no dedicated entity needed initially, derive from existing tables.)

#### 11. Comparison
Side-by-side comparison of startups (for VCs doing due diligence).
(Stateless feature — VC selects N startups, we aggregate and return. No persistence needed initially.)

---

## Package Structure

```
com.VentureCapitals.Dashboard
├── config/           # SecurityConfig, KafkaConfig, RedisConfig, AIConfig
├── domain/
│   ├── user/         # User, UserType, UserRepository, UserService
│   ├── vc/           # VCFirm, VCMember, VCRole, repos, services
│   ├── startup/      # Startup, StartupMember, StartupRole, repos, services
│   ├── investment/   # Investment, InvestmentRepository, InvestmentService
│   ├── pool/         # PoolEntry, repos, services
│   ├── funding/      # FundingCycle, FundingCommitment, repos, services
│   ├── messaging/    # Conversation, Message, ConnectionRequest, repos, services
│   ├── wishlist/     # WishlistItem, repos, services
│   ├── events/       # Event, EventAttendee, repos, services
│   ├── signals/      # Signal, repos, services
│   ├── outreach/     # Outreach, repos, services
│   └── ai/           # AISuggestion, AIService (Spring AI integration)
├── api/              # REST controllers, DTOs, mappers
│   ├── auth/
│   ├── vc/
│   ├── startup/
│   ├── investment/
│   ├── pool/
│   ├── funding/
│   ├── messaging/
│   ├── wishlist/
│   ├── events/
│   ├── signals/
│   └── ai/
├── messaging/        # Kafka producers/consumers
│   ├── events/       # event definitions
│   └── consumers/    # async processing (AI suggestion generation, notifications)
├── security/         # JWT filter, OAuth2 success handler, role evaluator
└── common/           # BaseEntity, ApiResponse, exceptions, pagination utils
```

---

## Coding Conventions

- **Entities** extend a `BaseEntity` (id as UUID, createdAt, updatedAt with `@PrePersist`/`@PreUpdate`)
- **Use Lombok** everywhere: `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`
- **DTOs** are separate from entities — never expose JPA entities directly in API responses
- **Services** contain business logic; repositories are pure Spring Data interfaces
- **Controllers** are thin — delegate everything to services
- **Enums** over magic strings for status/type fields
- **Kafka topics** naming: `dashboard.{domain}.{event}` e.g. `dashboard.messaging.new-message`
- **Redis** for: session storage, rate limiting, caching AI suggestions (TTL 1h), caching signals (TTL 30min)
- **AI calls** go through `AIService` — never call `ChatClient` directly from a controller or business service
- All API responses wrapped in a standard `ApiResponse<T>` envelope

---

## Auth Flow

- OAuth2 via Google and LinkedIn (Spring Security OAuth2 Client)
- On first OAuth login → prompt user to choose VC or Startup, then complete profile
- Sessions stored in Redis
- Role-based access: Spring Security method-level with `@PreAuthorize`
- Users can belong to one firm/startup only (for now)

---

## Key Business Rules

1. **Mutual consent for messaging** — `ConnectionRequest` must be ACCEPTED before `Conversation` is created
2. **VCFirm Owner** is the only role that can add/remove team members or change firm details
3. **FundingCycle** can only be created by FOUNDER or CO_FOUNDER, not VCs
4. **Investment** records are created by VC side only (OWNER or PORTFOLIO_MANAGER)
5. **AISuggestions** are generated asynchronously via Kafka consumer calling Spring AI
6. **Signals** are aggregated async — don't block API responses for them

---

## Infrastructure Notes (Local Dev)

- PostgreSQL on port 5432, DB name: `dashboard_dev`
- Redis on port 6379
- Kafka on port 9092 (use Docker Compose)
- Spring AI: set `ANTHROPIC_API_KEY` env var
- OAuth2: set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`

---

## Current Status

**Scaffolded only.** No domain code written yet. The `pom.xml` has all dependencies. Starting point is implementing domain entities and the base infrastructure (BaseEntity, ApiResponse, SecurityConfig, DB migrations).

Start here when beginning a new feature:
1. Entity + Repository in `domain/{feature}/`
2. Service with business logic
3. DTO + Controller in `api/{feature}/`
4. Kafka event (if async work needed)
