# SnapCharge Backend (FastAPI)

## Requirements

- Python 3.12+ (3.12 recommended)
- `pip` / `venv`

## Setup

From `backend/`:

1) Create and activate a virtual environment:

- `python3.12 -m venv .venv`
- `source .venv/bin/activate`

2) Install dependencies:

- `pip install -r requirements.txt`

3) Configure environment:

- Copy `backend/.env.example` to `backend/.env` and set values.
- Required secrets:
  - `JWT_SECRET_KEY` (min 32 chars)
  - `JWT_REFRESH_SECRET_KEY` (min 32 chars)
- Default DB (SQLite):
  - `DATABASE_URL=sqlite:///./snapcharge.db`
- Optional demo data:
  - `SEED_DEMO_DATA=true`

## Run

- `uvicorn app.main:app --reload`

The API will be available at `http://localhost:8000`.

## Notes

- Tables are created on startup (no migrations).
- If using Postgres, ensure libpq is available or install a compatible psycopg binary.
- Demo stations are seeded when `SEED_DEMO_DATA=true` and the `stations` table is empty.

## Tests

From `backend/`:

- `pytest`
