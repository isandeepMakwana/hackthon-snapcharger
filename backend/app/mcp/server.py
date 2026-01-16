from __future__ import annotations

from typing import Any
from urllib.parse import quote

import httpx
from mcp.server.fastmcp import FastMCP

from app.mcp.settings import MCPSettings


def _normalize_slug(value: str) -> str:
    slug = ''.join(ch.lower() if ch.isalnum() else '-' for ch in value.strip())
    while '--' in slug:
        slug = slug.replace('--', '-')
    return slug.strip('-') or 'station'


def _station_url(settings: MCPSettings, station_id: str | None, title: str) -> str:
    slug = _normalize_slug(title)
    if station_id:
        return f"{settings.web_base_url}/stations/{station_id}/{quote(slug)}"
    return f"{settings.web_base_url}/stations/{quote(slug)}"


def create_mcp_server(settings: MCPSettings) -> FastMCP:
    mcp = FastMCP(
        name='SnapCharge MCP',
        instructions='Tools for SnapCharge driver workflows.',
        host=settings.mcp_host,
        port=settings.mcp_port
    )

    async def request_json(
        method: str,
        path: str,
        *,
        params: list[tuple[str, str]] | None = None,
        payload: dict[str, Any] | None = None,
        access_token: str | None = None
    ) -> Any:
        headers: dict[str, str] = {}
        token = access_token or settings.access_token
        if token:
            headers['Authorization'] = f'Bearer {token}'

        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.request(
                method,
                f"{settings.api_base_url}{path}",
                params=params,
                json=payload,
                headers=headers
            )

        try:
            data = response.json()
        except ValueError:
            data = None

        if response.status_code >= 400:
            message = None
            if isinstance(data, dict):
                message = data.get('detail') or data.get('error')
            raise RuntimeError(f"API {response.status_code}: {message or 'Request failed'}")

        return data

    @mcp.tool(name='get_driver_config')
    async def get_driver_config() -> dict[str, Any]:
        """Fetch driver UI config and booking time slots."""
        return await request_json('GET', '/api/driver/config')

    @mcp.tool(name='search_stations')
    async def search_stations(
        lat: float,
        lng: float,
        radius_km: float = 10.0,
        status: str | None = None,
        vehicle_type: str | None = None,
        tags: list[str] | None = None,
        query: str | None = None,
        booking_date: str | None = None
    ) -> list[dict[str, Any]]:
        """Search stations near a location and include stationUrl links."""
        params: list[tuple[str, str]] = [
            ('lat', str(lat)),
            ('lng', str(lng)),
            ('radius_km', str(radius_km))
        ]
        if status:
            params.append(('status', status))
        if vehicle_type:
            params.append(('vehicle_type', vehicle_type))
        if query:
            params.append(('q', query))
        if booking_date:
            params.append(('booking_date', booking_date))
        if tags:
            params.extend((('tags', tag) for tag in tags))

        stations = await request_json('GET', '/api/driver/search', params=params)
        if not isinstance(stations, list):
            return []

        for station in stations:
            title = station.get('title') if isinstance(station, dict) else None
            station_id = station.get('id') if isinstance(station, dict) else None
            if isinstance(station, dict) and title:
                station['stationUrl'] = _station_url(settings, station_id, title)
        return stations

    @mcp.tool(name='get_station_link')
    async def get_station_link(title: str, station_id: str | None = None) -> dict[str, str]:
        """Build a frontend station link from a title (and optional id)."""
        return {'stationUrl': _station_url(settings, station_id, title)}

    @mcp.tool(name='login_user')
    async def login_user(email: str, password: str) -> dict[str, Any]:
        """Authenticate a user and return tokens."""
        return await request_json('POST', '/api/auth/login', payload={
            'email': email,
            'password': password
        })

    @mcp.tool(name='upsert_driver_profile')
    async def upsert_driver_profile(
        vehicle_type: str,
        vehicle_model: str,
        access_token: str | None = None
    ) -> dict[str, Any]:
        """Create or update driver profile (requires access token)."""
        return await request_json(
            'PUT',
            '/api/profile/driver',
            payload={
                'vehicleType': vehicle_type,
                'vehicleModel': vehicle_model
            },
            access_token=access_token
        )

    @mcp.tool(name='book_station')
    async def book_station(
        station_id: str,
        start_time: str,
        access_token: str | None = None,
        user_lat: float | None = None,
        user_lng: float | None = None
    ) -> dict[str, Any]:
        """Book a charging slot (requires access token)."""
        payload: dict[str, Any] = {
            'stationId': station_id,
            'startTime': start_time
        }
        if user_lat is not None:
            payload['userLat'] = user_lat
        if user_lng is not None:
            payload['userLng'] = user_lng
        return await request_json(
            'POST',
            '/api/driver/bookings',
            payload=payload,
            access_token=access_token
        )

    return mcp
