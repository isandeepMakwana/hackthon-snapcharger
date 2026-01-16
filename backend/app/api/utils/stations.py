import re
from math import asin, cos, radians, sin, sqrt
from app.db.models.station import Station
from app.models.station import StationOut


def coords_for_station(station: Station) -> dict:
    x = abs(int(station.lat * 10) % 100)
    y = abs(int(station.lng * 10) % 100)
    return {'x': float(x), 'y': float(y)}


def distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius_km = 6371.0
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    lat1_r = radians(lat1)
    lat2_r = radians(lat2)

    a = sin(dlat / 2) ** 2 + cos(lat1_r) * cos(lat2_r) * sin(dlng / 2) ** 2
    c = 2 * asin(sqrt(a))
    return radius_km * c


def build_station_out(
    station: Station,
    distance_value: float | None = None,
    booked_time_slots: list[str] | None = None
) -> StationOut:
    distance = f'{distance_value:.1f} km' if distance_value is not None else '0.0 km'
    payload = {
        'id': station.id,
        'host_name': station.host_name,
        'title': station.title,
        'location': station.location,
        'rating': station.rating,
        'review_count': station.review_count,
        'price_per_hour': station.price_per_hour,
        'status': station.status,
        'image': station.image,
        'connector_type': station.connector_type,
        'power_output': station.power_output,
        'description': station.description,
        'coords': coords_for_station(station),
        'lat': station.lat,
        'lng': station.lng,
        'distance': distance,
        'phone_number': station.phone_number,
        'supported_vehicle_types': station.supported_vehicle_types or [],
        'booked_time_slots': booked_time_slots or []
    }
    return StationOut.model_validate(payload)


def parse_power_kw(power_output: str) -> float:
    if not power_output:
        return 0.0
    match = re.search(r'\\d+(?:\\.\\d+)?', power_output)
    if not match:
        return 0.0
    return float(match.group(0))
