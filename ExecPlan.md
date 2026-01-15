# Integrate Frontend Authentication With Backend

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

The plan is maintained in accordance with `PLANS.md` from the repository root.

## Purpose / Big Picture

This work connects the existing frontend login and registration screens to the backend authentication API so users can create real accounts, sign in, and stay signed in across page refreshes. After this change, a user can register as a driver or host from the UI, receive a JWT issued by the backend, and the frontend will store the session, reload it on refresh via the `/me` endpoints, and show backend error messages when credentials are invalid or an email already exists.

## Progress

- [x] (2026-01-15 18:40Z) Authentication backend implemented with `/api/drivers/*` and `/api/hosts/*` endpoints, JWT issuance, and `/me` profile validation.
- [x] (2026-01-15 19:06Z) Draft frontend integration plan and capture backend request/response shapes.
- [x] (2026-01-15 19:06Z) Added frontend auth service, auth types, and API base configuration.
- [x] (2026-01-15 19:06Z) Updated login/register screens to call backend and surface validation errors.
- [x] (2026-01-15 19:06Z) Updated App auth state to use backend, restore session via `/me`, and clear sessions on logout.
- [x] (2026-01-15 19:06Z) Validated frontend build after auth integration.
- [ ] (2026-01-15 19:06Z) Validate end-to-end flows with backend running (register/login/logout and session restore).

## Surprises & Discoveries

None yet for the frontend integration work.

## Decision Log

- Decision: Store the JWT and role in `localStorage` with an expiry timestamp derived from `token.expires_in`.
  Rationale: This keeps the session across reloads without adding a new backend refresh flow, and the expiry can be checked client-side before calling `/me`.
  Date/Author: 2026-01-15 (Codex).

- Decision: Use the backend `/me` endpoints on app load to validate stored sessions.
  Rationale: It ensures the stored token is still valid and keeps the frontend auth state aligned with the backend.
  Date/Author: 2026-01-15 (Codex).

## Outcomes & Retrospective

Frontend auth integration is now implemented with a dedicated auth service, updated login/register screens, and App-level session handling. The frontend build passes; the remaining work is to validate end-to-end flows against a running backend instance.

## Context and Orientation

The backend FastAPI app lives in `backend/` and exposes auth endpoints in `backend/app/auth/driver.py` and `backend/app/auth/host.py`, mounted at `/api/drivers` and `/api/hosts` by `backend/main.py`. The backend returns JSON shaped like:

- Login/register response: `{ user: { ... }, token: { access_token, token_type, expires_in } }`
- Errors: `{ detail: { code, message } }` or validation arrays from FastAPI.

The frontend lives in `frontend/`. Authentication screens are `frontend/src/features/auth/LoginPage.tsx` and `frontend/src/features/auth/RegisterPage.tsx`. Overall auth state and routing live in `frontend/src/app/App.tsx`. There is no existing auth API client; other frontend API calls read `VITE_API_BASE_URL` (default `http://localhost:8000`). The backend expects register payloads using camelCase aliases: `vehicleModel` and `parkingType` (see `backend/app/models/auth.py`). The backend responses use snake_case (`vehicle_model`, `parking_type`, `created_at`).

## Plan of Work

First, add a frontend auth service in `frontend/src/services/authService.ts` that knows how to call `/api/drivers/*` and `/api/hosts/*`, parse success and error responses, and normalize snake_case payloads into camelCase for frontend use. Include helpers to persist and load the auth session from `localStorage` using a single well-known key.

Next, update `frontend/src/features/auth/LoginPage.tsx` and `frontend/src/features/auth/RegisterPage.tsx` to call the auth service via new async callbacks supplied by `App.tsx`. Replace the simulated `setTimeout` login/register handlers with real requests, and render backend error messages in the UI.

Then, update `frontend/src/app/App.tsx` to manage auth state based on backend responses. It should store sessions after login/register, restore sessions on load by calling `/me`, and clear the session on logout. Keep the existing login intent logic for host access and booking.

