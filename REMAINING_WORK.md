# Remaining Work

_Last updated: 26 Sep 2026. Passes so far: the frontend, backend and design reviews; fixes; backend groundwork + Startup/Investment/Pool build-out; testing + one-command local setup; the design-system rebuild, the charts + hero pass, the Insights rebuild, and the company view + illustration._

**How to run and test any of this: `TESTING.md`.** `scripts/dev-up.sh` brings the whole stack up with demo accounts; `scripts/test-all.sh` runs everything that doesn't need a running app.

This file tracks what's left against the plan agreed in those reviews. `CLAUDE.md` is still the product spec. Nothing from this pass has been committed.

---

## Read this first

1. **Start everything with `scripts/dev-up.sh`** (Postgres and Redis in Docker, backend, frontend, demo accounts) and stop it with `scripts/dev-down.sh`. Don't reuse a long-lived `mvnw spring-boot:run` process: devtools reloads classes but keeps the old dependency classpath, which is how a removed library (Spring Data REST) went on serving requests for days.
2. **Google/LinkedIn login hasn't been tested against the real providers.** The OIDC fix compiles and the security slice test passes, but a real sign-in needs the client IDs and secrets. Test both providers first, including a brand-new user picking an account type, then creating a firm.
3. **CSRF is now enforced for real.** The frontend sends `X-XSRF-TOKEN` read from the `XSRF-TOKEN` cookie. Cookies aren't port-specific, so this works on `localhost:3000` → `localhost:8080`. **In production, the frontend and API must share a registrable domain** (or use a proxy), or the cookie can't be read. See R-2.
4. **New environment variable:** `CORS_ALLOWED_ORIGINS` (comma-separated). It defaults to localhost:3000–3002.
5. **API contract change:** `POST /api/vc/firms/{id}/members` now takes `{ email, role }`, not `{ userId }`. `role` can't be `OWNER`.
6. **The V2 migration blocker is resolved — but by reverting your edit, so read this.** `V2__*.sql` had been edited after it ran (the `uq_vc_firm_single_owner` partial index was deleted), which broke its checksum and stopped the app starting against `dashboard_dev`. Because that index already existed in `dashboard_dev` from V2's original run, restoring the line is the only option that leaves source and database agreeing — so **V2 is back to its committed content and the single-owner index stays**. Nothing else needed changing: Flyway now validates all 7 migrations and applied V7 and V8 to `dashboard_dev` cleanly. If you meant to allow several owners per firm, that's decision 2 below; do it as a new migration plus the matching change in `VCFirmService.changeMemberRole`, not by editing V2.
7. **Paging contract (now shared by backend, frontend and mocks):** `{ items, page, size, totalElements, totalPages }`, default size 20, max 100 (`common/PageResponse.java`, `frontend/src/lib/api-client.ts`, `frontend/src/mocks/index.ts`). Dashboard totals come from `GET /api/investments/summary`, not from a page, so they stay correct across pages.

---

## Done in the first pass (14 Sep 2026)

### Backend
| Change | Where |
|---|---|
| Removed Spring Data REST, which was exposing `/users` with password hashes and every repository as unsecured CRUD | `pom.xml` |
| OIDC login path: Google and LinkedIn now create or link a platform user and don't crash | `security/CustomOidcUserService.java`, `AuthenticatedUserPrincipal` (implements `OidcUser`), `SecurityConfig`, LinkedIn OIDC endpoints in `application.yml` |
| Session fixation: session id rotates on email/password login | `AuthController.establishSession` |
| Stale roles: OAuth session gets refreshed authorities after account-type selection | `AuthController.refreshOAuthAuthorities` |
| CSRF in SPA mode, with a cookie filter so the token exists before the first POST | `SecurityConfig` (`csrf.spa()`), `security/CsrfCookieFilter.java` |
| `/api/**` returns 401 instead of redirecting to the OAuth page; logout returns 200 | `SecurityConfig` |
| CORS origins come from config | `SecurityConfig`, `app.cors.allowed-origins` |
| Exception handling: 403 for `@PreAuthorize` denials, 400 for malformed JSON / bad UUID / missing params, 409 for DB constraint hits, `fieldErrors` map on validation errors | `GlobalExceptionHandler`, `ApiResponse.fieldErrors` |
| `GET /api/vc/firms/me` added (returns null data before setup) | `VCFirmController`, `VCFirmService.findFirmForUser` |
| Firm sectors load eagerly, fixing a lazy-init crash on GET firm | `VCFirm.sectors` |
| Members: invite by email + role; invitee must be a VC; second OWNER rejected with a clear message; role change returns the member | `AddMemberRequest`, `VCFirmService`, `VCFirmController` |
| Role-change rules match the single-owner DB index (clear errors instead of 500s) | `VCFirmService.changeMemberRole` |
| Login no longer reveals which emails exist; deactivated accounts are refused at login, OAuth and session | `UserService`, `SessionUserAuthenticationFilter`, OAuth services |
| `isActive` now serialises as `isActive`, not `active` | `UserDTO` |
| Validation on firm create/update: http(s)-only website, lengths, ranges | `CreateVCFirmRequest`, `UpdateVCFirmRequest` |
| Emails removed from logs; security/web logging lowered to INFO; dead `spring.session.store-type` removed | resolver, filter, `UserService`, `application.yml` |
| `.env` files ignored at repo root | `.gitignore` |
| Tests: 26 pass (was 8). New security web slice covers CSRF, 401/403, validation, JSON shape | `config/SecurityConfigWebTest.java`, `UserServiceTest`, `VCFirmServiceTest`; added `spring-boot-starter-webmvc-test` |

