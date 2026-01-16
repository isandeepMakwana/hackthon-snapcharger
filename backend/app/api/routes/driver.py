from datetime import datetime, timedelta, date, time
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette import status
from app.api.deps import get_db, require_driver_profile
from app.api.utils.stations import build_station_out, distance_km, parse_power_kw
from app.db.models.booking import Booking
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
    DriverStatusOption,
    DriverVehicleTypeOption
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

VEHICLE_TYPE_OPTIONS = [
    {'value': 'ALL', 'label': 'All Vehicles'},
    {'value': '2W', 'label': '2 Wheeler'},
    {'value': '4W', 'label': '4 Wheeler'}
]

LEGEND_ITEMS = [
    {'status': 'AVAILABLE', 'label': 'Available'},
    {'status': 'BUSY', 'label': 'Busy'},
    {'status': 'OFFLINE', 'label': 'Offline'}
]


def _fetch_booked_slots(
    db: Session,
    station_ids: list[str],
    booking_date: date
) -> dict[str, list[str]]:
    if not station_ids:
        return {}
    bookings = db.query(Booking).filter(
        Booking.station_id.in_(station_ids),
        Booking.status == 'ACTIVE',
        Booking.booking_date == booking_date
    ).all()
    slots: dict[str, list[str]] = {}
    for booking in bookings:
        if not booking.start_time:
            continue
        slots.setdefault(booking.station_id, []).append(booking.start_time)
    return slots


def _generate_time_slots() -> list[str]:
    slots: list[str] = []
    start_time = datetime.combine(date.today(), time(hour=8, minute=0))
    for offset in range(12):
        current = start_time + timedelta(hours=offset)
        slots.append(current.strftime('%I:%M %p').lstrip('0'))
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
        vehicle_type_options=[DriverVehicleTypeOption(**item) for item in VEHICLE_TYPE_OPTIONS],
        legend=[DriverLegendItem(**item) for item in LEGEND_ITEMS],
        booking=BookingConfig(service_fee=SERVICE_FEE, time_slots=_generate_time_slots())
    )


@router.get('/search', response_model=list[StationOut])
async def search_stations(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(SEARCH_RADIUS_KM, ge=0.1, le=100.0),
    status: str | None = Query(default=None),
    vehicle_type: str | None = Query(default=None),
    tags: list[str] | None = Query(default=None),
    q: str | None = Query(default=None),
    booking_date: date | None = Query(default=None),
    db: Session = Depends(get_db)
) -> list[StationOut]:
    ensure_global_demo_stations(db)
    stations = db.query(Station).all()
    selected_date = booking_date or date.today()

    if status and status != 'ALL':
        stations = [station for station in stations if station.status == status]

    if vehicle_type and vehicle_type != 'ALL':
        stations = [
            station for station in stations
            if station.supported_vehicle_types and vehicle_type in station.supported_vehicle_types
        ]

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
    candidates: list[tuple[Station, float]] = []
    for station in stations:
        dist = distance_km(lat, lng, station.lat, station.lng)
        if dist <= radius_km:
            candidates.append((station, dist))

    booked_slots = _fetch_booked_slots(db, [station.id for station, _ in candidates], selected_date)
    for station, dist in candidates:
        merged_slots = list({*booked_slots.get(station.id, []), *(station.blocked_time_slots or [])})
        results.append(build_station_out(station, dist, merged_slots))

    return results


@router.post('/bookings', response_model=StationOut)
async def create_booking(
    payload: BookingRequest,
    current_user: User = Depends(require_driver_profile),
    db: Session = Depends(get_db)
) -> StationOut:
    if not current_user.phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'MISSING_PHONE', 'message': 'Phone number is required to book a station.'}
        )

    station = db.query(Station).filter(Station.id == payload.station_id).first()
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={'code': 'NOT_FOUND', 'message': 'Station not found.'}
        )

    if station.status == 'OFFLINE':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'UNAVAILABLE', 'message': 'Station is not available.'}
        )

    if not payload.booking_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'MISSING_BOOKING_DATE', 'message': 'Booking date is required.'}
        )
    if payload.booking_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'INVALID_BOOKING_DATE', 'message': 'Booking date cannot be in the past.'}
        )

    if not payload.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'MISSING_TIME_SLOT', 'message': 'Start time is required to book a station.'}
        )

    if payload.start_time in (station.blocked_time_slots or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'TIME_SLOT_BLOCKED', 'message': 'Selected time slot is blocked by the host.'}
        )

    existing_booking = db.query(Booking).filter(
        Booking.station_id == station.id,
        Booking.status == 'ACTIVE',
        Booking.start_time == payload.start_time,
        Booking.booking_date == payload.booking_date
    ).first()
    if existing_booking:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={'code': 'TIME_SLOT_UNAVAILABLE', 'message': 'Selected time slot is already booked.'}
        )

    if not station.phone_number:
        host = db.query(User).filter(User.id == station.host_id).first()
        if host and host.phone_number:
            station.phone_number = host.phone_number

    db.add(Booking(
        station_id=station.id,
        host_id=station.host_id,
        driver_id=current_user.id,
        driver_name=current_user.username,
        driver_phone_number=current_user.phone_number,
        status='ACTIVE',
        booking_date=payload.booking_date,
        start_time=payload.start_time
    ))

    station.monthly_earnings += station.price_per_hour
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={'code': 'TIME_SLOT_UNAVAILABLE', 'message': 'Selected time slot is already booked.'}
        )
    db.refresh(station)

    distance_value = None
    if payload.user_lat is not None and payload.user_lng is not None:
        distance_value = distance_km(payload.user_lat, payload.user_lng, station.lat, station.lng)

    booked_slots = _fetch_booked_slots(db, [station.id], payload.booking_date)
    merged_slots = list({*booked_slots.get(station.id, []), *(station.blocked_time_slots or [])})
    return build_station_out(station, distance_value, merged_slots)
