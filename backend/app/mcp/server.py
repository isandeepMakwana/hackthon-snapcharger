from __future__ import annotations

from contextlib import asynccontextmanager
import re
from typing import Any, AsyncIterator
from urllib.parse import quote

import httpx
from mcp.server.fastmcp import FastMCP

from app.mcp.settings import get_mcp_settings


def _normalize_base_url(url: str) -> str:
    return url.rstrip('/')


def _slugify_station_title(title: str) -> str:
    return re.sub(r'\s+', '-', title.strip().lower())


def build_station_link(title: str, web_base_url: str) -> str:
    base_url = _normalize_base_url(web_base_url)
    slug = _slugify_station_title(title)
    if not slug:
        return base_url
    return f"{base_url}/stations/{quote(slug)}"


@asynccontextmanager
async def _http_client() -> AsyncIterator[httpx.AsyncClient]:
    settings = get_mcp_settings()
    timeout = httpx.Timeout(settings.request_timeout_seconds)
    base_url = _normalize_base_url(settings.api_base_url)

    if settings.mcp_use_asgi_app:
        from app.main import app as asgi_app
        async with httpx.AsyncClient(app=asgi_app, base_url=base_url, timeout=timeout) as client:
            yield client
    else:
        async with httpx.AsyncClient(base_url=base_url, timeout=timeout) as client:
            yield client


def _format_backend_error(response: httpx.Response) -> str:
    base_message = f"Backend request failed with status {response.status_code}."
    try:
        payload = response.json()
    except ValueError:
        detail = response.text.strip()
        return f"{base_message} {detail}" if detail else base_message

    if isinstance(payload, dict):
        detail = payload.get('detail') or payload.get('error') or payload.get('message')
        if isinstance(detail, dict):
            detail_message = detail.get('message') or detail.get('code') or str(detail)
        elif isinstance(detail, str):
            detail_message = detail
        else:
            detail_message = None
        if detail_message:
            return f"{base_message} {detail_message}"

    return base_message


async def _request(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None
) -> Any:
    async with _http_client() as client:
        response = await client.request(method, path, params=params, json=json, headers=headers)
        if response.is_error:
            raise ValueError(_format_backend_error(response))
        return response.json()


def _require_access_token(access_token: str | None) -> str:
    settings = get_mcp_settings()
    token = access_token or settings.access_token
    if not token:
        raise ValueError('Access token required. Provide access_token or set SNAPCHARGE_ACCESS_TOKEN.')
    return token


settings = get_mcp_settings()

mcp = FastMCP(
    name='SnapCharge MCP',
    instructions=(
        'Use this server to search SnapCharge stations, generate direct station links, '
        'and book charging slots. Call login_user to obtain an access token, '
        'upsert_driver_profile to complete a driver profile, and book_station to reserve a slot.'
    ),
    host=settings.mcp_host,
    port=settings.mcp_port
)


@mcp.tool(
    name='get_driver_config',
    description='Fetch driver configuration including location, filter options, and time slots.'
)
async def get_driver_config() -> dict[str, Any]:
    return await _request('GET', '/api/driver/config')


@mcp.tool(
    name='search_stations',
    description='Search for charging stations near a location. Returns stations with direct links.'
)
async def search_stations(
    lat: float,
    lng: float,
    radius_km: float = 10.0,
    status: str | None = None,
    vehicle_type: str | None = None,
    tags: list[str] | None = None,
    query: str | None = None
) -> dict[str, Any]:
    params: dict[str, Any] = {
        'lat': lat,
        'lng': lng,
        'radius_km': radius_km
    }
    if status:
        params['status'] = status
    if vehicle_type:
        params['vehicle_type'] = vehicle_type
    if query:
        params['q'] = query
    if tags:
        params['tags'] = tags

    data = await _request('GET', '/api/driver/search', params=params)
    settings = get_mcp_settings()
    stations: list[dict[str, Any]] = []
    if isinstance(data, list):
        for station in data:
            payload = dict(station)
            title = str(payload.get('title') or '')
            payload['stationUrl'] = build_station_link(title, settings.web_base_url)
            stations.append(payload)

    return {
        'count': len(stations),
        'stations': stations
    }


@mcp.tool(
    name='get_station_link',
    description='Build a direct frontend link to a station using its title.'
)
def get_station_link(station_title: str) -> dict[str, str]:
    settings = get_mcp_settings()
    return {
        'stationTitle': station_title,
        'stationUrl': build_station_link(station_title, settings.web_base_url)
    }


@mcp.tool(
    name='login_user',
    description='Authenticate a user and return access tokens.'
)
async def login_user(email: str, password: str) -> dict[str, Any]:
    payload = {'email': email, 'password': password}
    data = await _request('POST', '/api/auth/login', json=payload)
    if isinstance(data, dict):
        tokens = data.get('tokens')
        if isinstance(tokens, dict):
            data['accessToken'] = tokens.get('accessToken')
            data['refreshToken'] = tokens.get('refreshToken')
    return data


@mcp.tool(
    name='upsert_driver_profile',
    description='Create or update a driver profile needed before booking.'
)
async def upsert_driver_profile(
    vehicle_type: str,
    vehicle_model: str,
    access_token: str | None = None
) -> dict[str, Any]:
    token = _require_access_token(access_token)
    payload = {
        'vehicleType': vehicle_type,
        'vehicleModel': vehicle_model
    }
    headers = {'Authorization': f'Bearer {token}'}
    return await _request('PUT', '/api/profile/driver', json=payload, headers=headers)


@mcp.tool(
    name='book_station',
    description='Book a charging slot at a station using a driver access token.'
)
async def book_station(
    station_id: str,
    start_time: str,
    access_token: str | None = None,
    user_lat: float | None = None,
    user_lng: float | None = None
) -> dict[str, Any]:
    token = _require_access_token(access_token)
    payload: dict[str, Any] = {
        'stationId': station_id,
        'startTime': start_time
    }
    if user_lat is not None:
        payload['userLat'] = user_lat
    if user_lng is not None:
        payload['userLng'] = user_lng

    headers = {'Authorization': f'Bearer {token}'}
    data = await _request('POST', '/api/driver/bookings', json=payload, headers=headers)
    if isinstance(data, dict):
        settings = get_mcp_settings()
        title = str(data.get('title') or '')
        data['stationUrl'] = build_station_link(title, settings.web_base_url)
    return data


if __name__ == '__main__':
    mcp.run(transport=settings.mcp_transport)
