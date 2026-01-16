# Add SnapCharge MCP Server

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

PLANS.md is present at `PLANS.md` and this document must be maintained in accordance with it.

## Purpose / Big Picture

After this change, a Model Context Protocol (MCP) server will expose SnapCharge’s driver-facing capabilities (searching stations, generating direct booking links, and booking a slot) through the FastMCP framework. A developer can run the MCP server locally in stdio mode, or deploy it as an HTTP server (SSE or streamable HTTP) on cloud infrastructure, and then connect it to OpenAI or other MCP-capable clients. Success is observable by starting the MCP server, calling the `search_stations` tool to retrieve stations plus a direct link to the frontend, and calling the `book_station` tool to reserve a time slot via the existing FastAPI backend.

## Progress

- [x] (2025-01-16 20:05Z) Draft MCP design and document tool contracts.
- [x] (2025-01-16 20:10Z) Add MCP settings module and FastMCP server with tools.
- [x] (2025-01-16 20:12Z) Update backend dependencies for FastMCP and adjust versions to keep FastAPI compatible.
- [x] (2025-01-16 20:14Z) Add MCP usage documentation and link it from existing README if needed.
- [x] (2025-01-16 20:25Z) Add MCP smoke tests and run MCP-only pytest run.

## Surprises & Discoveries

- MCP settings needed `extra='ignore'` because `.env` contains non-MCP variables and Pydantic v2 rejects extras by default.
  Evidence: `pydantic_core._pydantic_core.ValidationError: Extra inputs are not permitted` during test collection.
- Full backend test suite still fails due to existing tests expecting driver booking without profiles and AI image analysis returning real values.
  Evidence: `tests/test_host.py` 403 on booking and `Gemini API Error` on analyze-photo.

## Decision Log

- Decision: Use FastMCP from the `mcp` Python package and call existing FastAPI endpoints over HTTP rather than duplicating DB logic.
  Rationale: Re-uses existing business logic and auth rules, keeping MCP behavior consistent with the public API.
  Date/Author: 2025-01-16 / Codex
- Decision: Add `SNAPCHARGE_MCP_USE_ASGI_APP` for in-process HTTPX calls in tests.
  Rationale: Enables MCP tool tests without standing up a separate HTTP server.
  Date/Author: 2025-01-16 / Codex

## Outcomes & Retrospective

- Implemented MCP server, tools, and docs; MCP smoke tests pass. Full backend suite still has pre-existing failures unrelated to MCP.

## Context and Orientation

SnapCharge’s backend is a FastAPI app located in `backend/app`. The main API entrypoint is `backend/app/main.py`, which mounts routers under `/api` for authentication, driver, host, and profile operations. Driver-facing endpoints live in `backend/app/api/routes/driver.py` with routes:

- `GET /api/driver/config` for driver UI configuration.
- `GET /api/driver/search` for listing stations near a location.
- `POST /api/driver/bookings` for booking a station slot (requires a driver profile and an access token).

Auth flows live in `backend/app/api/routes/auth.py` (`POST /api/auth/login` for access tokens), and driver profile creation lives in `backend/app/api/routes/profile.py` (`PUT /api/profile/driver`). Frontend routing for direct station links is in `frontend/src/app/App.tsx`, which renders `/stations/:stationSlug` where the slug is the lowercased station title with whitespace collapsed to `-`.

“MCP” means Model Context Protocol, a standardized way for tools to be exposed to AI clients. “FastMCP” is a Python helper from the `mcp` package that defines MCP tools and runs transports (stdio for local development, SSE or streamable HTTP for cloud). This plan will add a new MCP server module under `backend/app/mcp` and a documentation file describing environment variables and how to run.

## Plan of Work

First, add a dedicated MCP settings module (`backend/app/mcp/settings.py`) to centralize environment variables such as API base URL, frontend base URL, and MCP transport/host/port defaults. Next, implement the FastMCP server in `backend/app/mcp/server.py` with tool functions that call the existing FastAPI endpoints via `httpx`. Each tool should validate inputs, handle backend errors, and return structured output, including a `stationUrl` field that points directly to the frontend station page. Create a module entrypoint (`backend/app/mcp/__main__.py`) so developers can run `python -m app.mcp` to start the server.

