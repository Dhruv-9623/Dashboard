# Testing the Dashboard

The one testing document: how to run everything, how to write tests, what to check before a PR,
and how sessions and auth are tested. It replaces the older `TEST_FRAMEWORK.md`,
`TESTING_CHECKLIST.md`, `TESTING_SETUP_SUMMARY.md` and `TESTING_SYSTEM_OVERVIEW.md`.

Two commands get you a running, populated app; one command runs everything that doesn't need a
running app.

```bash
scripts/dev-up.sh       # Postgres + Redis + backend + frontend, seeded with demo data
scripts/test-all.sh     # backend tests, frontend typecheck, unit tests, production build
```

`dev-up.sh` prints the sign-in details when it finishes:

| Side | Accounts | Password |
|---|---|---|
| VC | `owner@demo.dashboard.test`, `pm@`, `staff@` — firm "Meridian Ventures" | `Password123!` |
| Startup | `founder@` (Ledgerly), `cofounder@` (Shiprack), `vaultline@` (Vaultline) | `Password123!` |

The three VC accounts are the three roles, so the permission differences are visible by signing in
as each: only OWNER can manage the team, STAFF can't record investments. Override the password with
`DEMO_PASSWORD=…`, skip seeding with `SEED=false`, and stop everything with `scripts/dev-down.sh`.

**Ports in this setup:** backend `8081`, frontend `3002`, Postgres `5433` (Docker, remapped because
a local install owns 5432), Redis `6379`, Adminer `8089`. The running app uses the `dashboard_api`
database; `dashboard_dev` is the unused default. If the machine restarted, start the containers
first: `docker start dashboard-postgres-1 dashboard-redis-1 adminer`.

---

## What to run when

| Command | Needs | What it covers |
|---|---|---|
| `./mvnw test` | Docker (for the container-backed tests) | Backend: services, web slices, security, migrations, full-context boot, the auth flow over HTTP |
| `npm --prefix frontend run test` | — | Frontend unit and component tests (Vitest) |
| `npm --prefix frontend run typecheck` | — | TypeScript across app and tests |
| `npm --prefix frontend run build` | — | Production build |
| `scripts/test-all.sh` | Docker | All four of the above |
| `./mvnw verify` | Docker | The above plus a coverage report at `target/site/jacoco/index.html` |
| `scripts/api-coverage-test.sh` | A running backend on the `demo` profile | Every endpoint the frontend calls is mapped, plus the rules around them: tenancy, role gates, seat limits, past-dated events, digests, mutual-consent chat |
| `scripts/api-smoke-test.sh` | A running backend | API checks: tenancy, role gates, validation, paging, summary totals |
| `scripts/funding-smoke-test.sh` | A running backend | Rounds and commitments: who may open and pledge, commitment visibility between rival firms, ticket and currency guards |
| `npm --prefix frontend run test:e2e` | A running stack | Browser checks through the real UI |
| `npm --prefix frontend run dev:mock` | — | The UI on fixture data, no backend |
| `node frontend/e2e/sweep.mjs` | A running app | Loads every page at 1440px and 375px; reports console errors, horizontal overflow and missing `h1`s |
| `node frontend/e2e/shoot.mjs <url> <out.png>` | A running app | A screenshot, for looking at a change rather than guessing |

Run one backend test with `./mvnw test -Dtest=UserServiceTest` (or `#method`).

**Docker is optional.** Tests marked `@RequiresDocker` skip themselves with a clear reason when no
daemon is reachable, so `./mvnw test` still passes without Docker — it just proves less. CI always
has Docker, so the migrations are always checked there.

---

## The end-to-end suites write to a real database

`api-coverage-test.sh`, `api-smoke-test.sh` and the browser suite register accounts and create
firms, startups, investments and pool entries. They are safe to re-run (every run uses timestamped
email addresses) but they leave rows behind. Point them at a scratch database, not the one you
demo from:

```bash
scripts/dev-down.sh
DB_NAME=dashboard_scratch PORT=8081 FRONTEND_PORT=3002 scripts/dev-up.sh

API_URL=http://localhost:8081 scripts/api-smoke-test.sh
APP_URL=http://localhost:3002 API_URL=http://localhost:8081 npm --prefix frontend run test:e2e
```