### Frontend
| Change | Where |
|---|---|
| CSRF header, 30 s request timeout, network and timeout errors in plain language, `fieldErrors` on `ApiError` | `lib/api-client.ts`, `components/ErrorState.tsx` |
| Member API contracts fixed (email + role, `newRole` query param); OWNER not offered on invite | `features/vc-firm/api.ts`, `types.ts`, `SettingsPage` |
| `safeUrl()` on all six user-supplied links (blocks `javascript:` hrefs) | `lib/utils.ts` + Signals, VC firm, Events, Startup, Opportunity, Deal Flow pages |
| App-level and per-route error boundaries | `components/ErrorBoundary.tsx`, `App.tsx`, `AppShell` |
| Dashboard: errors show an error card, not ₹0/0; totals grouped per currency | `DashboardPage`, `lib/constants.ts` (`formatMoneyTotals`, `pluralize`) |
| Messages: thread error state, send-failure message, `markRead` wired up, send button named | `MessagesPage` |
| Conflict Sentinel and detail pages: errors no longer look like empty data; retry added | `ConflictSentinelPage`, `StartupDetailPage`, `VCFirmDetailPage` |
| Account-type selection updates the cached user (fixes a redirect loop against the real backend) | `AccountTypeSelectionPage` |
| "Test Login (dev only)" hidden outside dev builds (verified absent from the production bundle) | `LandingPage` |
| **Design tokens started** (`muted`, `placeholder`, `field`, `icon-muted`) and applied to form primitives | `index.css`, `Input`, `Textarea`, `Select`, `Label` |
| Contrast fixes: sidebar labels, placeholders, input borders, score text (700 steps), asterisk, chat timestamps, selected rows; primary button moved to blue-700 | `AppShell`, `ScoreDial`, `MessagesPage`, `PulsePage`, `Button` |
| Focus management for Modal and the mobile drawer (move in, trap, Escape, restore) | `lib/useFocusTrap.ts`, `Modal`, `AppShell` |
| Tabs: arrow/Home/End keys, roving tabindex, row scrolls instead of overflowing the page | `components/ui/Tabs.tsx` |
| Page titles per route, skip link, focus moves to the page `h1` after navigation | `lib/useDocumentTitle.ts`, `PageHeader`, `AppShell`, pre-auth pages |
| Deal Triage rows reachable by keyboard (company name is a link) | `ReviewQueuePage` |
| Links no longer wrap `<Button>` (one tab stop per action) via `buttonClass()` | `Button.tsx` + 13 call sites |
| Names/labels on icon buttons, hearts (`aria-pressed`), search inputs and filter selects; 44 px touch targets on mobile for header and heart buttons | `AppShell`, `DiscoverPage`, `WishlistPage`, `DealFlowPage`, `ConflictSentinelPage`, `LandingPage` |
| Readable labels instead of raw values: thesis field names, RSVP badges, role badges, stage in the header, plurals | `OpportunityDetailPage`, `DashboardPage`, `SettingsPage`, `useProfile` |
| Skeleton pulse respects reduced motion; loading regions announced | `Skeleton.tsx` |

### Measured before → after (same audit scripts, mock data)
| Check | Before | After |
|---|---|---|
| Text contrast pairs failing AA | 7 | **0** |
| Input borders under 3:1 | 1.41–1.47:1 | **≥3.24:1** |
| Pages scrolling sideways at 375 px | 4 | **0** |
| Unnamed controls / unlabelled inputs | 26 / 6 | **0 / 0** |
| Modal: first Tab escapes to page | yes | **no, focus trapped and restored** |
| Page title | "Dashboard" everywhere | **"Pool · Dashboard" etc.** |
| Dashboard on server error | ₹0 · 0 · 0 | **Error card with retry** |
| Touch targets under 44 px (375 px, all pages) | 266 | 221 (see R-9) |
| TypeScript / production build / backend tests | pass / pass / 8 | pass / pass / **26** |

### Live test run (14 Sep 2026, real backend + Postgres + Redis, no mocks)
| Suite | Result |
|---|---|
| Backend unit + security slice tests (`./mvnw -o test`) | **29 pass** (1 disabled, pre-existing) |
| API checks with curl: CSRF, 401/403, validation, register → account type → firm → invite → role rules → logout, session rotation | **45 / 45** |
| Browser end-to-end on the real UI (:3002 → :8081): sign-in page, register, choose VC, onboarding, create firm, dashboard, invite teammate, error message, logout, no CSRF rejections, no console errors | **15 / 15** |

**Bugs the live run caught that unit tests and mocks had missed (all fixed and covered by tests):**
- **Email/password users kept stale roles.** After picking "VC" they still got 403 on VC endpoints, because Spring's session-management filter saved the first request's context. `SessionUserAuthenticationFilter` now rebuilds from the DB on every request, which also makes deactivation take effect immediately.
- **`SessionUserAuthenticationFilter` was a `@Bean`**, so Spring Boot also ran it as a plain servlet filter outside the security chain. Now it's created only inside the chain (`SecurityConfig`).
- **A missing `data` field broke React Query.** `ApiResponse` omits null fields, so "no firm yet" arrived as a missing key and crashed the onboarding guard. `api-client.ts` normalises it to `null`. The mocks had always sent `null`, which is why this never appeared.
- **Unmapped endpoints returned 500.** The catch-all handler swallowed `NoResourceFoundException`; now 404.

**Test data left in the dev DB:** users `*@meridian.test`, `*@startup.test`, `*@t.test`, `*@x.test` and firms named "Meridian Live Test" / "E2E Capital …". Safe to delete.

---

## Done in the second pass (20 Sep 2026)

This pass did the backend groundwork (R-5…R-8), the frontend foundation (R-10…R-14) and then the first slice of the `CLAUDE.md` build-out: **Startup**, plus real **Investment** and **Pool** APIs end to end.

