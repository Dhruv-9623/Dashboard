# Dashboard Frontend

React + TypeScript + Vite frontend for the Dashboard platform.

## Stack

- **Framework**: React 18 + React Router 6
- **Build tool**: Vite 5
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **State management**: React Query (TanStack Query) 5
- **UI components**: Custom shadcn/ui-inspired components built with Tailwind

## Project Structure

```
src/
├── app/               # App shell with router and providers
├── features/
│   ├── auth/         # Authentication (login, account type selection)
│   └── vc-firm/      # VC firm management (create, view, members)
├── components/
│   └── ui/           # Reusable UI components (Button, Card, Input, Badge)
├── lib/              # Utilities (API client, query client, cn())
└── routes/           # Page-level components (Landing, ProtectedRoute)
```

## Features

### Authentication
- OAuth2 login via Google and LinkedIn
- Account type selection (VC or Startup)
- Session-based authentication with automatic redirects

### VC Firm Management
- Create a new VC firm with full details
- View firm profile
- Manage team members (add, remove)
- Role-based access control (OWNER, PORTFOLIO_MANAGER, STAFF)

## Setup

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

**Important**: The backend must be running on `http://localhost:8080` for API calls to work.

### Build

```bash
npm run build
```

Produces optimized bundle in `dist/`.

## API Integration

All API calls go through `lib/api-client.ts`, which handles:
- Automatic credential inclusion (`credentials: 'include'`)
- Error handling and response unwrapping
- TypeScript types mirroring backend DTOs

Backend endpoints consumed:
- `GET /api/auth/me` — current user
- `POST /api/auth/account-type` — complete account setup
- `GET /api/vc/firms/{id}` — firm details
- `POST /api/vc/firms` — create firm
- `GET /api/vc/firms/{id}/members` — list members
- `POST /api/vc/firms/{id}/members` — add member
- `DELETE /api/vc/firms/{id}/members/{memberId}` — remove member

## Environment Variables

- `VITE_API_URL` — Backend API base URL (defaults to `http://localhost:8080`)

## Auth Flow

1. **Landing**: User clicks "Sign in with Google" → redirects to backend OAuth endpoint
2. **Backend**: Google OAuth completes, backend creates pending user (no `userType` yet)
3. **Account Type Selection**: User picks VC or Startup → `POST /api/auth/account-type`
4. **Dashboard**: User is redirected to the dashboard after account setup

Session cookies are stored and sent with every subsequent request.

## Next Steps

This scaffold includes only auth and VC firm management. Next features to add:
- Investment tracking (create, list, view)
- Pool management (add companies, track interest levels)
- Full Startup profile (when startup-side features are ready)

Each new feature should follow the pattern: add backend controller + DTOs, then frontend API layer + screen, landing together in one PR.

## Troubleshooting

**API calls fail with CORS errors**
- Ensure backend is running on `http://localhost:8080`
- Check `app.frontend-url` config in backend's `application.yml`

**Session cookies not persisting**
- Confirm backend `SecurityConfig` has `allowCredentials: true` in CORS
- Check that frontend API client uses `credentials: 'include'`

**OAuth redirect loops**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in backend env
- Confirm backend's `app.frontend-url` is correct (should be `http://localhost:3000`)
