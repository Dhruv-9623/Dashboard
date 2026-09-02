# Auth Domain (User)

## Overview

The Auth domain manages user registration, account type selection, and OAuth2 integration with Google and LinkedIn. It's the entry point for both VCs and Startups to access the platform.

## Entities

### `User`
Root entity representing any user on the platform.

**Fields:**
- `id` (UUID) — unique identifier
- `email` — unique email address
- `passwordHash` — nullable (OAuth users have no password)
- `userType` — `VC` or `STARTUP` (nullable on first login before account-type selection)
- `oauthProvider` — "google" or "linkedin"
- `oauthId` — provider's unique ID for the user
- `isActive` — whether the user can log in
- `createdAt`, `updatedAt` — timestamps

**Invariants:**
- Email is unique across all users
- After first OAuth login, `userType` is `null` until the user completes account-type selection
- Once `userType` is set, it cannot be changed

## Key Services

### `UserService`
Handles user lifecycle and OAuth workflows.

**Methods:**
- `findOrCreateFromOAuth(provider, oauthId, email)` — looks up user by OAuth provider + ID; creates a new pending user if not found
- `completeAccountTypeSelection(userId, userType)` — sets the user's account type; idempotent within a single call, but errors if already set
- `findById(userId)` — loads a user by ID
- `getCurrentUser(principal)` — extracts the current authenticated user from the Spring Security principal

**Business Rules:**
1. New OAuth logins create users with `userType == null` to signal "choose VC or Startup"
2. Users cannot skip account-type selection — APIs check `accountSetupComplete` and redirect to the selection screen
3. A user can belong to at most one VC Firm or Startup (enforced at the VC/Startup domain level, not here)

## API Endpoints

### `AuthController`
Thin controller delegating to `UserService`.

**Routes:**
- `GET /api/auth/me` — returns `UserDTO` of current authenticated user; 401 if not authenticated
- `POST /api/auth/account-type` — accepts `{ userType: "VC" | "STARTUP" }`, completes account setup

**OAuth2 Flows:**
- `GET /oauth2/authorization/google` — Spring Security built-in, redirects to Google consent screen
- `GET /oauth2/authorization/linkedin` — Spring Security built-in, redirects to LinkedIn consent screen
- Callback: `/login/oauth2/code/{registrationId}` — Spring Security handles; calls `CustomOAuth2UserService` to load/create user

## Testing

**Unit Tests:** `UserServiceTest.java`
- `testCompleteAccountTypeSelection_Success` — user can set account type once
- `testCompleteAccountTypeSelection_UserNotFound` — error if user doesn't exist
- `testCompleteAccountTypeSelection_AlreadySet` — error if already selected
- `testFindOrCreateFromOAuth_ExistingUser` — returns existing user without creating
- `testFindOrCreateFromOAuth_NewUser` — creates a new pending user on first login

**Manual Testing:**
1. Visit landing page → "Sign in with Google" → complete Google consent
2. Browser redirects to `http://localhost:3000/account-type-selection` (not `:8080`)
3. Select "Venture Capitalist"
4. Browser redirects to `http://localhost:3000/dashboard`
5. `GET /api/auth/me` returns `userType: "VC", accountSetupComplete: true`

## Security

- All OAuth2 tokens are handled server-side; browser never sees them
- Sessions are stored in Redis with `HttpOnly` + `Secure` flags (in production)
- Redirect to account-type-selection happens automatically in `OAuth2LoginSuccessHandler`
- Role-based access (`@PreAuthorize("hasRole('VC')")`) derives from `userType`

## Future Enhancements

- Email-based signup (currently OAuth-only)
- SSO for enterprise VCs
- Two-factor authentication
- Account recovery / password reset
- Profile customization (name, photo, bio) per role