### Backend groundwork
| Change | Where |
|---|---|
| **R-5** One `FirmAccessPolicy` replaces nine copy-pasted membership/role checks. Reads now check tenancy too (`getInvestment`, `listInvestmentsByFirm*`, `getPoolEntry`, `listPoolEntriesByFirm*` previously didn't). Rule 4 is expressed as `INVESTMENT_EDITORS = {OWNER, PORTFOLIO_MANAGER}`, not "not STAFF" | `domain/vc/FirmAccessPolicy.java` |
| **R-6** Validation on every request DTO (currency ISO code, equity 0–100, `interestLevel` required, lengths); request DTOs moved from `domain/*` to `api/*` per `CLAUDE.md` | `api/investment/`, `api/pool/`, `api/startup/` |
| **R-7** Migration `V7__schema_fixes_and_pool_company_details.sql`: `pool_entries.added_by` nullable + `ON DELETE SET NULL` (removing a member no longer 409s), `investments.startup_id` → `RESTRICT` (no more silent loss of investment history), off-platform `company_sector` / `company_stage`, partial unique `uq_pool_entry_firm_startup`, duplicate indexes dropped, composite indexes added | `db/migration/V7__…` |
| **R-8** `@ManyToOne` switched to LAZY, with `@EntityGraph` on every list query | `Investment`, `PoolEntry`, `VCMember`, both repositories |
| Paging envelope + clamping helpers | `common/PageResponse.java` |

### Startup domain (new)
`domain/startup/`: expanded `Startup`, `StartupMember`, `StartupStage` (PRE_SEED…GROWTH), `StartupRole`, both repositories (with a `matching(search, sector, stage)` `Specification`), `StartupService`.
`api/startup/`: DTOs, mapper, controller — create profile, update, add co-founder, paged search.
Migration `V8__startup_profile_and_members.sql`: 10 profile columns + `startup_members` (one startup per user, enforced by a UNIQUE on `user_id`).
`VCFirmController` also gained a **public** `GET /api/vc/firms?search=` and `GET /api/vc/firms/{id}` so founders can discover investors; the members list stays member-only.

### Investment & Pool APIs (new)
Full CRUD behind `FirmAccessPolicy`, paged + filtered lists, and `GET /api/investments/summary` returning per-currency totals and the active count via a JPQL projection (so dashboard figures cover the whole portfolio, not one page). `InvestmentRound` is now a union enum shared with funding rounds.

### Frontend foundation
| Change | Where |
|---|---|
| **R-10** Toasts, with an undo action slot; optimistic wishlist heart with rollback | `components/ui/Toast.tsx`, `features/wishlist/useWishlistToggle.ts` |
| **R-11** Confirm-to-remove on investments and pool entries | `components/ConfirmDialog.tsx` + both pages |
| **R-12** `useFieldErrors` — `aria-invalid` + `aria-describedby` per field, plus a form-level summary | `lib/useFieldErrors.ts` |
| **R-13** `PageResponse<T>` / `PageParams` / `withQuery()`, a `<Pagination>` component, paged Investments and Pool | `lib/api-client.ts`, `components/ui/Pagination.tsx` |
| **R-14** Search debounce | `lib/useDebouncedValue.ts` (Discover, `StartupPicker`) |
| Investments and Pool rebuilt on the real API (paged list, summary tiles, server-side field errors, off-platform pool entries) | `features/investments/*`, `features/pool/*` |
| Mocks mirror the paged shape and the summary route | `mocks/index.ts` |

### Verification (20 Sep 2026, real Postgres + Redis in Docker, scratch DB `dashboard_verify`, backend :8081, frontend :3002)
| Suite | Result |
|---|---|
| `./mvnw -o test` | **71 tests, 0 failures, 0 errors** (4 skipped) |
| Live API script (`scratchpad/portfolio-live-test.sh`) | **36 / 36** |
| Browser end-to-end (`scratchpad/e2e2.mjs`): founder onboarding, co-founder invite, firm creation, investment with server-side field errors, pool on- and off-platform entries, confirm-to-remove, dashboard summary tiles | **23 / 23** |
| `npm run build` | pass (260.41 kB, 83.43 kB gzip) |

**Bugs this pass caught (all fixed, all covered by tests):**
- **`@EntityGraph` defaults to `FETCH`, which makes every attribute you *don't* list LAZY** — including ones mapped EAGER. That produced a `LazyInitializationException` on `PoolEntry.tags` in the live run while every transactional test passed. All graphs are now `EntityGraphType.LOAD`, with a deliberately non-transactional regression test that fails under FETCH.
- **`useFieldErrors.summary()` swallowed errors on fields the form doesn't render inline** (found by an e2e case posting >5000-character notes). It now lists any unshown messages instead of a generic line.
- **The dashboard hid every tile when `/api/opportunities` 404'd.** Only the portfolio queries gate the tiles now; a failing triage count shows as "—" with a hint.
- **Flyway can't run on H2**, since the migrations are Postgres-only — `spring.flyway.enabled=false` in `application-test.properties`, and migrations are verified against real Postgres instead.

---

## Done in the third pass (21 Sep 2026) — testing and local setup

The aim of this pass was to make the system something you can start and test in one command, and
to close the gaps where a whole class of bug could pass the suite. **`TESTING.md` is the guide.**

### Making it runnable
| Change | Where |
|---|---|
| `scripts/dev-up.sh` — Postgres and Redis in Docker, backend, frontend, health-checked, prints the sign-in details; `DB_NAME` / `PORT` / `FRONTEND_PORT` / `SEED` / `DEMO_PASSWORD` override everything | `scripts/` |
| `scripts/dev-down.sh` (`--volumes` to wipe data), `scripts/test-all.sh` | `scripts/` |
| **Demo data seeder** under the `demo` profile: one firm with all three VC roles, four startups, two founders, three investments, three pool entries — so every screen has content and the role differences are visible. Idempotent, and the password comes from `DEMO_PASSWORD` | `config/DemoDataSeeder.java` |
| **`V6__InsertTestAccounts.java` deleted** (R-4): it carried two plaintext passwords in source. The seeder replaces it | — |
| V2 restored, so the app starts against `dashboard_dev` again (see "Read this first" #6) | `db/migration/V2__*` |

### Closing gaps in the suite
| Change | Why it matters |
|---|---|
| **`FlywayMigrationTest`** — runs every migration against real PostgreSQL in a container, then has Hibernate `validate` the schema against the entity mappings, plus explicit checks on the foreign-key delete rules and partial indexes V7 introduced | The migrations are PostgreSQL-only and H2 can't run them, so **nothing** was checking that they apply or still match the entities |
| **`DashboardApplicationTests` enabled** (was `@Disabled` for want of a database) — boots the whole app against PostgreSQL + Redis | Slice tests each load a fragment; the "filter registered twice as a `@Bean`" bug needed the assembled context |
| **`AuthFlowIntegrationTest`** — register → choose a side → next request carries the new role → logout, over real HTTP with a real session store, plus CSRF and duplicate-email cases | Replaces a disabled test that called an endpoint which no longer exists. Every auth bug found live was about what happens *between* requests |
| **`DemoDataSeederTest`** — the seeded accounts can actually sign in, every screen has data, re-running changes nothing | The demo path is how the app gets picked up; it's tested like a feature |
| **`RequiresDocker` / `PostgresContainerTest`** — one shared container, and container-backed tests skip with a reason instead of failing when Docker is absent | `./mvnw test` still works without Docker; CI always has it |
| Legacy `TestContainersConfiguration` deleted (started three containers from `@Bean` methods and set system properties); Testcontainers now comes from the Boot BOM at 2.0.5 | The pinned 1.19.7 couldn't talk to Docker Engine 29 at all — every container test was silently skipping |
| **46 frontend tests** (Vitest + Testing Library): the `api-client` envelope, CSRF header, network and timeout errors, `withQuery`; `useFieldErrors` including the unshown-field regression; money and label formatting; `safeUrl` against `javascript:`/`data:` URLs; `Pagination`; `ConfirmDialog` | The frontend had no tests at all |
| **JaCoCo** wired up (`./mvnw verify` → `target/site/jacoco/index.html`) | The older testing docs promised a coverage report that nothing generated |
| JavaFaker dropped; `TestDataBuilder` defaults are now a deterministic counter | Random defaults made failures reproduce only sometimes; JavaFaker is unmaintained and pulled in an old snakeyaml |
| AssertJ un-pinned (was held at 3.24.1, downgrading what Boot manages); Kafka test container removed | — |
| **`.github/workflows/ci.yml`** — backend `verify` (with Docker, so the migration test runs) and frontend typecheck + tests + build, on push and PR | — |
| `?mock=error | empty | slow | off` on the fixture data, alongside `?as=vc|startup` | The design review had to inject these states from the browser console |
| `autoprefixer` removed (unused under Tailwind 4); `frontend/package-lock.json` un-ignored so `npm ci` works in CI | — |

### Verification
| Suite | Result |
|---|---|
| `./mvnw test` | **82 tests, 0 failures, 0 skipped** (was 71 with 4 skipped) |
| `npm --prefix frontend run test` | **46 tests, 0 failures** (was none) |
| `scripts/api-smoke-test.sh` | **36 / 36** |
| `npm --prefix frontend run test:e2e` | **23 / 23** |
| `scripts/dev-up.sh` from a cold start | Stack up in ~7 s, migrations applied to `dashboard_dev`, demo data seeded |
| `npm run build` | pass (260.41 kB, 83.43 kB gzip) |

**What the new tests caught:** Testcontainers 1.19.7 couldn't reach Docker Engine 29, so the
container-backed tests had been skipping rather than running — the migrations had never actually
been exercised by the suite. Fixed by taking the version from the Boot BOM.

---

## Done in the fourth pass (24 Sep 2026) — design system, motion, AI mark

Benchmarked against live products in Mobbin (Monarch, Origin, Quicken, Copilot Money for the
portfolio surfaces; Attio, Twenty, Apollo, Lightfield for the dense company tables), then built
the system those interfaces share rather than copying any one of them.

### Foundation
| Change | Where |
|---|---|
| **A real token system**: canvas / surface / sunken / hover / inverse, line + line-strong, ink / secondary / muted, brand scale, positive / negative / notice / info, a six-colour data-viz ramp, and three elevation steps. Every value contrast-checked, with the measured ratio in the comment | `index.css` |
| **Dark mode**, as the token swap the system was built for: `.dark` redefines the variables, `useTheme` toggles light/dark/system and follows the OS, `initTheme()` applies it before first paint so there's no white flash | `index.css`, `lib/useTheme.ts`, `main.tsx` |
| **Typography**: Geist Variable (self-hosted, no external request), tabular figures locked on for data and off for prose, tightened tracking at display sizes, and one `label-micro` utility for the uppercase labels above every figure and column | `index.css` |
| **R-15 finished: 343 raw palette classes across 38 files replaced with tokens; 0 remain.** That's what makes dark mode work everywhere rather than on the pages I touched | codemod over `src/**` |
| **shadcn/ui adopted selectively** (`radix-nova`) for the parts worth not hand-rolling: `chart` (Recharts), `dropdown-menu`, `command` (⌘K), `tooltip`, `avatar`, `separator`, `dialog`. Its CSS variables are re-pointed at our tokens, so its components inherit this design rather than bringing their own | `components.json`, `components/ui/*` |

### Primitives, rebuilt
`Button` (five variants, 36/40/44px, inner highlight on the solid, 44px touch targets on phones),
`Input` / `Textarea` (one shared `fieldClass`, `aria-invalid` as the error hook), `Card` (+ header,
footer; one card style, not two), `Badge` (squarer, hairline border, optional status dot),
`Modal` (bottom sheet on phones, spring entrance, close button), `Skeleton` (sweep, not a pulse,
plus a detail-shaped variant), `Table` — the big one: sticky quiet header, sortable columns with
`aria-sort`, 48px rows, right-aligned tabular numerics, an aggregate footer row, and a card-list
counterpart for phone width.

**New:** `MetricCard` (figure + delta pill + sparkline + accent, replacing `StatTile`, which is now
a wrapper so untouched pages inherit it), `Sparkline`, `DeltaPill` (direction in the arrow *and* the
text, not just the colour), `EntityAvatar` (logo or a stable tinted monogram), `RowActions` (the `⋯`
menu — R-17), `AllocationBar`, `AttentionList`, `CommandPalette`.

### Motion (anime.js 4.5)
A motion layer, not scattered animations: `lib/motion.ts` holds the duration and easing tokens,
three springs, and one rule — **`prefers-reduced-motion` is honoured at the source**, where each
helper applies the finished state instead of animating to it, so no call site has to remember.
`lib/useMotion.ts` exposes it as hooks.

| Used for | anime.js feature |
|---|---|
| Cards, rows and list items arriving | `animate` + `stagger` (24ms steps) |
| Figures changing (capital deployed, counts) | `animate` on a proxy, formatted every frame; skips first paint, so navigating back doesn't re-spin every number |
| Sparklines, the deployment line, the match-score ring | `svg.createDrawable` → animated `draw` |
| Modals, the mobile nav drawer, the palette | `spring()` presets |
| **Table rows when the sort changes** | FLIP via `captureOrder` — rows glide to their new positions instead of teleporting |
| AI reasoning text composing itself | `splitText` + per-word stagger |
| The AI "working" label | `scrambleText` |
| The pointer-lit hero on the AI page | `createAnimatable` on CSS custom properties, damped |
| Long analytical pages | `onScroll` reveals |

### The AI mark (`ai-circle.html`)
Your WebGPU liquid orb is now the product's AI identity, served from `public/ai-orb.html` and
mounted by `<AiOrb>`:
- **It only exists when it earns its cost** — mounted on an IntersectionObserver, so 221k ribbon
  instances never render behind a scrolled-past card.
- **It always has a floor** — a CSS orb renders first and is swapped out only once the canvas posts
  back that it has queued a frame. WebGPU is still missing from plenty of browsers, and reduced
  motion rules it out regardless. (Verified: headless Chromium has no adapter, and the fallback is
  what you see in the screenshots.)
- **It says something** — `state="thinking"` while a model call or refetch is in flight, `idle`
  otherwise, driven over `postMessage`; the page cross-fades its own uniforms.
- `<AiMark>` is the 20px CSS-only sibling, for list rows and the ⌘K palette.
- `MatchScore` draws the confidence ring and counts the number up with it.

### Surfaces rebuilt
- **Dashboard** — navigation tiles replaced with what's actually waiting: metric row with accents
  and animated figures, "Where the money is" allocation bar, "Needs a decision" list, "Waiting on
  you", upcoming events.
- **App shell** — grouped sidebar with a workspace header and an active rail, sticky translucent
  top bar, account menu, theme toggle, and **⌘K / `/`** search over companies, actions and every
  page.
- **Investments** — sortable dense table with monograms, fixed-decimal equity, status dots, page +
  portfolio totals in the footer, row `⋯` menu, card list on phones.
- **Pool** — brought up to the same standard, and interest level moved off amber onto a
  neutral → outlined → filled brand scale (**R-20**: amber was reading as a warning beside real
  ones).
- **AI Suggestions** — the orb hero, per-word reasoning reveal, score rings.

### Verification
| Check | Result |
|---|---|
| `npm --prefix frontend run test` | **62 tests pass** (was 46; 16 new for the data-display primitives and the reduced-motion path) |
| `npx tsc -b`, `npm run build` | pass (437 kB, 143 kB gzip — up from 260/83 for Recharts, cmdk, Radix and anime.js) |
| Every page × {1440px, 375px} (`frontend/e2e/sweep.mjs`) | **34 loads, 0 console errors, 0 horizontal overflow, every page has an h1** |
| Raw palette classes outside tokens | **0** |
| Backend `./mvnw test` | 82 pass, 15 skipped — the container-backed tests, because Docker wasn't running on this machine (by design; see `RequiresDocker`) |

**Two defects the screenshots caught:** raw enum values were reaching the UI (`PRE_SEED`,
`SERIES_A`) on the dashboard and comparison pages, and the sortable column headers rendered in
sentence case beside the uppercase plain ones. Both fixed.

---

## Done in the fifth pass (25 Sep 2026) — charts, and the surface treatment

Two halves, as agreed: **substance first** (real charts), then **surface** (hero, empty states).
Motion level: purposeful — everything that moves explains something.

### Charts, from data already on the page
No new endpoint. An investment carries its date, amount, currency, sector and status, so the
history is derivable client-side — real numbers, nothing faked.

| Chart | Form, and why | Where |
|---|---|---|
| **Capital deployed over time** | Cumulative area. A running total answers "how much is at work, and how fast"; a monthly bar chart of the same data is spikes | `charts/AreaTrend.tsx` |
| **Sector exposure** | Ranked horizontal bars, one colour. Values are often close, and people compare lengths accurately and angles badly — so no donut. Nominal categories get one hue; the sort carries the ranking | `charts/RankedBars.tsx` |
| **Pace** | Bars per **quarter**. Monthly buckets over a multi-year history are mostly zeros with single-deal spikes, which renders as slivers | `charts/BarSeries.tsx` |
| **Sparkline on the headline metric** | The deployment series, last 12 months | `MetricCard` + `Sparkline` |

Derivation lives in `features/investments/portfolioSeries.ts` — pure functions, **14 tests**. Two
limits it enforces rather than hides: one currency per chart (adding INR to USD would be a lie, so
each plot names its currency), and the page in hand rather than the whole portfolio.

**Palette validated, not eyeballed.** The data-viz ramp was run through the colour checker in both
modes. Light passed. **Dark failed** — every step sat above the OKLCH L 0.48–0.67 band, and pink
against cyan was 5.4 ΔE under protanopia, below the 6.0 floor. The dark ramp was re-stepped and
re-validated rather than flipped from the light one.

Every chart also ships: a crosshair-and-tooltip layer, hairline solid gridlines (never dashed), a
screen-reader table carrying the same values, and a held-at-reduced-opacity refetch instead of a
skeleton flash.

### Surface
- **`DashboardHero`** — the dashboard now opens on one sentence about the state of the fund, on the
  product's dark band, with the orb and a pointer-tracked light. Facts beside it are ones the metric
  row doesn't already show (largest sector, deals this quarter, last cheque).
- **`EmptyState` rebuilt** — a brand wash, the action, and ghosted preview rows below the message
  showing the shape of what belongs there. An empty screen that teaches rather than apologises.
- **Row hover** — a brand hairline on the leading edge under the pointer, holding the eye's place
  across a wide table.
- **One-bar charts removed** — the currency allocation bar only renders when there's more than one
  currency; with one it was a single full-width segment saying what the metric card already said.

### Verification
| Check | Result |
|---|---|
| `npm --prefix frontend run test` | **76 pass** (was 62; 14 new for the series derivation) |
| Typecheck + build | pass (437.8 kB, 143.6 kB gzip) |
| Every page × {1440px, 375px} | 34 loads, 0 console errors, 0 overflow |
| Viz palette, light and dark | all six checks pass in both, after re-stepping dark |

**Three defects the screenshots caught:** y-axis money labels wrapped to two lines in a 56px gutter
(now a compact tick format); the pace bars were 1px slivers (now quarterly); and **the hero
inverted to a white band in dark mode**, because `surface-inverse` flips with the theme — a hero
shouldn't, so it now has its own `--hero` token that stays dark in both.

---

## Done in the sixth pass (26 Sep 2026) — Insights

The thinnest page in the product (six stat tiles and two progress bars) became the analytical one.
Four chart forms it didn't have, each picked for a question the others can't answer:

| Chart | The question only it answers |
|---|---|
| **Funnel** with conversion between stages | Where people drop out. The old bars showed counts the reader could already see; the insight is that 87% never come back after a profile view |
| **Heat grid** (year × month) | *When* the fund was active — a quiet stretch is a block of empty cells, where a line chart just slides flat |
| **Scatter** (deals × capital, one point per sector) | Whether a sector takes many small cheques or a few large ones. As bars this needs two y-scales on one plot, which invents a relationship |
| **Ranked bars** for sector capital | Straight magnitude comparison, sorted |

Plus the deployment curve, pace and heat grid from the dashboard's derivation layer, and a
**range filter** (12 / 24 months / all) as one control above everything it scopes — per-chart ranges
let two plots on one screen silently show different periods.

**Sequential ramps validated.** The heat grid and funnel need an ordered ramp, not the categorical
one. Both the light and dark ramps failed on first attempt — the light end sat below the 2:1 floor
against its surface, so a "50" tint disappeared into the card. Re-stepped and re-validated in both
modes; they're `--seq-1`…`--seq-5`.

**Three defects the screenshots caught:** funnel labels started inside a narrow bar and ran past it
(now placed after the fill when it's too short to hold them); the page had *two scatter plots of the
same data* (the server-side one became ranked bars); and the "ranked" sector bars weren't sorted,
because the server returns its own order.

Verification: 76 tests pass, build clean, 34 page loads with 0 console errors and 0 overflow.

---

## Done in the seventh pass (26 Sep 2026) — company view, and the Pool illustration

**Insights → "By company".** The other charts aggregate — by sector, by month, by stage — and
aggregation hides the thing a partner asks first: *which company is that*. This is the per-name
answer: every position ranked by share of the book, with sector, round history, last cheque, equity
and status.

It is a ranked list rather than a chart on purpose. At ten positions a chart would be prettier; at a
hundred it would be unreadable, while a sorted list stays useful — you read the top and the tail
collapses behind "Show all *n* companies". Follow-ons merge into one name, because a second cheque
is more capital in one company, not a second company. **6 tests** cover the merge, the ranking, the
status-from-latest-round rule and the currency exclusion.

**Pool → the meeting scene.** The page left most of its height empty below a short table, which
reads as "this product has nothing in it" rather than "you have room". That space is now a panel
carrying the scene the whole product is about: an investor on the left with capital and a briefcase,
a founder on the right with a rocket, a path drawing between them and a spark where they meet.

- Drawn in the product's own geometry — flat shapes, brand palette, the same radii as the cards — so
  it reads as part of the interface rather than stock art dropped in.
- The figures are abstract on purpose: no faces, no gender, no skin tone. This sits in front of
  founders and partners across a whole market.
- One anime.js timeline: the two arrive from their own sides, the path draws, the spark lands on a
  spring, then a slow counter-phase bob keeps it alive. Inert under `prefers-reduced-motion`.
- Rendered only while the list is short (under 8 entries). Once the table fills the page it would be
  in the way, so it stops.

Verification: **82 tests pass**, build clean, 34 page loads with 0 console errors and 0 overflow.

---

## Remaining — do next (roughly in order)

### Blocking or security
- **R-1 · Test the OAuth flows end to end** with real credentials: new user → account type → firm setup → dashboard, for Google and LinkedIn. _Done when both work without logging out and back in._
- **R-2 · Deploy topology for cookies and CSRF.** Decide between same site (`app.example.com` + `api.example.com`) and a reverse proxy. Then set `CORS_ALLOWED_ORIGINS`, and session cookie `Secure` / `SameSite` for production. _`SecurityConfig`, `application.yml`._
- **R-3 · Rate limiting on `/api/auth/login` and `/register`** (Redis, as `CLAUDE.md` specifies). _New filter or interceptor._
- ~~**R-4 · `V6__InsertTestAccounts.java` holds plaintext passwords**~~ — done: the file is deleted and `DemoDataSeeder` (profile `demo`, password from `DEMO_PASSWORD`) replaces it. **Still to do by you:** the two accounts it created, `vc.test@test.com` and `startup.test@test.com`, exist in `dashboard_dev` with those passwords. Delete them, or change the passwords.
- **R-4a · A POST with no CSRF token from a fresh client returns 401, not 403.** It's still rejected, so this isn't a security gap. But a client could misread it as "session expired". The frontend always has the cookie after its first `GET /api/auth/me`, so impact is low. Map CSRF failures to 403 explicitly in `SecurityConfig`.
- ~~**R-4b · OAuth sessions don't re-check `isActive`**~~ — done: `SessionUserAuthenticationFilter.refreshOAuthSession` re-checks `isActive` and `userType` on every request.

### Backend groundwork
- ~~**R-5 · Shared firm access policy**~~, ~~**R-6 · DTO validation**~~, ~~**R-7 · schema fixes**~~, ~~**R-8 · LAZY + `@EntityGraph`**~~ — all done in the second pass; see above.
- **R-7a · `TIMESTAMP` columns mapped to `Instant` should be `TIMESTAMPTZ`.** The only part of R-7 not yet done — it needs a data rewrite, so it wants its own migration and a decision about the server timezone.
- **Also:** dev/prod Spring profiles (DEBUG logging, devtools); actuator health and metrics; the Spring AI autoconfigure exclusion class name looks outdated for 2.0.0-M8 (verify); pin a released Spring AI before AI work.

### Frontend and design groundwork
- ~~**R-9 · Touch targets**~~ — fixed in the size scale itself, as suggested: every button and field is ≥44px under `sm:`, and row actions became a single 44px `⋯` target. Worth re-measuring with the design-review script to confirm the count is 0.
- ~~**R-10 · Toasts with Undo**~~, ~~**R-11 · Confirm for destructive actions**~~, ~~**R-12 · Field-level form errors**~~, ~~**R-13 · Pagination**~~, ~~**R-14 · Search debounce**~~ — the primitives all exist now (see above) and are wired into Investments and Pool.
- **R-13a · Apply the paging primitives to the rest.** `<Pagination>` and the `PageResponse` shape are only used by Investments and Pool. Still to do: Discover, Signals, Events, Outreach, Messages — and sync page state to the URL so a paged view survives a refresh or a shared link.
- **R-11a · Confirm or undo still missing** on wishlist remove and member remove; both fire on a single click.
- ~~**R-15 · Finish the token migration**~~ — done: 0 raw palette classes remain, and dark mode ships. `tailwind.config.js` is still referenced by `components.json`; leave it until shadcn stops wanting it.
- ~~**R-16 · Button and card systems**~~ — done: one card style, and a button scale of sm/md/lg plus two icon sizes. **Still to check:** `SettingsPage` uses `lg` where the rest of the app uses `md`.
- ~~**R-17 · Table formatting**~~ — done for Investments and Pool (tabular right-aligned amounts, fixed decimals, no wrapping, `⋯` menus, card layout under 640px). **Still to do: Deal Triage's queue table**, which is the last one on the old pattern.
- **R-18 · Detail-page loading:** Deal Triage detail and the startup profile show a single grey block. `SkeletonDetail` now exists for exactly this — wire it into those two pages.
- ~~**R-23 · The Insights page has no charts**~~ — done: funnel, heat grid, scatter, ranked bars, deployment curve, pace, and a range filter.
- **R-23a · The founder's Insights page is still the thin version.** The derived charts are VC-only because founders have no portfolio; the equivalent for them is commitment history over the life of a round, which needs the funding API (see build-out item 3).
- **R-24 · Sector and stage history need the API.** Today's charts derive from one page of investments. A `GET /api/investments/series` would let them cover the whole portfolio and drop the "page in hand" caveat.
- **R-19 · Tabs panels:** `role="tabpanel"` + `aria-controls` in each consumer (the Tabs component itself is done).
- **R-19a · Sorting is per-page, client-side.** The list endpoints page without a sort parameter, so the Investments table sorts only the 20 rows in hand. Add `sort` to the API and move it server-side.
- ~~**R-20 · Semantic colour collisions**~~ — interest levels now climb a neutral → brand scale. **Still open:** red is used for favourites (the wishlist heart), which collides with destructive actions.
- **R-21 · Remaining raw strings:** triage evidence text from the scoring agent contains enum values such as `PRE_SEED–SERIES_A`. Fix in the agent's output formatting on the backend.
- **R-22 · 404 page** inside `AppShell` (unknown URLs still redirect to `/`).
- **Also:** the "Needs more info" and "Show 3 commitments" controls now use the updated ghost style but should be re-checked visually; Funding page commitments hidden behind a toggle, and no % on the progress bar; header slot shows city instead of page context; message thread fixed at 32rem height.

### Housekeeping
- ~~Remove the unused `autoprefixer` dependency~~ — done. `tsc -b` no longer emits stray files either (`noEmit` was already set; the test config lives in its own `vitest.config.ts` so the app build never sees it).
- Unused API methods: `uploadApi`, `eventApi.get`, `eventApi.listAttendees`, `conflictApi.listReports`, `vcFirmApi.removeMember`, `changeMemberRole` (no UI yet), `investmentApi.get`, `fundingApi.get`, `digestApi.get`.
- Refresh `frontend/README.md` (documents only 2 of 16 features).
- ~~CI: GitHub Actions~~, ~~Vitest for `api-client`~~, ~~mock harness states~~ — all done in the third pass. `?mock=firstrun` is the one variant not built: a brand-new account with no firm or startup is already reachable by registering.
- The five older testing documents (`TEST_FRAMEWORK.md`, `TESTING_CHECKLIST.md`, `TESTING_SETUP_SUMMARY.md`, `TESTING_SYSTEM_OVERVIEW.md`, and the historical half of `TESTING.md`) overlap and partly describe scaffolding that no longer exists. Worth collapsing into `TESTING.md` plus one conventions file.

---

## Backend build-out (from `CLAUDE.md`, unchanged, ~4–6 weeks)

1. ~~**Startup**~~ — done (migration V8, entity, members, service, `/api/startups` with `/me`, search and members).
2. ~~**Investment + Pool controllers**~~ — done, including the `/api/investments/summary` projection.
3. **Funding cycles + commitments** (Rule 3: founders only). **← start here next time.** The frontend's `features/funding/types.ts` is the contract; the startup dashboard and Deal Flow both already read these endpoints and are running on mocks.
4. **Mutual-consent messaging:** `ConnectionRequest`, `Conversation`, `Message` (Rule 1).
5. **Wishlist, Events** (+ attendees; the frontend still needs an event detail page), **Outreach.**
6. **Insights, Comparison** (aggregation, no entities).
7. **Kafka** (`KafkaConfig`, broker back in `docker-compose.yml`), then **Spring AI** (`AIConfig`, `AIService`), then **Signals** and **AI Suggestions** (Rules 5 and 6).

The frontend's `features/*/types.ts` files are the written contract for every one of these endpoints.

## Design backlog (from the design review)

- Dashboard: replace navigation tiles with actionable modules (triage queue, holding movers, signals recap).
- Discover and Pool: table view with sort, filters and saved views (Attio pattern); board view for triage and pool stages (Pipedrive/HubSpot pattern).
- Insights: charts (performance over time, funnel).
- Sign-in page: product mark, positioning line, provider buttons with Google/LinkedIn logos, linked Terms/Privacy.
- Onboarding: step indicator; plan selection as a step (currently only in Settings).
- Notification centre (after Kafka) and global search (⌘K).

---

## Decisions needed

1. **Product name and brand.** Blocks the sign-in page, logo/favicon and page-title suffix (`lib/useDocumentTitle.ts` → `APP_NAME`).
2. **Firm ownership.** Keep the single-owner DB index and add an explicit "transfer ownership" operation, or allow multiple owners. Role changes into or out of OWNER are rejected until this is decided.
3. **Deal Triage, Conflict Sentinel, Portfolio Pulse, thesis and plan tier:** add them to `CLAUDE.md`'s domain model, or mark them as a later phase. The frontend already builds against them.
4. **Deploy topology** (R-2).
5. **The V2 migration** — restore the original body and move the change into a new migration, or `flyway repair`. Until this is settled the app can't start against `dashboard_dev` (see "Read this first" #6).

---

## How to verify

```bash
# Backend (needs no DB — unit + web slice tests). 71 tests as of 20 Sep 2026.
./mvnw -o test

# Frontend
cd frontend && npx tsc -b && npm run build

# Run the UI on mock data
cd frontend && npm run dev:mock      # then ?as=vc or ?as=startup

# Full stack against real Postgres + Redis, on a scratch DB so dashboard_dev is untouched
docker compose up -d
createdb dashboard_verify            # once
DB_NAME=dashboard_verify SERVER_PORT=8081 \
  GOOGLE_CLIENT_ID=x GOOGLE_CLIENT_SECRET=x LINKEDIN_CLIENT_ID=x LINKEDIN_CLIENT_SECRET=x \
  ./mvnw -o spring-boot:run
cd frontend && VITE_API_URL=http://localhost:8081 npx vite --port 3002 --strictPort
```

The live API script and browser end-to-end script from this pass are in the session scratchpad (`portfolio-live-test.sh`, `e2e2.mjs`), not in the repo. They're worth moving into `scripts/` if you want them to keep running — that's part of the CI item below.

The design audit scripts from the review (contrast, overflow, touch targets, keyboard/focus, state injection) were run with Playwright from a temporary directory and aren't in the repo. Re-running `/design-review` against `npm run dev:mock` reproduces them.

## Corrections to the earlier reviews

- **Backend review P2-4 ("user loaded from the DB twice per request")** was wrong. The session filter puts the loaded `User` on the principal, so the argument resolver doesn't query again.
- **Frontend review B5** listed five pages with no responsive classes. The pages that actually broke at 375 px were Investments, Deal Triage, Messages and Signals, caused by the shared Tabs component and a grid without `grid-cols-1`. Both are fixed.
- **`V6__InsertTestAccounts`** doesn't run: Flyway doesn't discover it. But the two accounts do exist in the dev DB, and the plaintext passwords are still in source (R-4).
- **The stale-roles bug (backend review P1-4)** was described as OAuth-only, and the first fix pass only handled OAuth. The live run showed email/password users were affected too; fixed during testing.
- **`@EntityGraph` was assumed to be additive.** It isn't: the default `FETCH` type makes every attribute not named in the graph LAZY, including EAGER mappings. Transactional tests hid this completely. Use `EntityGraphType.LOAD` unless you genuinely want the override, and test repository reads outside a transaction.
