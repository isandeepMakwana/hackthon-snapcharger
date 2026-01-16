# Add Map-Based Parking Coordinates to Host Profile

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository includes `PLANS.md` at the repo root. This document must be maintained in accordance with `PLANS.md`.

## Purpose / Big Picture

Hosts should be able to set their parking address by selecting an exact point on a map, and the system should save the latitude and longitude alongside the parking address. After this change, a host can click a map in the profile modal, see the selected coordinates, and save them to the backend. You can see this working by opening the host profile modal, clicking a location on the map, saving, and then re-opening to confirm the coordinates are persisted.

## Progress

- [x] (2025-09-21 15:20Z) Created the ExecPlan document and recorded baseline context.
- [x] (2025-09-21 15:35Z) Added parking latitude/longitude fields to backend models and profile API.
- [x] (2025-09-21 15:38Z) Added map-based coordinate selection UI in the host profile modal.
- [x] (2025-09-21 15:38Z) Wired host profile save/load to include coordinates in frontend types and services.
- [ ] Validate behavior and document verification steps.

## Surprises & Discoveries

None yet.

## Decision Log

- Decision: Use Leaflet (already present for the driver map) for the host profile map picker.
  Rationale: Reusing Leaflet avoids adding new dependencies and keeps map styling consistent.
  Date/Author: 2025-09-21 / Codex.

## Outcomes & Retrospective

Pending.

## Context and Orientation

The host profile is stored in `backend/app/db/models/host_profile.py` and exposed via Pydantic models in `backend/app/models/profile.py`. Host profile data is managed by the API in `backend/app/api/routes/profile.py`.

The host profile modal UI lives in `frontend/src/components/ProfileGateModal.tsx`. The payload is saved through `frontend/src/services/profileService.ts`, using the types in `frontend/src/types/profile.ts`.

The project already uses Leaflet for maps in `frontend/src/features/driver/components/MapCanvas.tsx`, so this plan reuses Leaflet for a small map picker component.

## Plan of Work

First, update backend host profile storage to include coordinates. Add `parking_lat` and `parking_lng` columns to `backend/app/db/models/host_profile.py`, update `backend/app/models/profile.py` to include `parking_lat` and `parking_lng` in `HostProfileIn` and `HostProfileOut`, and update the host profile routes in `backend/app/api/routes/profile.py` to persist and return these fields.

Second, add a small map picker in the host profile modal. Create a new component (for example `frontend/src/components/MapPicker.tsx`) that renders a Leaflet map, lets the user click to drop a marker, and calls `onChange` with `{ lat, lng }`. Use the existing Leaflet CSS already imported by `MapCanvas.tsx` and add any minimal marker styles if needed.

Third, wire the map picker to the host profile modal. In `frontend/src/components/ProfileGateModal.tsx`, add state for `parkingLat` and `parkingLng`, show the map picker under the parking address field when `mode === 'host'`, display the selected coordinates, and include them in the payload sent to `onSave`.

Fourth, update the profile types and API client to include coordinates. Add `parkingLat` and `parkingLng` to `HostProfileInput` and `HostProfile` in `frontend/src/types/profile.ts`, and ensure `saveHostProfile` in `frontend/src/services/profileService.ts` sends them.

## Concrete Steps

Run from the repository root:

  cd backend
  python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Run from another terminal:

  cd frontend
  npm run dev

## Validation and Acceptance

- Open the app, trigger the host profile modal, and click a point on the map. Confirm the lat/lng values update immediately in the UI.
- Save the host profile and re-open the modal. Confirm the selected coordinates are still displayed (fetched from the backend).
- In the backend logs, verify the host profile update request includes `parkingLat` and `parkingLng` and the response returns them.

## Idempotence and Recovery

These changes are additive. For local SQLite, you may need to delete `backend/snapcharge.db` or recreate the table to add new columns. For Postgres, add the new columns with a migration before starting the server.

## Artifacts and Notes

None yet.

## Interfaces and Dependencies

`backend/app/db/models/host_profile.py` must include `parking_lat` and `parking_lng`. `backend/app/models/profile.py` must expose `parking_lat` and `parking_lng`. `backend/app/api/routes/profile.py` must persist them in the host profile. `frontend/src/components/ProfileGateModal.tsx` must use a Leaflet-backed map picker to collect coordinates and send them via `frontend/src/services/profileService.ts` using updated types.

Update note (2025-09-21): Logged backend/Frontend implementation steps and recorded Leaflet decision.
