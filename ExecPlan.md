# Build Authentication Backend For Drivers And Hosts

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

The plan is maintained in accordance with `PLANS.md` from the repository root.

## Purpose / Big Picture

This work adds a complete authentication backend so the frontend can register and log in drivers and hosts. After this change, the system will expose secure REST endpoints for `/api/drivers/register`, `/api/drivers/login`, `/api/hosts/register`, and `/api/hosts/login`, return JWTs, and allow token validation through profile endpoints. A developer can run the FastAPI server, call the auth endpoints, and observe hashed passwords stored in a local SQLite database, rate-limited requests, and security headers in responses.

## Progress

- [x] (2026-01-15 18:09Z) Created ExecPlan with scope, architecture, and validation steps.
- [x] (2026-01-15 18:24Z) Implemented authentication configuration, database schema, and security utilities.
- [x] (2026-01-15 18:24Z) Added driver/host auth routers with validation, hashing, and JWT issuance.
- [x] (2026-01-15 18:24Z) Added middleware for security headers and rate limiting to auth endpoints.
- [x] (2026-01-15 18:24Z) Updated FastAPI app wiring, OpenAPI docs, and environment defaults.
- [x] (2026-01-15 18:24Z) Implemented unit tests for registration, login, JWT validation, rate limiting, and error responses.
- [x] (2026-01-15 18:29Z) Validated with local test runs and recorded outcomes.

## Surprises & Discoveries

- Observation: Test runs emit a FutureWarning about `google.generativeai` being deprecated.
  Evidence: Pytest output warns to migrate to `google.genai`.

- Observation: SlowAPI triggers a DeprecationWarning for `asyncio.iscoroutinefunction` in Python 3.14.
  Evidence: Pytest output references `slowapi/extension.py:717`.

## Decision Log

- Decision: Use SQLite as the authentication data store instead of JSON files.
  Rationale: SQLite provides real schema enforcement, unique constraints, and transactional safety while remaining self-contained for local development.
  Date/Author: 2026-01-15 (Codex).

- Decision: Use `bcrypt` for password hashing and `PyJWT` for token issuance/validation.
  Rationale: Both are widely used, easy to audit, and align with the explicit requirement to use bcrypt.
  Date/Author: 2026-01-15 (Codex).

- Decision: Add dedicated `/api/drivers/*` and `/api/hosts/*` routers for auth, leaving existing `/api/driver/*` and `/api/host/*` endpoints intact.
  Rationale: The frontend currently consumes the existing routes for station workflows, and the new auth routes need to match the requested naming without breaking existing behavior.
  Date/Author: 2026-01-15 (Codex).

- Decision: Add `/me` endpoints to validate JWTs and return profiles for both roles.
  Rationale: It provides a clear token validation path for tests and frontend integration without changing existing station workflows.
  Date/Author: 2026-01-15 (Codex).

## Outcomes & Retrospective

The backend now supports driver and host authentication with JWT issuance, bcrypt hashing, and SQLite-backed persistence. Auth endpoints are rate-limited, include security headers, and expose `/me` validation routes. Unit tests cover registration, login, duplicate email handling, invalid credentials, token validation, and rate limiting; the suite passes with expected warnings noted above.

## Context and Orientation

The backend is a FastAPI service under `backend/`. The entrypoint `backend/main.py` builds the FastAPI app, registers the existing host and driver routers, and configures CORS. The existing routers live in `backend/app/routers/host.py` and `backend/app/routers/driver.py` and handle station workflows. There is no authentication or database layer today. The frontend lives in `frontend/` and has auth screens in `frontend/src/features/auth/LoginPage.tsx` and `frontend/src/features/auth/RegisterPage.tsx`. Those screens collect `name`, `email`, `password`, and role-specific fields (`vehicleModel` for drivers, `parkingType` for hosts). This plan introduces a local SQLite database at `backend/data/auth.db` (or an override path via `AUTH_DB_PATH`) and adds new auth routers at `/api/drivers` and `/api/hosts` while preserving existing routes.

## Plan of Work

The first change is to add configuration and storage primitives: a config module that loads JWT settings from environment, a database module that initializes SQLite tables for drivers and hosts, and password/JWT helpers. Next, add Pydantic request/response models for driver and host registration and login, plus shared error response shapes. Then create new routers for `/api/drivers` and `/api/hosts` with endpoints for register, login, and profile (token validation) using bcrypt hashing, JWT creation, and clear error handling for invalid credentials or duplicate emails. After that, wire rate limiting (SlowAPI) and security headers, ensuring auth endpoints are rate-limited and include security headers. Update `backend/main.py` to register the new routers and middleware while leaving existing endpoints unchanged. Finally, add unit tests in `backend/tests/` that cover successful registration, login, duplicate email errors, invalid credentials, token validation, and rate limiting, and update `backend/requirements.txt` with the new dependencies.

## Concrete Steps

Run commands from the repository root unless stated otherwise. Use the exact paths below.

1. Add configuration and storage modules:
   - Create `backend/app/config.py` with helpers for database path, JWT settings, and token expiry.
   - Create `backend/app/db.py` with `init_db()`, `get_connection()`, and CRUD helpers for drivers and hosts.
   - Create `backend/app/security.py` for bcrypt hashing and JWT encode/decode helpers.

