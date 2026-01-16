# Persist Host Availability + Backfill Booking Timestamps

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository includes `PLANS.md` at the repo root. This document must be maintained in accordance with `PLANS.md`.

## Purpose / Big Picture

Hosts can define which time slots are available for their stations and those choices must be saved and returned to drivers. Existing bookings created before `start_at/end_at` were introduced should no longer block availability forever or inflate host stats. After this change, saving a station keeps `available_time_slots` in the database, driver search respects those slots, and legacy bookings get timestamps or are expired so slot blocking is accurate. You can see this working by editing a station’s available slots, reloading the host page, and observing the same availability in driver search for that station, while old bookings no longer count as active after their intended time passes.

## Progress

- [x] (2025-09-21 14:55Z) Created the ExecPlan document and recorded baseline context.
- [x] (2025-09-21 15:02Z) Persisted `available_time_slots` from the host UI payload to the backend.
- [x] (2025-09-21 15:02Z) Ensured the host modal initializes with the latest `timeSlots` once they load.
- [x] (2025-09-21 15:05Z) Backfilled `start_at/end_at` for legacy bookings and expired past bookings safely.
- [ ] Validate behavior manually and document verification steps.

## Surprises & Discoveries

None yet.

## Decision Log

None yet.

## Outcomes & Retrospective

Pending.

## Context and Orientation

The backend is a FastAPI service in `backend/app`. Bookings live in `backend/app/db/models/booking.py`, and `backend/app/api/utils/bookings.py` contains the expiration helper used in driver search and host stats. Stations are stored in `backend/app/db/models/station.py` and exposed via Pydantic models in `backend/app/models/station.py`. Driver search merges `booked_time_slots` and `blocked_time_slots` in `backend/app/api/routes/driver.py`.

The frontend is a Vite + React app in `frontend/src`. The host station editor lives in `frontend/src/features/host/AddStationModal.tsx`, and the host dashboard in `frontend/src/features/host/HostView.tsx` constructs the payload for create/update requests. `frontend/src/services/hostService.ts` posts these payloads to the backend.

## Plan of Work

First, update the host save payload to include `availableTimeSlots` so the backend can persist host-selected availability. This is in `frontend/src/features/host/HostView.tsx`, inside `handleSaveStation`. The payload already includes blocked slots; add `availableTimeSlots` from the modal state.

Second, make sure the host modal reinitializes with the latest `timeSlots` once the config fetch completes. In `frontend/src/features/host/AddStationModal.tsx`, add a small effect that, when the modal is open and `availableTimeSlots` is still empty, seeds it with the latest `timeSlots`.

Third, backfill booking timestamps and expiration. In `backend/app/api/utils/bookings.py`, extend `expire_bookings` to set `start_at/end_at` for ACTIVE bookings that have `booking_date` and `start_time` but no timestamps. Use `duration_minutes` when available, defaulting to 60 minutes for legacy rows. Then, mark ACTIVE bookings as COMPLETED when their computed `end_at` is in the past or when their `booking_date` is before today and no timestamps can be computed. This keeps host stats and availability accurate without requiring a migration.

## Concrete Steps

Run from the repository root:

  cd backend
  python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Run from another terminal:

  cd frontend
  npm run dev

## Validation and Acceptance

- Open the host dashboard, edit a station, and deselect a few available time slots. Save, refresh the page, and confirm the same slots remain deselected (persisted).
- Switch to the driver view, search for the same station, and confirm only the host-allowed slots appear as selectable.
- If you have old bookings in the database, confirm host stats no longer count bookings that ended in the past and those slots are not blocked for current dates.

## Idempotence and Recovery

These changes are additive and can be applied multiple times. If local SQLite data becomes inconsistent, delete `backend/snapcharge.db` and restart the backend to recreate tables. For persistent environments, keep the backfill logic in `expire_bookings` to handle legacy rows safely.

## Artifacts and Notes

No artifacts yet.

## Interfaces and Dependencies

`frontend/src/features/host/HostView.tsx` must send `availableTimeSlots` in the station create/update payload. `frontend/src/features/host/AddStationModal.tsx` must reinitialize its form state when `timeSlots` updates. `backend/app/api/utils/bookings.py` must update legacy booking rows to include `start_at/end_at` or mark them as completed when they are in the past.

Update note (2025-09-21): Refined modal initialization description to seed `availableTimeSlots` whenever empty and updated progress status.
