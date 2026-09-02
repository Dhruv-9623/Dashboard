# Frontend Setup — Build Alongside Backend, Establish the Hand-in-Hand Pattern

## Context

Backend so far (verified by reading the actual source, not just the earlier plan): `common/` foundation, `domain/user`, `domain/vc` (full), `domain/startup` (minimal), `domain/investment` and `domain/pool` (service + repo layer only — **no REST controllers yet**). Only two controllers exist: `AuthController` (`/api/auth/me`, `/api/auth/account-type`) and `VCFirmController` (firm CRUD + member management). Auth is session-cookie based (Spring Session + Redis), OAuth2 login via Google/LinkedIn, `@PreAuthorize("hasRole('VC')")` gating, everything wrapped in `ApiResponse<T>`.

You want frontend and backend built together from here on, so this phase does two things:
1. Scaffolds the frontend project and wires it to the auth + VC-firm slice that actually exists today (the only complete vertical slice).
2. Fixes one backend bug that only surfaces once frontend is a separate origin: the OAuth2 success redirect.
3. Sets the standing convention for every feature after this one: **a feature isn't done until its controller and its screen exist together**, so Investment/Pool (which currently have no API layer) become the first test of that convention right after this scaffold lands — not something silently deferred.

---

## Backend fix required (small, do this first)

`OAuth2LoginSuccessHandler.onAuthenticationSuccess` currently does:
```java
response.sendRedirect("/account-type-selection");  // and "/dashboard"
```
These are relative — fine when frontend and backend share an origin, broken the moment frontend runs on `:3000` and backend on `:8080` (Google's OAuth redirect lands the browser back on the backend origin; the relative redirect then keeps it there, at a path the backend doesn't serve).

Fix: inject a configurable frontend base URL and redirect absolutely.
- `application.yml`: add `app.frontend-url: ${FRONTEND_URL:http://localhost:3000}`
- `OAuth2LoginSuccessHandler`: `@Value("${app.frontend-url}")`, redirect to `frontendUrl + "/account-type-selection"` / `frontendUrl + "/dashboard"`

No other backend change needed — CORS already allows `localhost:3000` with credentials, so Vite will run on port 3000 to match rather than editing CORS again.

---

## Frontend scaffold

**Stack**: React + TypeScript + Vite, in `/frontend` at repo root (same repo — matches "hand in hand"), Tailwind CSS + shadcn/ui for components. (Session-cookie dashboard app, no SSR/SEO need; monorepo keeps a firm-CRUD PR and its screen in the same changeset.)

```
frontend/src/
├── app/
│   ├── App.tsx           # router + providers (React Query, auth context)
│   └── routes.tsx
├── features/
│   ├── auth/
│   │   ├── api.ts        # getCurrentUser(), completeAccountType()
│   │   ├── useAuth.ts     # React Query hook wrapping /api/auth/me
│   │   └── AccountTypeSelectionPage.tsx
│   └── vc-firm/
│       ├── api.ts        # createFirm, getFirm, updateFirm, listMembers, addMember, changeMemberRole, removeMember
│       ├── types.ts       # mirrors VCFirmDTO, VCMemberDTO, VCRole exactly
│       ├── CreateFirmPage.tsx
│       ├── FirmDashboardPage.tsx
│       └── MembersPage.tsx
├── components/ui/         # shadcn primitives (Button, Input, Card, Table, Badge)
├── lib/
│   ├── api-client.ts      # fetch wrapper, credentials:'include', unwraps ApiResponse<T>
│   └── query-client.ts
└── routes/
    ├── ProtectedRoute.tsx # redirects to landing if useAuth() unauthenticated
    └── LandingPage.tsx    # "Sign in with Google" -> window.location = `${API_BASE}/oauth2/authorization/google`
```

