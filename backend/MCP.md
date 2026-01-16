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
- `SNAPCHARGE_MCP_USE_ASGI_APP` (default: `false`; set to `true` for in-process tests)

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
SNAPCHARGE_API_BASE_URL=https://api.example.com \
SNAPCHARGE_WEB_BASE_URL=https://app.example.com \
python -m app.mcp
```

SSE endpoint:

- `https://mcp.example.com/sse`

Streamable HTTP transport:

```
SNAPCHARGE_MCP_TRANSPORT=streamable-http \
SNAPCHARGE_MCP_HOST=0.0.0.0 \
SNAPCHARGE_MCP_PORT=9000 \
SNAPCHARGE_API_BASE_URL=https://api.example.com \
SNAPCHARGE_WEB_BASE_URL=https://app.example.com \
python -m app.mcp
```

Streamable HTTP endpoint:

- `https://mcp.example.com/mcp`

## Connect the MCP server to cloud code

Use the public MCP endpoint (`/sse` or `/mcp`) in your cloud code or AI platform configuration, and ensure it can reach both the MCP server and the SnapCharge API.

1) Deploy the MCP server (same codebase) to your cloud runtime.
   - Expose port `SNAPCHARGE_MCP_PORT`.
   - Set `SNAPCHARGE_MCP_TRANSPORT` to either `sse` or `streamable-http`.
   - Point `SNAPCHARGE_API_BASE_URL` to the public FastAPI backend.
   - Point `SNAPCHARGE_WEB_BASE_URL` to the public frontend so links open correctly.

2) In your cloud code or AI platform, add the MCP server URL:
   - SSE example: `https://mcp.example.com/sse`
   - Streamable HTTP example: `https://mcp.example.com/mcp`

3) If your MCP client supports headers, you can also add an optional static token header and validate it in a reverse proxy. The SnapCharge MCP server itself does not enforce auth at the MCP layer; it uses access tokens when calling the backend.

4) Test a simple flow from cloud code:
   - Call `search_stations` with latitude/longitude.
   - Verify the response includes `stationUrl` fields.
   - Call `login_user` then `upsert_driver_profile` and `book_station`.

## Connect to Claude.ai

You can connect Claude.ai to this MCP server if your Claude account has MCP server integrations enabled.

1) Deploy the MCP server publicly (SSE or streamable HTTP):
   - Example SSE URL: `https://mcp.example.com/sse`
   - Example streamable HTTP URL: `https://mcp.example.com/mcp`

2) In Claude.ai, open Settings and look for MCP or External Tools/Connectors.
   - Add a new MCP server.
   - Name it `SnapCharge MCP`.
   - Paste the SSE or streamable HTTP URL.

3) Save and test in a Claude.ai chat:
   - Ask Claude to call `search_stations` and confirm it returns `stationUrl`.
   - Ask Claude to call `login_user`, `upsert_driver_profile`, then `book_station`.

Notes:
- If Claude.ai does not show MCP integrations, use Claude Desktop or the Anthropic API with MCP support instead.
- If you need to add headers (for example, a gateway token), configure them in your MCP proxy or Claude connector settings.

## Test with Claude Desktop (local stdio)

Claude Desktop launches MCP servers as local processes over stdio. Use this for quick local testing.

1) Start the SnapCharge backend API in one terminal:

   `cd backend && uvicorn app.main:app --reload`

2) Open Claude Desktop config (macOS):

   `~/Library/Application Support/Claude/claude_desktop_config.json`

3) Add a server entry (update the paths for your machine):

```
{
  "mcpServers": {
    "snapcharge": {
      "command": "/Users/YOUR_USER/Downloads/hackthon-snapcharger/venv/bin/python",
      "args": ["-m", "app.mcp"],
      "env": {
        "PYTHONPATH": "/Users/YOUR_USER/Downloads/hackthon-snapcharger/backend",
        "SNAPCHARGE_MCP_TRANSPORT": "stdio",
        "SNAPCHARGE_API_BASE_URL": "http://localhost:8000",
        "SNAPCHARGE_WEB_BASE_URL": "http://localhost:5173"
      }
    }
  }
}
```

4) Restart Claude Desktop.

5) In a new chat, test with:
   - “Use SnapCharge MCP to search stations near Pune.”
   - “Login, set driver profile, then book a slot at the first station.”

If Claude Desktop does not show MCP tools, re-check the config path and restart the app.

## Booking flow example

Typical flow for booking from an MCP client:

1) Call `login_user` with email/password to get `accessToken`.
2) Call `upsert_driver_profile` once per user (required by booking).
3) Call `search_stations` to get station IDs and `stationUrl`.
4) Call `book_station` with `station_id`, `start_time`, and `access_token`.

The booking response includes `stationUrl` so the user can open the station directly in the frontend.
