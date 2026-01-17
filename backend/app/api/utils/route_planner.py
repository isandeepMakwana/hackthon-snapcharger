import math
import re
from typing import Any

import httpx

from app.api.utils.stations import distance_km, parse_power_kw
from app.db.models.station import Station

OSRM_BASE_URL = 'https://router.project-osrm.org'
NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
USER_AGENT = 'SnapCharge/1.0'


def build_route_cache_key(stops: list[tuple[float, float]], vehicle_type: str | None, corridor_km: float) -> str:
    parts = [f'{lat:.5f},{lng:.5f}' for lat, lng in stops]
    vehicle = vehicle_type or 'unknown'
    return f"v1|{vehicle}|{corridor_km:.2f}|" + '|'.join(parts)


async def geocode_query(query: str, limit: int = 5) -> list[dict[str, Any]]:
    query = query.strip()
    if not query:
        return []

    coord_match = re.match(r'^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$', query)
    if coord_match:
        lat = float(coord_match.group(1))
        lng = float(coord_match.group(2))
        return [{'label': f'{lat:.5f}, {lng:.5f}', 'lat': lat, 'lng': lng}]

    params = {
        'q': query,
        'format': 'jsonv2',
        'limit': str(limit),
        'addressdetails': '1'
    }
    async with httpx.AsyncClient(timeout=10.0, headers={'User-Agent': USER_AGENT}) as client:
        response = await client.get(NOMINATIM_URL, params=params)
        response.raise_for_status()
        data = response.json()

    results: list[dict[str, Any]] = []
    for item in data:
        label = item.get('display_name') or item.get('name') or query
        try:
            lat = float(item['lat'])
            lng = float(item['lon'])
        except (KeyError, ValueError, TypeError):
            continue
        results.append({'label': label, 'lat': lat, 'lng': lng})
    return results


async def fetch_osrm_route(stops: list[tuple[float, float]]) -> dict[str, Any]:
    if len(stops) < 2:
        raise ValueError('At least two stops are required')
    coords = ';'.join([f'{lng},{lat}' for lat, lng in stops])
    url = f"{OSRM_BASE_URL}/route/v1/driving/{coords}"
    params = {'overview': 'full', 'geometries': 'polyline', 'steps': 'true'}

    async with httpx.AsyncClient(timeout=15.0, headers={'User-Agent': USER_AGENT}) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        payload = response.json()

    routes = payload.get('routes') or []
    if not routes:
        raise ValueError('No route returned from OSRM')
    return routes[0]


def decode_polyline(polyline: str, precision: int = 5) -> list[tuple[float, float]]:
    index = 0
    lat = 0
    lng = 0
    coordinates: list[tuple[float, float]] = []
    factor = 10 ** precision

    while index < len(polyline):
        result = 1
        shift = 0
        while True:
            b = ord(polyline[index]) - 63 - 1
            index += 1
            result += b << shift
            shift += 5
            if b < 0x1f:
                break
        delta_lat = ~(result >> 1) if result & 1 else (result >> 1)
        lat += delta_lat

        result = 1
        shift = 0
        while True:
            b = ord(polyline[index]) - 63 - 1
            index += 1
            result += b << shift
            shift += 5
            if b < 0x1f:
                break
        delta_lng = ~(result >> 1) if result & 1 else (result >> 1)
        lng += delta_lng

        coordinates.append((lat / factor, lng / factor))

    return coordinates


def estimate_charge_minutes(power_kw: float, vehicle_type: str | None) -> int:
    if power_kw <= 0:
        return 0
    battery_kwh = 40.0
    if vehicle_type == '2W':
        battery_kwh = 3.0
    energy_needed = battery_kwh * 0.6
    minutes = int(math.ceil((energy_needed / power_kw) * 60))
    return max(10, min(minutes, 180))


def estimate_capacity_ports(power_kw: float) -> int:
    if power_kw >= 50:
        return 6
    if power_kw >= 25:
        return 4
    if power_kw >= 11:
        return 2
    return 1


def stations_along_route(
    stations: list[Station],
    route_points: list[tuple[float, float]],
    corridor_km: float,
    total_distance_km: float,
    total_duration_min: float,
    vehicle_type: str | None
) -> list[dict[str, Any]]:
    if not route_points:
        return []

    cumulative: list[float] = [0.0]
    for idx in range(1, len(route_points)):
        prev = route_points[idx - 1]
        curr = route_points[idx]
        cumulative.append(cumulative[-1] + distance_km(prev[0], prev[1], curr[0], curr[1]))

    results: list[dict[str, Any]] = []
    for station in stations:
        min_distance = None
        nearest_index = 0
        for idx, point in enumerate(route_points):
            dist = distance_km(station.lat, station.lng, point[0], point[1])
            if min_distance is None or dist < min_distance:
                min_distance = dist
                nearest_index = idx
        if min_distance is None or min_distance > corridor_km:
            continue

        distance_from_start = cumulative[nearest_index]
        eta_from_start = 0.0
        if total_distance_km > 0:
            eta_from_start = (distance_from_start / total_distance_km) * total_duration_min

        power_kw = parse_power_kw(station.power_output)
        capacity_ports = estimate_capacity_ports(power_kw)
        available_ports = capacity_ports if station.status == 'AVAILABLE' else 0

        results.append({
            'station': station,
            'distance_to_route_km': round(min_distance, 2),
            'distance_from_start_km': round(distance_from_start, 2),
            'eta_from_start_min': round(eta_from_start, 1),
            'estimated_charge_min': estimate_charge_minutes(power_kw, vehicle_type),
            'capacity_ports': capacity_ports,
            'available_ports': available_ports
        })

    return results
