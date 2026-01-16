# SnapCharge MCP Server

This MCP (Model Context Protocol) server exposes SnapCharge driver workflows using the FastMCP framework. It allows an MCP client (including OpenAI and cloud deployments) to search stations, generate direct frontend links, and book a charging slot.

## What it exposes

Tools implemented by the server:

- `get_driver_config` — fetch driver UI config and time slots.
- `search_stations` — search stations near a location and return `stationUrl` links.
- `get_station_link` — build a frontend station link from a title.
- `login_user` — authenticate a user and return access tokens.
- `upsert_driver_profile` — create/update driver profile (required before booking).
- `book_station` — book a charging slot (requires access token).

## Setup

From `backend/`:

1) Install dependencies:

   `pip install -r requirements.txt`

2) Configure environment variables (in `.env` or your shell):

- `SNAPCHARGE_API_BASE_URL` (default: `http://localhost:8000`)
- `SNAPCHARGE_WEB_BASE_URL` (default: `http://localhost:5173`)
- `SNAPCHARGE_ACCESS_TOKEN` (optional; used if a tool call does not pass `access_token`)
- `SNAPCHARGE_MCP_TRANSPORT` (`stdio`, `sse`, or `streamable-http`; default: `stdio`)
- `SNAPCHARGE_MCP_HOST` (default: `127.0.0.1`)
- `SNAPCHARGE_MCP_PORT` (default: `9000`)
- `SNAPCHARGE_REQUEST_TIMEOUT_SECONDS` (default: `20`)

## Run locally (stdio)

From `backend/`:

`python -m app.mcp`

This starts a stdio MCP server suitable for local MCP clients.

## Run on cloud (SSE / streamable HTTP)

SSE transport (recommended for MCP clients that expect `/sse`):

```
SNAPCHARGE_MCP_TRANSPORT=sse \
SNAPCHARGE_MCP_HOST=0.0.0.0 \
SNAPCHARGE_MCP_PORT=9000 \
python -m app.mcp
```

SSE endpoint:

- `http://<host>:9000/sse`

Streamable HTTP transport:

```
SNAPCHARGE_MCP_TRANSPORT=streamable-http \
SNAPCHARGE_MCP_HOST=0.0.0.0 \
SNAPCHARGE_MCP_PORT=9000 \
python -m app.mcp
```

Streamable HTTP endpoint:

- `http://<host>:9000/mcp`

## Booking flow example

Typical flow for booking from an MCP client:

1) Call `login_user` with email/password to get `accessToken`.
2) Call `upsert_driver_profile` once per user (required by booking).
3) Call `search_stations` to get station IDs and `stationUrl`.
4) Call `book_station` with `station_id`, `start_time`, and `access_token`.

The booking response includes `stationUrl` so the user can open the station directly in the frontend.

## OpenAI usage notes

- Host this MCP server in your own infrastructure (SSE or streamable HTTP mode).
- Configure the OpenAI MCP client to point at the server URL (`/sse` or `/mcp`).
- Ensure `SNAPCHARGE_API_BASE_URL` points to the publicly reachable FastAPI backend.
- Ensure `SNAPCHARGE_WEB_BASE_URL` points to the deployed frontend so links open correctly.