`api-coverage-test.sh` takes `DB_NAME` too and deletes what it created on the way out. The browser
suite needs Chromium once: `npm --prefix frontend exec playwright install chromium`.

`sweep.mjs` and `shoot.mjs` point at `APP_URL` (default `http://localhost:3100`) and don't write
any data, so they are safe against the mock server:

```bash
npm --prefix frontend run dev:mock -- --port 3100
node frontend/e2e/sweep.mjs
node frontend/e2e/shoot.mjs "http://localhost:3100/dashboard?as=vc" /tmp/dash.png
```

When calling the API with `curl`, state-changing requests need the CSRF pair: read the
`XSRF-TOKEN` cookie from any earlier response and send it back as the `X-XSRF-TOKEN` header.

---

## Testing the states that are hard to reach

On fixture data (`npm --prefix frontend run dev:mock`), the URL controls both the user and the
condition of the API:

| URL | Effect |
|---|---|
| `?as=vc` / `?as=startup` | Which side you're signed in as |
| `?mock=error` | Every call fails with a 500 — checks error cards and retry |
| `?mock=empty` | Every list comes back empty — checks empty states |
| `?mock=slow` | Four-second responses — checks skeletons and disabled buttons |
| `?mock=signedout` | Refuses the session — the landing and sign-in screens, with no backend |
| `?mock=off` | Back to normal |

Dark mode is stored in `localStorage` under `dashboard-theme` (`light` / `dark` / `system`), so a
test can set it before load; the toggle is in the top bar. Auth and profile calls keep working in
every mock mode, so the page you want to look at still renders.

---

## How the backend suite is organised

| Layer | Example | Runs against |
|---|---|---|
| Service unit tests | `InvestmentServiceTest`, `EventServiceTest` | Mockito, no Spring |
| Repository tests | `PortfolioRepositoryIntegrationTest` | H2, schema from the entities |
| Web slice tests | `PortfolioApiWebTest`, `SecurityConfigWebTest` | MockMvc, mocked services |
| Migration test | `FlywayMigrationTest` | **Real PostgreSQL** in a container |
| Full-context tests | `DashboardApplicationTests`, `AuthFlowIntegrationTest`, `DemoDataSeederTest` | **Real PostgreSQL + Redis** in containers |

Aim for roughly 80% unit tests and 20% integration tests. Test behaviour, not implementation.

Two things are worth knowing about the split:

- **The migrations use PostgreSQL-only syntax** (partial unique indexes, named foreign-key
  changes), so they cannot run on H2. Flyway is therefore off for the H2 tests, and
  `FlywayMigrationTest` is the only check that the migrations apply — and, through
  `ddl-auto=validate`, that the resulting schema still matches the entity mappings. **Adding a
  migration means adding its version to the expected list in that test.**
- **Repository reads should also be tested outside a transaction.** An `@EntityGraph` with the
  default `FETCH` type makes every attribute it doesn't name lazy, which passed every transactional
  test and then failed in the browser. `PortfolioRepositoryIntegrationTest` has a deliberately
  non-transactional case for this.

There is no Kafka container: nothing in the codebase produces or consumes yet.

### Base classes and test data

- `BaseUnitTest` — Mockito extension, no Spring context, readable names (`snake_case` →
  sentence). Use for service tests.
- `BaseIntegrationTest` — full Spring context on the `test` profile (H2 by default). Use for
  repository tests; for web tests prefer `@WebMvcTest` / `@AutoConfigureMockMvc`.
- `@RequiresDocker` — skips a test when no Docker daemon is reachable.
- `TestDataBuilder` — `TestDataBuilder.user().withEmail("a@b.test").build()`; also `vcFirm()`,
  `startup()`, `investment()`, `fundingCycle()`, `event()`. Defaults are unique but deterministic
  (a counter, not a random generator), so a failure reproduces. There is no JavaFaker.

### Writing a unit test

```java
class UserServiceTest extends BaseUnitTest {
    @Mock private UserRepository userRepository;
    @InjectMocks private UserService userService;

    @Test
    void should_reject_duplicate_email() {
        // Arrange
        User existing = TestDataBuilder.user().withEmail("taken@example.com").build();
        when(userRepository.findByEmail("taken@example.com")).thenReturn(Optional.of(existing));

        // Act + Assert
        assertThatThrownBy(() -> userService.registerWithEmailPassword("taken@example.com", "pass"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("email already in use");
    }
}
```

