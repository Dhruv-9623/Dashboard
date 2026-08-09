# Dashboard — VC × Startup Platform

A **two-sided platform** connecting Venture Capitalists and Startups, built natively for the Indian VC ecosystem. Think LinkedIn meets Crunchbase, unified into a single product instead of five separate tools.

## The Vision

The Indian VC market deployed **$11B in 2025** with $12B+ in new funds and 2,072 active investors. Every piece of information exists somewhere—AngelList, Tracxn, Notion, Slack—but nothing unifies them with proper role-based access, mutual-consent discovery, and intelligent matching. Dashboard bridges that gap with better execution, unified UX, and India-focused GTM.

---

## Key Features

### For VCs
- **Portfolio Dashboard** — Track all current investments with deal metadata, exit status, and performance
- **Private Pool** — Curate and track startups you're watching but haven't invested in yet
- **Deal Flow** — Discover startups raising capital that match your investment criteria
- **Mutual-Consent Messaging** — Chat unlocks only after both parties opt in
- **Wishlist** — Save startups for future consideration
- **AI Suggestions** — Intelligent VC-to-Startup matches based on portfolio and preferences
- **Signals & News** — AI-curated market signals and company updates
- **Outreach** — Formally contact startups not yet connected to your firm

### For Startups
- **Funding Rounds** — Post active funding cycles with target amounts and investor preferences
- **Investor Discovery** — Find VCs matching your stage, sector, and ticket size
- **Deal Tracking** — Monitor funding commitments and investor engagement
- **Wishlist** — Save VCs you want to pitch
- **Messaging** — Connect with VCs through a mutual-consent platform
- **Event Access** — Register for demo days, networking, and office hours
- **Profile & Traction** — Showcase your company, team, metrics, and pitch materials

### Platform-Wide
- **Events** — Demo days, networking events, office hours, webinars
- **Comparison** — Side-by-side startup analysis for due diligence
- **Analytics** — Engagement metrics, funnel insights, platform activity
- **Role-Based Access Control** — Different permissions for Owners, Portfolio Managers, Staff (VC-side) and Founders, Co-Founders (Startup-side)

---

## Tech Stack

| Component              | Technology                          |
|------------------------|-------------------------------------|
| **Language**           | Java 21                             |
| **Framework**          | Spring Boot 4.0.6                   |
| **Database**           | PostgreSQL 16+                      |
| **ORM**                | Spring Data JPA                     |
| **Cache & Sessions**   | Redis                               |
| **Message Queue**      | Apache Kafka                        |
| **Authentication**     | Spring Security OAuth2 (Google, LinkedIn) |
| **API Docs**           | Spring REST Docs                    |
| **Build Tool**         | Maven                               |
| **Boilerplate**        | Lombok                              |

---

## Project Structure

```
com.VentureCapitals.Dashboard
├── config/              # SecurityConfig, KafkaConfig, RedisConfig, AIConfig
├── domain/
│   ├── user/            # User, UserType, UserRepository, UserService
│   ├── vc/              # VCFirm, VCMember, VCRole, repos, services
│   ├── startup/         # Startup, StartupMember, StartupRole, repos, services
│   ├── investment/      # Investment, InvestmentRepository, InvestmentService
│   ├── pool/            # PoolEntry, repos, services
│   ├── funding/         # FundingCycle, FundingCommitment, repos, services
│   ├── messaging/       # Conversation, Message, ConnectionRequest, repos, services
│   ├── wishlist/        # WishlistItem, repos, services
│   ├── events/          # Event, EventAttendee, repos, services
│   ├── signals/         # Signal, repos, services
│   ├── outreach/        # Outreach, repos, services
│   └── ai/              # AISuggestion, AIService integration
├── api/                 # REST controllers, DTOs, mappers
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
├── messaging/           # Kafka producers/consumers
│   ├── events/          # Event definitions
│   └── consumers/       # Async processing, notifications
├── security/            # JWT filter, OAuth2 handler, role evaluator
└── common/              # BaseEntity, ApiResponse, exceptions, pagination

```

---

## Getting Started

### Prerequisites
- **Java 21** or later
- **Maven 3.8.1+**
- **PostgreSQL 16+**
- **Redis 7.0+**
- **Docker & Docker Compose** (for local infrastructure)

### Local Development Setup

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd Dashboard
```

#### 2. Set Up Environment Variables
Create a `.env` file in the project root:
```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/dashboard_dev
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres

# Redis
SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379

# Kafka
SPRING_KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# OAuth2
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
LINKEDIN_CLIENT_ID=<your-linkedin-client-id>
LINKEDIN_CLIENT_SECRET=<your-linkedin-client-secret>

# AI Integration
ANTHROPIC_API_KEY=<your-anthropic-api-key>

# Application
SPRING_PROFILES_ACTIVE=dev
```

#### 3. Start Infrastructure with Docker Compose
```bash
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Kafka on `localhost:9092`

#### 4. Build the Application
```bash
mvn clean install
```

#### 5. Run Database Migrations
Migrations are handled automatically by Spring Boot on startup. Check `src/main/resources/db/migration/` for SQL scripts.

#### 6. Start the Application
```bash
mvn spring-boot:run
```

The application will be available at `http://localhost:8080`

---

## Database Schema

### Core Entities

**User** (Discriminated by `user_type`)
- VCs and Startups on same table
- OAuth2 support (Google, LinkedIn)
- Session stored in Redis

**VCFirm**
- Name, description, website, AUM
- Investment stage preference, sectors
- Location, founding year
- Team members with role-based access (OWNER, PORTFOLIO_MANAGER, STAFF)

