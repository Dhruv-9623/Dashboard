# Startup Domain

## Status: Minimal Implementation (Placeholder)

This domain is **deliberately scoped down** for Phase 1. Only the bare minimum entity exists to support VCs logging investments and pool entries that reference startups on the platform. Full startup profiles, team management, and funding round posting are deferred to Phase 2 (Startup-side features).

## Current Scope

### `Startup` Entity
Represents a startup on the platform.

**Current Fields (Phase 1):**
- `id` (UUID) — unique identifier
- `name` — startup name (required)
- `createdAt`, `updatedAt` — timestamps

**Inherited from BaseEntity:**
- All timestamps

**Intentionally Missing (Phase 2+):**
- Full profile (sector, stage, founding year, location, team size, revenue)
- Logo, website, pitch deck URLs
- Team members (FOUNDER, CO_FOUNDER roles)
- Funding rounds and commitments
- Profile verification status

### `StartupRepository`
Basic Spring Data interface.

**Methods:**
- `findById(id)` — inherited from JpaRepository
- `save(startup)` — inherited
- `findByNameContainingIgnoreCase(name, Pageable)` — search by name (used when VCs add to portfolio)

## Use Cases (Phase 1)

1. **VC logs an investment** → selects or searches for a startup by name
2. **VC adds to pool** → can reference an existing startup or just enter a company name (XOR constraint)

## API Endpoints (Phase 1)

None. Startups are referenced by VCs through the Investment and Pool endpoints, not directly managed.

## Testing

No unit tests at this phase (entity is too minimal to test meaningfully).

## Database

Single `startups` table with:
- `id` (UUID, PK)
- `name` (VARCHAR, NOT NULL)
- `created_at`, `updated_at` (TIMESTAMP)

## Phase 2 Roadmap

When startup-side features launch:

### New Entities
- **StartupMember** — team members (FOUNDER, CO_FOUNDER roles)
- **FundingCycle** — active funding rounds posted by startups
- **FundingCommitment** — VC commitments to a funding round

### New Services
- StartupService, FundingCycleService

### API Controllers
- StartupController (profile CRUD, team management)
- FundingCycleController (post/edit rounds, track commitments)

### UI (Frontend)
- Startup profile builder (sector, stage, metrics)
- Team member management
- Funding round posting and tracking

### Business Rules
- Only FOUNDER or CO_FOUNDER can post/edit a funding round
- Startups can see which VCs have committed vs. expressed interest
- VCs can commit amounts with terms (no formal legal docs, just tracking)

## Notes for Developers

- Do **not** build the full profile fields yet; the VC team will need them but the Startup team will define the exact schema
- Keep this entity lightweight to avoid merge conflicts when startup-side features land
- The XOR constraint in Pool (either `startup_id` or `company_name`, not both) is intentional to handle "unregistered companies" VCs track
- Future: consider renaming to `Company` to reflect both startups and established firms VCs track; for now, "Startup" aligns with CLAUDE.md terminology

## References

- See `Investment` domain for how Startups are referenced by VCs
- See `PoolEntry` domain for the unregistered-company use case