Mockito runs in strict mode: a stub a test never uses fails it with `UnnecessaryStubbing`. Shared
`setUp` stubs that only some tests use need `lenient()`.

### Writing a web test

```java
@Test
@WithMockUser(roles = "OWNER")
void should_return_401_when_unauthenticated() throws Exception {
    mvc.perform(get("/api/users/profile")).andExpect(status().isUnauthorized());
}
```

Responses come back in the `ApiResponse<T>` envelope, so assert on `$.data.…`. Error mapping to
remember: business-rule violation → 409, validation → 400, unauthorised → 403, not found → 404.

### Conventions

- **Names:** `should_{expected}_when_{condition}`; classes `{Thing}ServiceTest`,
  `{Thing}RepositoryIntegrationTest`, `{Thing}ControllerIntegrationTest`.
- **Arrange / Act / Assert**, one logical assertion per test, AssertJ (`assertThat`,
  `assertThatThrownBy`) rather than JUnit's `assertEquals`.
- **Use builders**, never hand-built entities with hard-coded IDs.
- **Mock only external dependencies** (repositories, clients), never the class under test.
- **Assert contract, not calls:** check results and state rather than `verify(repo).save(...)`,
  unless the call is the behaviour (an email sent, an event published).
- **No `LocalDateTime.now()` or unseeded randomness** in assertions — inject the `Clock` or use
  fixed dates, so tests don't flake around midnight or in a different timezone.
- **Don't test the framework:** Spring wiring, JPA mapping, getters and setters.
- Give each new suite a class-level Javadoc saying what it covers and why any setup is non-obvious.

### Coverage

| Layer | Target |
|---|---|
| Service | 80%+ |
| Repository (custom queries) | 75%+ |
| Controller | 70%+ |
| Mapper / DTO | 60%+ |
| Utility | 90%+ |

`./mvnw verify`, then open `target/site/jacoco/index.html`.

---

## Before you open a PR

- [ ] A bug fix starts with a failing test that reproduces it; a feature has tests for the happy
      path, validation failures, edge cases (empty, null, boundaries) and each error path.
- [ ] **Services:** every public method, rejected inputs with the right exception and message.
- [ ] **Repositories with custom `@Query`:** empty, single and many results; filtering, sorting,
      paging; relationships read outside a transaction.
- [ ] **Controllers:** 200/201 happy path, 400 invalid body, 401 unauthenticated, 403 wrong role,
      404 missing, 204 on delete; response shape.
- [ ] **New migration:** added to `FlywayMigrationTest`, and never edit one that has already run
      (put the change in a new migration).
- [ ] **Business rules** (mutual consent, owner-only team changes, seat limits, signed-only totals)
      have a test that would fail if the rule were removed.
- [ ] `scripts/test-all.sh` passes; for API changes, `scripts/api-coverage-test.sh` too.
- [ ] Tests are independent — run alone and in any order — and not flaky (run them a few times).
- [ ] Anything visible in the UI was looked at in the browser, not only type-checked.

When reviewing someone else's tests, ask: does the name say what's checked, is the data built with
builders, does it fail if the behaviour breaks, and would the failure message tell you why?

If a test fails: read the error, run it alone (`-Dtest=Class#method`), check the stubs and test
data, look for time or ordering dependence, then check what changed recently.

---

## If something doesn't start

| Symptom | Cause |
|---|---|
| Nothing loads on `localhost` | Docker stopped (e.g. after a restart). Start Docker Desktop, then `docker start dashboard-postgres-1 dashboard-redis-1 adminer`, then the backend and frontend. |
| `Backend didn't start` | Read `.dev/backend.log`. Usually a port in use or Postgres not ready. |
| Flyway checksum mismatch | A migration that already ran was edited afterwards. Put the change in a new migration instead. |
| Container-backed tests all skip | Docker isn't running. |
| Port already in use | `scripts/dev-down.sh`, or run on other ports with `PORT=` / `FRONTEND_PORT=`. |
| Tests pass locally, fail in CI | Timezone (`export TZ=UTC`), a port conflict, or an environment variable the build expects. |

