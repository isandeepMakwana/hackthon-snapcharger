# Hackathon Stabilization: Booking Slots, Host Availability, Cleanup

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository includes `PLANS.md` at the repo root. This document must be maintained in accordance with `PLANS.md`.

## Purpose / Big Picture

Drivers should see accurate availability and only book time slots that are free. Hosts should be able to block time slots they don’t want to offer. Bookings should be date-aware so a “10:00 AM” reservation does not block every future day. After this change, the UI disables booked or host-blocked slots, the backend prevents slot conflicts for the selected date, and host stats reflect active bookings for current/future dates. You can see this working by selecting a date, booking a slot, watching it become disabled for that date, and confirming the host dashboard shows the booking while a different date remains available.

## Progress

- [x] (2025-09-21 13:10Z) Drafted ExecPlan for booking/date fixes, host availability, and cleanup.
- [x] (2025-09-21 13:40Z) Added booking date support, slot conflict enforcement, and host stats date filtering.
- [x] (2025-09-21 13:40Z) Added host blocked time slots and merged unavailable slots in driver search responses.
- [x] (2025-09-21 13:45Z) Updated driver UI for date selection, slot blocking, and removed BUSY fallback.
- [x] (2025-09-21 13:55Z) Updated tests, cleaned duplicate helpers, and refreshed docs for new booking fields.

## Surprises & Discoveries

- Observation: Time slots are generated dynamically based on current time, which makes them shift on each request and complicates host availability.
  Evidence: `backend/app/api/routes/driver.py` uses `datetime.now()` in `_generate_time_slots`.

## Decision Log

- Decision: Add a `booking_date` (ISO `YYYY-MM-DD`) to each booking and enforce uniqueness for `(station_id, booking_date, start_time, status)` so only one ACTIVE booking can exist per slot per day.
  Rationale: Time-slot bookings must be scoped to a date to avoid indefinite blocking and to support repeated daily schedules.
  Date/Author: 2025-09-21 / Codex.

- Decision: Keep time slots as fixed daily labels (e.g., 08:00 AM, 09:00 AM …) instead of a rolling window based on “now.”
  Rationale: Host-defined blocked slots and day-based availability require a stable set of time slots to reason about.
  Date/Author: 2025-09-21 / Codex.

- Decision: Add `blocked_time_slots` on stations and return a merged list of booked + blocked slots in driver search results.
  Rationale: The driver UI already consumes search results; adding availability there avoids extra requests and keeps slot logic centralized.
  Date/Author: 2025-09-21 / Codex.

## Outcomes & Retrospective

Time-slot bookings are now date-scoped, conflicts are prevented per day, and host-blocked slots are enforced in the backend and shown in the UI. The driver flow includes a booking date selector, slots disable correctly, and booking errors no longer mark the station BUSY. Tests and docs have been updated to reflect the new booking payload and host availability fields. Remaining work for a future plan includes email verification enforcement and reviews if desired.

## Context and Orientation

The backend is a FastAPI app in `backend/app`. Booking creation lives in `backend/app/api/routes/driver.py` under `/api/driver/bookings`, with SQLAlchemy models in `backend/app/db/models`. Stations are modeled in `backend/app/db/models/station.py` and exposed through `backend/app/models/station.py` with response helpers in `backend/app/api/utils/stations.py`. Host endpoints live in `backend/app/api/routes/host.py` and driver search in `backend/app/api/routes/driver.py`.

The frontend is a Vite + React app in `frontend/src`. Driver booking UI is in `frontend/src/features/driver/DriverView.tsx` and `frontend/src/features/driver/components/StationDetailPanel.tsx`. Host station editing is handled in `frontend/src/features/host/AddStationModal.tsx` and `frontend/src/features/host/HostView.tsx`. API calls are in `frontend/src/services`.

## Plan of Work