Finally, update `frontend/src/vite-env.d.ts` and `frontend/.env.example` to document `VITE_API_BASE_URL`, run the frontend build, and verify the full flow against the running backend.

## Concrete Steps

Run commands from the repository root unless stated otherwise.

1. Add the auth service:
   - Create `frontend/src/services/authService.ts` with `loginUser`, `registerUser`, `fetchProfile`, and session helpers `loadAuthSession`, `storeAuthSession`, and `clearAuthSession`.
   - Normalize backend responses into camelCase and parse error payloads.

2. Update auth UI components:
   - In `frontend/src/features/auth/LoginPage.tsx`, replace the `setTimeout` login simulation with an async submit handler that calls `onLogin` and shows backend errors.
   - In `frontend/src/features/auth/RegisterPage.tsx`, replace the `setTimeout` registration simulation with a real backend call and render any backend errors.

3. Update app auth state:
   - In `frontend/src/app/App.tsx`, add async login/register handlers that call the auth service, persist sessions, and update view mode.
   - Restore sessions on app load by calling `/api/drivers/me` or `/api/hosts/me` based on stored role.
   - Clear stored sessions on logout and reset auth state.

4. Update environment typings:
   - Add `VITE_API_BASE_URL` to `frontend/src/vite-env.d.ts` and `frontend/.env.example`.

5. Validate:
   - Run `npm run build` from `frontend/`.
   - Run `uvicorn main:app --reload` from `backend/` and `npm run dev` from `frontend/`, then register and login from the UI.

## Validation and Acceptance

- From `backend/`, run `uvicorn main:app --reload` and keep it running at `http://localhost:8000`.
- From `frontend/`, run `npm run dev` and open the UI.
- Register a driver (name, email, password, vehicle model). Expect a successful sign-in, and see the frontend switch into the driver view.
- Log out, then register or log in as a host. Expect a successful sign-in and host access.
- Refresh the page after login. Expect the app to remain authenticated (session restored via `/me`).
- If a login fails (wrong password), expect the backend error message to appear on the login form.

## Idempotence and Recovery

These changes are safe to apply repeatedly. If the auth state is corrupted, clear `localStorage` for the `snapcharge.auth` key or use the logout button. If the backend database is reset, register a new account and re-authenticate.

## Artifacts and Notes

Expected login response sample:

  {
    "user": {
      "id": "...",
      "name": "Driver One",
      "email": "driver@example.com",
      "vehicle_model": "Tata Nexon EV",
      "created_at": "2026-01-15T18:00:00Z"
    },
    "token": {
      "access_token": "<jwt>",
      "token_type": "bearer",
      "expires_in": 86400
    }
  }

Expected error response sample:

  {
    "detail": {
      "code": "INVALID_CREDENTIALS",
      "message": "Invalid email or password."
    }
  }

## Interfaces and Dependencies

The frontend integration adds the following interfaces:

- `frontend/src/services/authService.ts`:
  - `loginUser(payload: LoginPayload): Promise<AuthResponse>`
  - `registerUser(payload: RegisterPayload): Promise<AuthResponse>`
  - `fetchProfile(role: AuthRole, token: string): Promise<AuthUser>`
  - `loadAuthSession(): StoredAuth | null`
  - `storeAuthSession(role: AuthRole, token: AuthToken): StoredAuth`
  - `clearAuthSession(): void`

- `frontend/src/types/auth.ts`:
  - `AuthRole`, `LoginPayload`, `RegisterPayload`, `AuthToken`, `AuthUser`, `AuthResponse`, `StoredAuth`

Plan Change Note: Reframed the ExecPlan to cover frontend integration with the existing backend authentication endpoints, including session persistence and UI error handling. (2026-01-15 19:05Z)
Plan Change Note: Marked frontend auth integration tasks complete through build validation and recorded remaining end-to-end validation. (2026-01-15 19:06Z)
