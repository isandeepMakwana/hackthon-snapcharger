# SnapCharge

SnapCharge is a full-stack EV charging marketplace with a FastAPI backend and a Vite + React frontend.

## Repo Layout

- `backend/` FastAPI API, database models, auth, host + driver endpoints
- `frontend/` Vite + React UI

## Quick Start

1) Backend

- See `backend/README.md` for setup and environment variables.

2) Frontend

- See `frontend/README.md` for setup and environment variables.

## High-Level Flow

- The backend exposes REST APIs for auth, users, host dashboard, and driver search/booking.
- The frontend calls those APIs using `VITE_API_BASE_URL` (defaults to `http://localhost:8000`).
- Demo data can be seeded via `SEED_DEMO_DATA=true` in `backend/.env`.

## Common Commands

From repository root:

- Start backend (with active venv):
  - `cd backend && uvicorn app.main:app --reload`
- Start frontend:
  - `cd frontend && npm install && npm run dev`

## Documentation

- Backend docs: `backend/README.md`
- Frontend docs: `frontend/README.md`