**Startup**
- Name, description, logo, website
- Sector, funding stage (PRE_SEED, SEED, SERIES_A, etc.)
- Location, founding year, revenue, team size
- Pitch deck and supporting materials
- Team members (FOUNDER, CO_FOUNDER)

**Investment**
- VC Firm → Startup relationship
- Amount, currency, round type
- Equity percentage, status (ACTIVE, EXITED, WRITTEN_OFF)

**FundingCycle**
- Active fundraising round posted by startup
- Target amount, ticket size range
- Funding commitments from VCs
- Data room and pitch deck URLs

**Conversation & Message**
- Mutual-consent messaging (requires accepted ConnectionRequest)
- Read receipts, timestamps
- Always between two participants

**PoolEntry**
- VC's private database of tracked startups
- Interest level, tags, notes

**Event, Signal, AISuggestion, Outreach, WishlistItem**
- See CLAUDE.md for detailed specs

---

## API Conventions

All API responses follow a standard envelope:

```json
{
  "success": true,
  "data": { /* response data */ },
  "error": null,
  "timestamp": "2026-08-09T10:30:00Z"
}
```

Error responses:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": []
  },
  "timestamp": "2026-08-09T10:30:00Z"
}
```

---

## Authentication

### OAuth2 Flow
1. User initiates OAuth login (Google or LinkedIn)
2. On first login, user selects account type (VC or Startup) and completes profile
3. Session stored in Redis
4. Role-based authorization via Spring Security `@PreAuthorize` annotations

### Secured Endpoints
All API endpoints (except `/auth/**` and `/public/**`) require valid authentication token.

---

## Key Business Rules

1. **Mutual Consent for Messaging** — `ConnectionRequest` must be ACCEPTED before conversation creation
2. **VCFirm Ownership** — Only OWNER role can add/remove team members or modify firm details
3. **Fundraising Rights** — Only FOUNDER or CO_FOUNDER can create FundingCycle
4. **Investment Records** — Created by VC side (OWNER or PORTFOLIO_MANAGER) only
5. **Async Processing** — AI suggestions and signals generated asynchronously via Kafka to avoid API latency
6. **User Uniqueness** — Users can belong to one VC firm or startup (multi-org support in roadmap)

---

## Development Workflow

### Adding a New Feature

1. **Create Domain Entity** in `domain/{feature}/`
   - Extend `BaseEntity`
   - Use Lombok annotations
   - Create Repository (Spring Data JPA)

2. **Implement Service** in same package
   - Business logic
   - Validation and authorization
   - Kafka event publishing (if async needed)

3. **Create DTO & Controller** in `api/{feature}/`
   - Keep entities out of API responses
   - Thin controllers—delegate to services
   - Document with Spring REST Docs

4. **Add Kafka Consumer** (if async processing needed)
   - `messaging/consumers/`
   - Process events asynchronously

5. **Write Tests**
   - Unit tests for services
   - Integration tests with `@SpringBootTest`
   - Use H2 in-memory DB for tests

### Coding Standards
- Use Lombok everywhere (`@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`)
- Separate DTOs from JPA entities
- Enums for status/type fields (no magic strings)
- Comments only for non-obvious logic
- Kafka topics: `dashboard.{domain}.{event}` (e.g., `dashboard.messaging.new-message`)
- Redis for caching (AI suggestions TTL: 1h, Signals TTL: 30min)

---

## Testing

Run all tests:
```bash
mvn test
```

Run integration tests only:
```bash
mvn test -DargLine="-Dspring.profiles.active=test"
```

Test database uses H2 in-memory by default (configurable in `application-test.yml`).

---

## API Documentation

Generate Spring REST Docs:
```bash
mvn clean test asciidoctor:process-asciidoc
```

Documentation available at `target/generated-docs/index.html`

---

## Deployment

### Docker Build
```bash
docker build -t dashboard:latest .
```

### Environment for Production
Set environment variables in your deployment platform (AWS, GCP, etc.):
- Database credentials and URL
- Redis endpoint
- Kafka brokers
- OAuth2 secrets
- Anthropic API key

### Health Check
```bash
curl http://localhost:8080/actuator/health
```

---

## Troubleshooting

### Database Connection Failed
- Ensure PostgreSQL is running: `docker-compose ps`
- Check credentials in `.env`
- Verify database exists: `psql -U postgres -c "SELECT datname FROM pg_database;"`

### Redis Connection Refused
- Ensure Redis container is running: `docker-compose ps`
- Clear Redis cache: `redis-cli FLUSHALL`

### Kafka Errors
- Check broker is running: `docker-compose logs kafka`
- Verify topics exist: `kafka-topics --list --bootstrap-server localhost:9092`

### OAuth2 Login Not Working
- Verify client IDs and secrets in `.env`
- Check redirect URIs match OAuth provider configuration
- Ensure OAuth provider allows `http://localhost:8080` in dev

---

## Roadmap

- [ ] Frontend (React/TypeScript)
- [ ] Mobile apps (iOS/Android)
- [ ] Advanced analytics dashboard
- [ ] Multi-org support for VCs
- [ ] Due diligence document automation
- [ ] Automated term sheet generation
- [ ] Video conferencing integration
- [ ] Notification system (email, SMS, push)
- [ ] Advanced search and filtering
- [ ] Integration with Stripe for platform fees

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Commit changes with clear messages
3. Push and open a Pull Request
4. Ensure all tests pass and code follows conventions
5. Request review from team members

---

## Support & Questions

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation in CLAUDE.md
- Review API docs after running `mvn asciidoctor:process-asciidoc`

---

## License

This project is proprietary. All rights reserved.

---

**Last Updated:** August 9, 2026  
**Maintainer:** Dashboard Team  
**Status:** Active Development