OAuth (Google, LinkedIn) still needs real credentials exported before `dev-up.sh`; the demo
accounts are email and password only.

---

## Auth and sessions: how they work and how to test them

Last verified end to end on 16 Aug 2026; the route and session design below has not changed since.
Ports in the original notes (8080) have since moved to 8081.

### Two sign-in paths

1. **OAuth2 (Google / LinkedIn)** — production. Redirect to `/oauth2/authorization/google` →
   `CustomOAuth2UserService` loads or creates the user → `OAuth2LoginSuccessHandler` redirects to
   `/account-type-selection` or `/dashboard`.
2. **Email + password** — dev testing and the demo accounts. `POST /api/auth/register` or
   `/api/auth/login` → `AuthController.establishSession()` → BCrypt-verified user.

### How a session survives between requests

Spring Session keeps sessions in Redis (`namespace: dashboard:session`). Serialising the whole
`SecurityContext` failed, so `establishSession()` stores **only the user id** (a UUID string) in the
session. On each request `CurrentUserArgumentResolver` resolves `@CurrentUser` from the
authenticated principal (OAuth) or, failing that, loads the `User` fresh from the database using the
session's `userId`. This keeps the stored value trivially serialisable, always current, and shared
across instances.

Two behaviours that must stay true:

- An unauthenticated `GET /api/auth/me` (and `POST /api/auth/account-type`) returns **401**, not a
  500 from a null user.
- A session created at registration is usable on the very next request (it was once lost before
  reaching Redis).

### Manual checklist

Run through this after touching auth, sessions or role handling:

| # | Check | Expect |
|---|---|---|
| 1 | `GET /api/auth/me` with no cookie | 401 |
| 2 | Register a new user | 200 with user data |
| 3 | `GET /api/auth/me` with the same cookies | 200 (session persisted) |
| 4 | `POST /api/auth/account-type` `{"userType":"VC"}` | 200, `userType=VC` |
| 5 | `GET /api/auth/me` again | role still `VC` |
| 6 | VC creates a firm | 200/201 |
| 7 | Startup user hits a VC-only endpoint | 403 |
| 8 | `POST /api/auth/logout`, then `GET /api/auth/me` | 401 |

In the browser: register → choose account type → dashboard; refresh the page and stay signed in;
log in again and skip account-type selection; two different roles in two private windows stay
independent; only OWNER can add team members.

### Debugging auth

| Symptom | Likely cause |
|---|---|
| Login returns 401 with the right password | The stored hash is from a different password. Delete the user row and re-register. |
| "Not authenticated" right after registering | The session didn't reach Redis. Check the Redis connection and `spring.session.store-type: redis`. |
| `/api/auth/me` returns empty values | The session's `userId` doesn't match a row in `users`. Inspect the key in `redis-cli`. |
| CORS error from the frontend | The frontend origin isn't in `SecurityConfig`'s allowed origins. |
| 403 on every POST from `curl` | Missing the `XSRF-TOKEN` → `X-XSRF-TOKEN` pair (see above). |

For more detail, set `logging.level.org.springframework.security=DEBUG` and watch for
`Session established for user`, `Authorization denied` and CORS preflight lines.

### Known gaps (intentional, for later)

Rate limiting and lockout on login, password reset, email verification, stronger password rules,
session timeout policy, HTTPS-only cookies, OAuth/password email linking, MFA.

---

## Related files

- Auth: `AuthController`, `CurrentUserArgumentResolver`, `AuthenticatedUserPrincipal`,
  `UserService`, `SecurityConfig`, `CustomOAuth2UserService`, `OAuth2LoginSuccessHandler`
- Config: `application.yml` (session, database, CORS, OAuth), `docker-compose.yml` (Postgres, Redis)
- Test support: `src/test/java/.../config/` (base classes, `@RequiresDocker`),
  `src/test/java/.../testdata/` (builders), `src/test/resources/application-test.properties`
- Scripts: `scripts/` (`dev-up.sh`, `dev-down.sh`, `test-all.sh`, the three API check scripts),
  `frontend/e2e/`
