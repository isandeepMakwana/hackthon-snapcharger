from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from starlette import status
from app.api.deps import get_db, require_role
from app.api.utils.stations import build_station_out, distance_km, parse_power_kw
from app.db.models.station import Station
from app.db.models.user import User
from app.db.seed import ensure_global_demo_stations
from app.models.driver import (
    BookingConfig,
    BookingRequest,
    DriverConfig,
    DriverFilterTag,
    DriverLegendItem,
    DriverLocation,
    DriverStatusOption
)
from app.models.station import StationOut

router = APIRouter(prefix='/api/driver', tags=['driver'])

DEFAULT_LOCATION = {'name': 'Pune', 'lat': 18.5204, 'lng': 73.8567}
SEARCH_RADIUS_KM = 10.0
DISPLAY_RADIUS_KM = 6.0
SEARCH_PLACEHOLDER = 'Search by area or host'
SERVICE_FEE = 10

FILTER_TAG_DEFINITIONS = [
    {'id': 'fast_charge', 'label': 'Fast Charge', 'min_power_kw': 11.0},
    {'id': 'type_2', 'label': 'Type 2', 'connector_type': 'type 2'},
    {'id': 'under_200', 'label': '< INR 200/hr', 'max_price': 200}
]

STATUS_OPTIONS = [
    {'value': 'ALL', 'label': 'All Status'},
    {'value': 'AVAILABLE', 'label': 'Available'},
    {'value': 'BUSY', 'label': 'Busy'},
    {'value': 'OFFLINE', 'label': 'Offline'}
]

LEGEND_ITEMS = [
    {'status': 'AVAILABLE', 'label': 'Available'},
    {'status': 'BUSY', 'label': 'Busy'},
    {'status': 'OFFLINE', 'label': 'Offline'}
]


def _generate_time_slots(
    slot_count: int = 6,
    interval_minutes: int = 60,
    start_offset_minutes: int = 60
) -> list[str]:
    slots: list[str] = []
    current = datetime.now() + timedelta(minutes=start_offset_minutes)
    for _ in range(slot_count):
        slots.append(current.strftime('%I:%M %p').lstrip('0'))
        current += timedelta(minutes=interval_minutes)
    return slots


@router.get('/config', response_model=DriverConfig)
async def driver_config() -> DriverConfig:
    location = DriverLocation.model_validate(DEFAULT_LOCATION)
    return DriverConfig(
        location=location,
        location_label=f"{location.name} - {DISPLAY_RADIUS_KM:g} km radius",
        search_radius_km=SEARCH_RADIUS_KM,
        display_radius_km=DISPLAY_RADIUS_KM,
        personalized_label=f"Personalized for {location.name}",
        search_placeholder=SEARCH_PLACEHOLDER,
        filter_tags=[DriverFilterTag(id=item['id'], label=item['label']) for item in FILTER_TAG_DEFINITIONS],
        status_options=[DriverStatusOption(**item) for item in STATUS_OPTIONS],
        legend=[DriverLegendItem(**item) for item in LEGEND_ITEMS],
        booking=BookingConfig(service_fee=SERVICE_FEE, time_slots=_generate_time_slots())
    )


@router.get('/search', response_model=list[StationOut])
async def search_stations(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(SEARCH_RADIUS_KM, ge=0.1, le=100.0),
    status: str | None = Query(default=None),
    tags: list[str] | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db)
) -> list[StationOut]:
    ensure_global_demo_stations(db)
    stations = db.query(Station).all()

    if status and status != 'ALL':
        stations = [station for station in stations if station.status == status]

    if q:
        query = q.strip().lower()
        if query:
            stations = [
                station for station in stations
                if query in station.title.lower()
                or query in station.location.lower()
                or query in station.host_name.lower()
            ]

    if tags:
        for tag in tags:
            definition = next((item for item in FILTER_TAG_DEFINITIONS if item['id'] == tag), None)
            if not definition:
                continue
            if 'min_power_kw' in definition:
                min_kw = definition['min_power_kw']
                stations = [
                    station for station in stations
                    if parse_power_kw(station.power_output) >= min_kw
                ]
            if 'connector_type' in definition:
                connector = definition['connector_type']
                stations = [
                    station for station in stations
                    if connector in station.connector_type.lower()
                ]
            if 'max_price' in definition:
                max_price = definition['max_price']
                stations = [
                    station for station in stations
                    if station.price_per_hour < max_price
                ]

    results: list[StationOut] = []
    for station in stations:
        dist = distance_km(lat, lng, station.lat, station.lng)
        if dist <= radius_km:
            results.append(build_station_out(station, dist))

    return results


@router.post('/bookings', response_model=StationOut)
async def create_booking(
    payload: BookingRequest,
    current_user: User = Depends(require_role('driver', 'admin')),
    db: Session = Depends(get_db)
) -> StationOut:
    station = db.query(Station).filter(Station.id == payload.station_id).first()
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={'code': 'NOT_FOUND', 'message': 'Station not found.'}
        )

    if station.status != 'AVAILABLE':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'UNAVAILABLE', 'message': 'Station is not available.'}
        )

    station.status = 'BUSY'
    station.monthly_earnings += station.price_per_hour
    db.commit()
    db.refresh(station)

    distance_value = None
    if payload.user_lat is not None and payload.user_lng is not None:
        distance_value = distance_km(payload.user_lat, payload.user_lng, station.lat, station.lng)

    return build_station_out(station, distance_value)
