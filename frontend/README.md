# SnapCharge Frontend (Vite + React)

## Requirements

- Node.js 18+
- npm

## Setup

From `frontend/`:

1) Install dependencies:

- `npm install`

2) Environment variables (optional):

- `VITE_API_BASE_URL` (defaults to `http://localhost:8000`)
- `VITE_GEMINI_API_KEY` (optional, enables Gemini image analysis)

You can place these in `frontend/.env`.

## Run

- `npm run dev`

The app will be available at `http://localhost:5173` by default.

## Build

- `npm run build`
- `npm run preview`

## Notes

- The Driver and Host pages call backend APIs via `VITE_API_BASE_URL`.
- Auth sessions are stored in `localStorage` under `snapcharge.auth`.
- Driver bookings require a booking date and time slot; unavailable slots are disabled in the UI.