Then, update `backend/requirements.txt` to include the `mcp` dependency and bump `pydantic`/`uvicorn` versions to meet `mcp` requirements while staying compatible with FastAPI. Add documentation at `backend/MCP.md` describing setup, environment variables, local stdio use, cloud deployment (SSE or streamable HTTP), and how to connect from OpenAI MCP clients. Finally, add a smoke test (or scripted verification) that exercises at least `search_stations` and `book_station`, and run the tests to confirm behavior before finishing.

## Concrete Steps

From the repository root:

1) Edit dependencies:

    - Update `backend/requirements.txt` to add `mcp==1.25.0` and bump `pydantic` and `uvicorn[standard]` to compatible versions.

2) Create MCP settings module:

    - Add `backend/app/mcp/settings.py` with a `McpSettings` class (using `pydantic-settings`) that reads `SNAPCHARGE_API_BASE_URL`, `SNAPCHARGE_WEB_BASE_URL`, `SNAPCHARGE_ACCESS_TOKEN`, `SNAPCHARGE_MCP_TRANSPORT`, `SNAPCHARGE_MCP_HOST`, `SNAPCHARGE_MCP_PORT`, and `SNAPCHARGE_REQUEST_TIMEOUT_SECONDS`.

3) Implement FastMCP server:

    - Add `backend/app/mcp/server.py` defining a `FastMCP` instance, tool functions (`search_stations`, `get_driver_config`, `login_user`, `upsert_driver_profile`, `book_station`, and `get_station_link`), and a `build_station_link` helper that matches the frontend slug logic.

4) Add entrypoint:

    - Add `backend/app/mcp/__main__.py` to run the server using the transport from settings (stdio by default).

5) Documentation:

    - Create `backend/MCP.md` describing setup, environment variables, and usage examples for stdio and SSE/streamable HTTP. Mention the `/sse` and `/mcp` endpoints for cloud transports and show example commands.

6) Testing:

    - Add a smoke test or script that calls MCP tool functions and verify output.
    - Run the MCP test(s) (and optionally the existing backend test suite) to confirm behavior.

## Validation and Acceptance

Acceptance requires:

- Starting the MCP server in stdio mode and calling `search_stations` returns a list of stations plus `stationUrl` fields that match the frontend route format (`/stations/<slug>`).
- Calling `book_station` with a valid access token and station ID returns a successful response from the backend and includes the `stationUrl` for follow-up.
- Running the MCP smoke test completes without errors.
- Documentation clearly explains how to run locally and on cloud, how to set environment variables, and how to connect from OpenAI MCP clients.

## Idempotence and Recovery

All changes are additive. Re-running the setup steps should be safe: dependency installs are repeatable, and MCP tools call existing endpoints without schema migrations. If the MCP server fails to start, verify environment variables and re-run the test sequence; no destructive operations are involved.

## Artifacts and Notes

Expected command samples (examples only):

    (backend) python -m app.mcp
    (backend) SNAPCHARGE_MCP_TRANSPORT=sse SNAPCHARGE_MCP_HOST=0.0.0.0 SNAPCHARGE_MCP_PORT=9000 python -m app.mcp

Executed during implementation:

    (backend) python -m pytest tests/test_mcp.py --cov-fail-under=0
    2 passed

## Interfaces and Dependencies

Dependencies:

- Python package `mcp==1.25.0` for FastMCP server and MCP tool definitions.
- `httpx` for calling existing FastAPI endpoints.
- `pydantic>=2.11` and `uvicorn>=0.31.1` for MCP compatibility (aligned with FastAPI constraints).

Tool contracts (names and signatures):

- `search_stations(lat: float, lng: float, radius_km: float = 10.0, status: str | None = None, vehicle_type: str | None = None, tags: list[str] | None = None, query: str | None = None) -> dict`
- `get_driver_config() -> dict`
- `login_user(email: str, password: str) -> dict`
- `upsert_driver_profile(access_token: str | None, vehicle_type: str, vehicle_model: str) -> dict`
- `book_station(station_id: str, start_time: str, access_token: str | None = None, user_lat: float | None = None, user_lng: float | None = None) -> dict`
- `get_station_link(station_title: str) -> dict`

Each tool should include a `stationUrl` output when applicable, computed using the frontend’s slug logic (lowercased title with whitespace collapsed to `-`).


Change log note: Initial ExecPlan draft created to guide MCP implementation and testing.
Change log note: Updated progress, discoveries, and decisions after implementing MCP server, docs, and tests.
Change log note: Recorded MCP smoke test command in Artifacts and Notes.
