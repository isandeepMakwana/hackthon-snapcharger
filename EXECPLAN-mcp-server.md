# Restore SnapCharge MCP Server

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

PLANS.md is located at `PLANS.md` from the repository root. This document must be maintained in accordance with that file.

## Purpose / Big Picture

The MCP server described in `backend/MCP.md` is missing from the repository, so Claude/other MCP clients disconnect on startup. After this change, `python -m app.mcp` will start a working MCP server that exposes the documented tools (driver config, station search/linking, login, profile upsert, booking). This can be verified by launching the MCP server and seeing it stay connected in the MCP client.

## Progress

- [x] (2026-01-16 16:50Z) Draft ExecPlan, capture current MCP disconnect cause (missing package), and list required tools.
- [ ] (2026-01-16 16:50Z) Implement MCP server package with settings, tools, and entrypoint; add dependency.
- [ ] (2026-01-16 16:50Z) Validate local MCP startup and update plan evidence.

## Surprises & Discoveries

- Observation: `backend/app/mcp` only contains `__pycache__`, so `python -m app.mcp` fails with a missing module error.
  Evidence: `/Users/.../venv/bin/python -m app.mcp` -> `No module named app.mcp.__main__`.

## Decision Log

- Decision: Recreate the MCP server using FastMCP with HTTP calls to existing API routes instead of embedding business logic.
  Rationale: Keeps the MCP layer thin, aligns with documented behavior, and avoids duplicating domain logic.
  Date/Author: 2026-01-16, Codex

## Outcomes & Retrospective

Pending implementation.

## Context and Orientation

The backend API is a FastAPI app under `backend/app` with driver endpoints in `backend/app/api/routes/driver.py`, auth in `backend/app/api/routes/auth.py`, and profile in `backend/app/api/routes/profile.py`. The MCP documentation lives at `backend/MCP.md` and describes tools that proxy these APIs. The MCP package (`backend/app/mcp`) is currently missing its source code, so `python -m app.mcp` fails and MCP clients disconnect.

## Plan of Work

Create a new MCP package under `backend/app/mcp` with `settings.py`, `server.py`, `__init__.py`, and `__main__.py`. The settings module will read `SNAPCHARGE_*` env vars from `backend/.env` with safe defaults. The server module will construct a FastMCP server, define the documented tools, and call the backend API using `httpx`. The entrypoint will load settings and call `FastMCP.run` with the configured transport. Add `mcp` to `backend/requirements.txt` so the dependency is installed in fresh environments.

## Concrete Steps

1) Implement MCP package and dependencies:

   - Add `backend/app/mcp/settings.py`, `backend/app/mcp/server.py`, `backend/app/mcp/__init__.py`, and `backend/app/mcp/__main__.py`.
   - Update `backend/requirements.txt` to include `mcp==1.25.0`.

2) Validate the MCP server starts:

   - From `backend/`, run:

       /Users/sandeepmakwana/Downloads/hackthon-snapcharger/venv/bin/python -m app.mcp

   Expected: the process stays running (no immediate traceback). For stdio transport, it will idle waiting for requests.

## Validation and Acceptance

In the MCP client, configure the server to run `python -m app.mcp` with `PYTHONPATH` set to `backend/`. The MCP server should remain connected and respond to tool invocations. A quick validation is to call `get_driver_config` and expect a JSON payload matching `/api/driver/config`.

## Idempotence and Recovery

The changes are additive. If the MCP server fails to start, re-run the entrypoint and check for missing dependencies or incorrect `PYTHONPATH`. Reinstalling dependencies with `pip install -r backend/requirements.txt` is safe and repeatable.

## Artifacts and Notes

None yet.

## Interfaces and Dependencies

- `backend/app/mcp/settings.py` defines `MCPSettings` with fields for `SNAPCHARGE_API_BASE_URL`, `SNAPCHARGE_WEB_BASE_URL`, `SNAPCHARGE_ACCESS_TOKEN`, `SNAPCHARGE_MCP_TRANSPORT`, `SNAPCHARGE_MCP_HOST`, `SNAPCHARGE_MCP_PORT`, `SNAPCHARGE_REQUEST_TIMEOUT_SECONDS`, and `SNAPCHARGE_MCP_USE_ASGI_APP`.
- `backend/app/mcp/server.py` defines `create_mcp_server(settings)` and implements tools: `get_driver_config`, `search_stations`, `get_station_link`, `login_user`, `upsert_driver_profile`, `book_station`.
- `backend/app/mcp/__main__.py` runs the MCP server via `FastMCP.run`.
- `backend/requirements.txt` includes `mcp==1.25.0`.

## Plan Change Notes

Initial plan created on 2026-01-16 to restore the missing MCP server package and entrypoint.