2. Expand Pydantic models:
   - Update `backend/app/models.py` with driver/host request and response models, plus a shared error detail model.

3. Add authentication routers:
   - Create `backend/app/routers/driver_auth.py` with `/register`, `/login`, and `/me` endpoints.
   - Create `backend/app/routers/host_auth.py` with `/register`, `/login`, and `/me` endpoints.
   - Ensure endpoints return structured error messages, use `bcrypt` hashes, and issue JWTs.

4. Add middleware and rate limiting:
   - Integrate SlowAPI with a `Limiter` in `backend/main.py` and add a `RateLimitExceeded` handler.
   - Add a security headers middleware that only applies to `/api/drivers` and `/api/hosts` routes.

5. Wire the app:
   - Update `backend/main.py` to include the new routers and call `init_db()` during app creation.
   - Add JWT settings to `backend/.env` with clear placeholder values.
   - Update `backend/requirements.txt` with `bcrypt`, `PyJWT`, `slowapi`, and test dependencies.

6. Add tests:
   - Create `backend/tests/test_auth.py` with FastAPI `TestClient` coverage for registration, login, token validation, and rate limiting.
   - Ensure tests use a temporary database path via `AUTH_DB_PATH`.

7. Validate:
   - Run `python -m pytest` from `backend/` and verify tests pass.
   - Run `uvicorn main:app --reload` from `backend/` and confirm auth endpoints respond with JWTs and security headers.

During implementation, the following commands were executed to validate the work (with working directories shown):

  - Repo root: `python3 -m venv backend/.venv`
  - Repo root: `backend/.venv/bin/python -m pip install -r backend/requirements.txt`
  - `backend/`: `../backend/.venv/bin/python -m pytest`

## Validation and Acceptance

Acceptance is demonstrated by running the following checks:

- From `backend/`, run `python -m pytest`. Expect all auth tests to pass (new tests fail before the change and pass after).
- From `backend/`, run `uvicorn main:app --reload`, then:
  - `POST http://localhost:8000/api/drivers/register` with JSON `{ "name": "Driver One", "email": "driver@example.com", "password": "StrongPass123", "vehicle_model": "Tata Nexon EV" }` returns HTTP 201 with a JSON body containing `token.access_token` and `user.email`.
  - `POST http://localhost:8000/api/drivers/login` with the same credentials returns HTTP 200 and a new token.
  - `GET http://localhost:8000/api/drivers/me` with `Authorization: Bearer <token>` returns the driver profile.
  - Responses from `/api/drivers/*` and `/api/hosts/*` include `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` headers.
  - Sending more than the configured login/register requests per minute yields HTTP 429 with a clear error message.

## Idempotence and Recovery

Running the database initialization multiple times is safe because table creation is guarded by `IF NOT EXISTS`. Re-running tests creates a new temporary SQLite database in the test fixture. If a test fails due to a corrupted local `auth.db`, delete `backend/data/auth.db` and re-run initialization; the tables are recreated automatically.

## Artifacts and Notes

Example response structure for login success:

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

Example error response structure for invalid credentials:

  {
    "detail": {
      "code": "INVALID_CREDENTIALS",
      "message": "Invalid email or password."
    }
  }

Recent test summary:

  ============================= test session starts ==============================
  collected 4 items
  tests/test_auth.py ....                                                  [100%]
  ======================= 4 passed, 7 warnings in 2.74s ========================

## Interfaces and Dependencies

The implementation adds the following modules and interfaces:

- `backend/app/config.py`: `get_auth_db_path()`, `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRES_MINUTES`.
- `backend/app/db.py`: `init_db()`, `create_driver()`, `create_host()`, `get_driver_by_email()`, `get_host_by_email()`, `get_driver_by_id()`, `get_host_by_id()`.
- `backend/app/security.py`: `hash_password()`, `verify_password()`, `create_access_token()`, `decode_access_token()`.
- `backend/app/auth_dependencies.py`: `get_current_driver()`, `get_current_host()` token validation dependencies.
- `backend/app/errors.py`: `auth_error()` for standardized error payloads.
- `backend/app/rate_limit.py`: shared SlowAPI `limiter`.
- `backend/app/models.py`: Pydantic models `DriverRegisterRequest`, `DriverLoginRequest`, `DriverPublic`, `HostRegisterRequest`, `HostLoginRequest`, `HostPublic`, `AuthToken`, `ErrorDetail`, and `ErrorResponse`.
- `backend/app/routers/driver_auth.py`: `router` with `/register`, `/login`, `/me` endpoints.
- `backend/app/routers/host_auth.py`: `router` with `/register`, `/login`, `/me` endpoints.

Dependencies to add in `backend/requirements.txt`: `bcrypt`, `PyJWT`, `slowapi`, `email-validator`, `pytest`, `requests`.

Plan Change Note: Initial plan drafted from repo inspection and frontend form fields to align request/response models. (2026-01-15 18:09Z)
Plan Change Note: Marked completed milestones, added `/me` endpoint decision, and documented newly introduced auth helper modules. (2026-01-15 18:24Z)
Plan Change Note: Documented `ErrorResponse` model to match structured error payloads in OpenAPI responses. (2026-01-15 18:26Z)
Plan Change Note: Recorded test execution, warnings, and completion status in progress and outcomes. (2026-01-15 18:29Z)