**Types mirror the backend exactly** (from what I just read):
- `UserDTO { id, email, userType: 'VC'|'STARTUP'|null, isActive, accountSetupComplete }`
- `VCFirmDTO { id, name, description, website, aum, investmentStage, sectors: string[], location, foundedYear, createdAt, updatedAt }`
- `VCMemberDTO { id, userId, userEmail, firmId, role: 'OWNER'|'PORTFOLIO_MANAGER'|'STAFF', joinedAt, createdAt, updatedAt }`
- `ApiResponse<T> { success, data, errorCode, message, timestamp }` — the api-client unwraps this once, throws on `success:false` with `errorCode`/`message` attached so callers can branch on `ErrorCode` values (`VALIDATION_ERROR`, `ENTITY_NOT_FOUND`, `UNAUTHORIZED`, `BUSINESS_RULE_VIOLATION`, `DUPLICATE_OWNER`, `POOL_ENTRY_CONFLICT`, `INVALID_REQUEST`)

**Auth flow, driven by what the backend actually does:**
- Landing page → "Sign in with Google" is a real `<a>`/`window.location` navigation to `http://localhost:8080/oauth2/authorization/google` (must be a full nav, not fetch — it's a redirect-based flow)
- After Google, backend redirects to `http://localhost:3000/account-type-selection` (new user) or `/dashboard` (returning) — per the fix above
- `useAuth()` hook calls `GET /api/auth/me` on mount; three states drive routing: unauthenticated → landing, `accountSetupComplete:false` → account-type-selection, `accountSetupComplete:true` → dashboard
- `ProtectedRoute` wraps `/dashboard/*`, redirects to landing on unauthenticated

**Vite config**: `server.port: 3000`. No dev proxy needed — CORS already permits the direct cross-origin call with credentials, and a proxy would actually complicate the OAuth2 redirect (Google's callback lands directly on the backend origin regardless of any frontend-side proxy, so the proxy wouldn't help that leg anyway).

**Dashboard screens for this phase** (only what has a real API today):
- Create firm form (`POST /api/vc/firms`) — shown if user has no firm yet
- Firm overview page (`GET /api/vc/firms/{id}`, `PUT` to edit)
- Members table (`GET .../members`, add/remove/change-role — owner-only actions hidden/disabled based on the current user's `VCRole`)

---

## The standing convention going forward

Written into `frontend/README.md` and referenced from the root README: **a new feature ships as one unit** — backend controller + DTOs, and the frontend `features/{name}/api.ts` + screen, land together. Concretely, the very next pairing after this scaffold is merged: `InvestmentController` + a pool-entry controller on the backend, paired with `features/investments` and `features/pool` screens on the frontend — since those services already exist but have no UI path today.

---

## Explicitly deferred

- Investment/Pool screens themselves (blocked on those controllers not existing yet — noted above as the next paired unit, not part of this scaffold)
- Production CORS/cookie config for a real split-origin deployment (SameSite=Lax cookies work between `localhost:3000`/`:8080` because they're same-site despite different ports/origins for CORS purposes — that won't hold for real domains later)
- Any state library beyond React Query
- LinkedIn login UI (Google only for this phase's screens; LinkedIn button can be added trivially once Google path is verified working)

---

## Verification

1. `docker-compose up -d && mvn spring-boot:run` (backend on 8080)
2. `cd frontend && npm install && npm run dev` (frontend on 3000)
3. Visit `localhost:3000` → confirm `useAuth()` correctly shows logged-out state (calls `/api/auth/me`, gets 401/unauthenticated, stays on landing)
4. Click "Sign in with Google" → full redirect to Google consent (needs real `GOOGLE_CLIENT_ID`/`SECRET`) → on success, confirm the browser lands back on `localhost:3000/account-type-selection`, not `localhost:8080/...` (this is the specific bug the backend fix addresses — verify it's actually fixed)
5. Select account type → confirm redirect to dashboard, `GET /api/auth/me` now returns `accountSetupComplete:true`
6. Create a VC firm via the form → confirm it appears on the firm dashboard page → add a second member → confirm role-based UI (only OWNER sees remove/role-change controls)
7. `npm run build` — production TypeScript build succeeds with no errors