First, add booking date support. In `backend/app/db/models/booking.py`, add `booking_date` (string, `YYYY-MM-DD`) and update the table to include it. In `backend/app/models/booking.py` and `backend/app/models/driver.py`, add matching fields in request/response models. Update `/api/driver/bookings` in `backend/app/api/routes/driver.py` to require `booking_date`, check conflicts for that date, and set it on the booking row. Add a uniqueness constraint (or app-level enforcement plus a best-effort unique index where supported) for `(station_id, booking_date, start_time, status)` so only one ACTIVE booking exists per slot per day. Update host stats in `backend/app/api/routes/host.py` to count only ACTIVE bookings for today or later.

Second, add host blocked time slots. Extend `backend/app/db/models/station.py` with `blocked_time_slots` (JSON list, default empty). Expose it in `backend/app/models/station.py` for create/update/out. Update `backend/app/api/routes/host.py` to accept `blocked_time_slots` and persist it. Update `backend/app/api/routes/driver.py` search to merge booked and blocked slots for the requested date and return them in `booked_time_slots` (or a renamed field if needed). Keep `build_station_out` in `backend/app/api/utils/stations.py` flexible to accept the merged list.

Third, update the driver UI to select a booking date and respect availability. In `frontend/src/features/driver/DriverView.tsx`, add a date picker state (default today) and pass it to search and booking requests. Update the slot selection logic to clear or change the selected slot if it becomes unavailable. Update `frontend/src/features/driver/components/StationDetailPanel.tsx` to disable slots that appear in the merged booked/blocked list. Remove the fallback that marks a station BUSY on booking failure so slot-based availability stays accurate.

Fourth, update host UI to manage blocked slots. Fetch time slots (use the driver config for now) and show toggles in `frontend/src/features/host/AddStationModal.tsx` to select blocked slots. Include `blockedTimeSlots` in the payload when creating/updating stations. Update types in `frontend/src/types/index.ts` and ensure the store defaults include the new field.

Finally, update tests and docs. Fix duplicate helper definitions in `backend/tests/test_host.py`. Update booking tests in `backend/tests/test_driver.py` and `backend/tests/test_host.py` to include `bookingDate` and verify conflict behavior per day. Update README docs where environment/setup or expected behavior mentions time slots.

## Concrete Steps

Run from the repository root:

  cd backend
  pytest

Expected output (abridged):

  ...
  collected <N> items
  ...
  N passed in <time>

Then from the repository root:

  cd frontend
  npx jest

Expected output (abridged):

  ...
  <N> tests passed

## Validation and Acceptance

Start backend from `backend/`:

  python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Start frontend from `frontend/`:

  npm run dev

Behavior to verify:

- Driver selects a date and sees time slots; booked/blocked slots are disabled.
- Booking a slot makes that same slot unavailable for the same date but allows bookings on a different date.
- Host sets blocked slots in the station editor and those slots appear unavailable to drivers.
- Host stats show active bookings for today or later, and completed/cancelled bookings are excluded.

## Idempotence and Recovery

If the local SQLite database lacks new columns, delete `backend/snapcharge.db` and restart the backend so tables are recreated. For Postgres, add the new columns via a migration before running the server. These changes are additive and safe to reapply.

## Artifacts and Notes

Example conflict response payload:

  {"error": {"code": "TIME_SLOT_UNAVAILABLE", "message": "Selected time slot is already booked."}}

Example booking payload with date:

  {"stationId": "...", "bookingDate": "2025-01-16", "startTime": "10:00 AM", "userLat": 18.5204, "userLng": 73.8567}

## Interfaces and Dependencies

`backend/app/db/models/booking.py` must include a `booking_date` column and the API must accept `booking_date` in `backend/app/models/driver.py` and `backend/app/models/booking.py` for requests/responses. `backend/app/db/models/station.py` must include `blocked_time_slots` (JSON list). `backend/app/models/station.py` must expose `blocked_time_slots` and `booked_time_slots`. The driver search endpoint must accept a `booking_date` query param and return a merged list of unavailable slots per station.

Update note (2025-09-21): Completed booking/date support, host blocked slots, UI slot blocking, test cleanup, and doc updates for hackathon readiness.
