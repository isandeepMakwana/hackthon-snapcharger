# Add Driver Booking History Page

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

PLANS.md is located at `PLANS.md` from the repository root. This document must be maintained in accordance with that file.

## Purpose / Big Picture

Drivers can already book chargers, but they cannot see a history of what they booked. After this change, a signed-in driver can open a “My bookings” view and see a list of their bookings, including station details, the booking status, and a way to contact the host. The behavior is visible in the UI and backed by a new `GET /api/driver/bookings` endpoint that returns the driver’s bookings.

## Progress

- [x] (2026-01-16 15:58Z) Draft ExecPlan and capture repository context and intended UX for driver booking history.
- [x] (2026-01-16 15:58Z) Implement backend driver bookings endpoint + response model and add backend tests.
- [x] (2026-01-16 15:58Z) Implement frontend driver bookings view, service, and UI integration.
- [ ] (2026-01-16 15:58Z) Validate with backend/frontend tests and update plan evidence (completed: attempted pytest and npx jest; remaining: run tests in configured env with dependencies).

## Surprises & Discoveries

- Observation: `pytest` is not available in the current environment.
  Evidence: `zsh:1: command not found: pytest`
- Observation: Frontend test runner dependencies are missing and there is no `npm test` script.
  Evidence: `npm error Missing script: \"test\"` and `Cannot find module '@testing-library/react'` from `npx jest`.

## Decision Log

- Decision: Implement driver booking history as a new “My bookings” view within the existing Driver experience, toggled via a small tab switch.
  Rationale: Avoids a larger routing refactor while providing a clear, dedicated page-like view for drivers.
  Date/Author: 2026-01-16, Codex
- Decision: Return station image and coordinates in `DriverBookingOut` to support richer booking cards and directions links.
  Rationale: Enables a more informative booking history UI without extra API calls.
  Date/Author: 2026-01-16, Codex

## Outcomes & Retrospective

Delivered a driver booking history API endpoint and UI view with cards, empty/error states, and auth/profile gating. Backend and frontend tests were attempted but could not run due to missing tooling; further validation is needed in a configured environment.

## Context and Orientation

The backend is a FastAPI app under `backend/app`. Driver endpoints live in `backend/app/api/routes/driver.py`, booking models in `backend/app/models/booking.py`, and SQLAlchemy models in `backend/app/db/models/*.py`. Host booking history already exists at `GET /api/host/bookings` and uses `HostBookingOut` in `backend/app/models/booking.py` as the response shape.

The frontend is a Vite + React app under `frontend/src`. Driver UI lives in `frontend/src/features/driver/DriverView.tsx`, which renders the map-based discovery and booking flow. Host UI lives in `frontend/src/features/host/HostView.tsx`, which already renders a booking list. API calls are centralized in `frontend/src/services/*.ts`, and booking types live in `frontend/src/types/booking.ts`.

A “booking history” in this plan means a list of booking records tied to the current driver, each showing station name/location, booking status, the chosen time slot, and a host contact number if available.

## Plan of Work

First, add a new Pydantic response model `DriverBookingOut` in `backend/app/models/booking.py` to describe what the driver booking list returns. Then add a `GET /api/driver/bookings` handler in `backend/app/api/routes/driver.py` that joins bookings with stations (and host users for phone fallback) and returns the driver’s bookings ordered by newest first. Add a backend test in `backend/tests/test_driver.py` that creates a station, books it as a driver, and verifies the list endpoint returns the expected station and host contact data.

Next, add a `DriverBooking` interface in `frontend/src/types/booking.ts` that matches the new API response and a `fetchDriverBookings` helper in `frontend/src/services/driverService.ts` that calls the new endpoint with auth headers. Build a `DriverBookingCard` component under `frontend/src/features/driver/components/` and a `DriverBookingsView` under `frontend/src/features/driver/` that fetches bookings, handles empty/error states, and displays cards. Finally, integrate the view into `DriverView.tsx` with a simple tab switch labeled “Discover” and “My bookings” so drivers can navigate between search and booking history without a routing change.

## Concrete Steps

Run these commands from the repo root unless otherwise noted.

1) Update backend models and routes, then run backend tests:

   - Edit `backend/app/models/booking.py` to add `DriverBookingOut`.
   - Edit `backend/app/api/routes/driver.py` to add `GET /api/driver/bookings`.
   - Edit `backend/tests/test_driver.py` to add a driver booking list test.
   - From `backend/`, run:

       pytest tests/test_driver.py

   Expected: the new test passes along with existing driver tests.

2) Update frontend types, service, and UI, then run frontend tests:

   - Edit `frontend/src/types/booking.ts` to add `DriverBooking`.
   - Edit `frontend/src/services/driverService.ts` to add `fetchDriverBookings`.
   - Add `frontend/src/features/driver/components/DriverBookingCard.tsx`.
   - Add `frontend/src/features/driver/DriverBookingsView.tsx`.
   - Edit `frontend/src/features/driver/DriverView.tsx` to integrate the new view via a tab toggle.
   - From `frontend/`, run:

       npx jest DriverView.test.tsx DriverBookingsView.test.tsx

   Expected: existing driver tests pass after the UI update (requires jest/testing-library dev deps installed).

## Validation and Acceptance

After starting both backend and frontend, log in as a driver and make a booking. In the Driver view, switch to “My bookings” and confirm that the newly created booking appears with the correct station name, location, status, and time slot. The list should be empty for a new driver with no bookings. The API endpoint `GET /api/driver/bookings` should return HTTP 200 with an array of booking objects for the authenticated driver and HTTP 401 when unauthenticated.

## Idempotence and Recovery

All steps are additive and safe to repeat. If a backend test fails, re-run `pytest tests/test_driver.py` after fixing the failing assertion. If a frontend test fails, re-run `npx jest DriverView.test.tsx DriverBookingsView.test.tsx` from `frontend/`. No database migrations are required, and no destructive operations are involved.

## Artifacts and Notes

Test command output snippets:

  - `pytest tests/test_driver.py` -> `zsh:1: command not found: pytest`
  - `npm test -- DriverView.test.tsx` -> `npm error Missing script: \"test\"`
  - `npx jest DriverView.test.tsx DriverBookingsView.test.tsx` -> `Cannot find module '@testing-library/react'`

## Interfaces and Dependencies

Backend additions:

- `backend/app/models/booking.py` defines `DriverBookingOut` with fields: id, station_id, station_title, station_location, station_price_per_hour, station_image, station_lat, station_lng, host_id, host_name, host_phone_number, start_time, status, created_at.
- `backend/app/api/routes/driver.py` adds `GET /api/driver/bookings` returning `list[DriverBookingOut]` and requiring `require_driver_profile`.

Frontend additions:

- `frontend/src/types/booking.ts` defines `DriverBooking` with camelCase equivalents of the backend fields.
- `frontend/src/services/driverService.ts` exposes `fetchDriverBookings(): Promise<DriverBooking[]>`.
- `frontend/src/features/driver/components/DriverBookingCard.tsx` renders one booking.
- `frontend/src/features/driver/DriverBookingsView.tsx` fetches bookings, renders empty/error states, and displays cards.
- `frontend/src/features/driver/DriverView.tsx` adds a tab toggle to switch between discovery and booking history.

## Plan Change Notes

Initial plan created on 2026-01-16 to add driver booking history UI and API.

Updated plan on 2026-01-16 to record implementation progress, testing attempts, and missing tooling/dependencies discovered during validation.
