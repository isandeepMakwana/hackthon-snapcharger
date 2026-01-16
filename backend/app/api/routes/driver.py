from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from starlette import status
from app.api.deps import get_db, require_driver_profile
from app.api.utils.stations import build_station_out, distance_km, parse_power_kw
from app.db.models.booking import Booking
from app.db.models.station import Station
from app.db.models.user import User
from app.db.seed import ensure_global_demo_stations
from app.models.booking import DriverBookingOut
from app.models.driver import (
    BookingConfig,
    BookingRequest,
    DriverConfig,
    DriverFilterTag,
    DriverLegendItem,
    DriverLocation,
    DriverStatusOption,
    DriverVehicleTypeOption,
    StationReview
)
from app.models.station import StationOut
from app.models.booking import CompleteBookingRequest

router = APIRouter(prefix='/api/driver', tags=['driver'])

DEFAULT_LOCATION = {'name': 'Pune', 'lat': 18.5204, 'lng': 73.8567}
SEARCH_RADIUS_KM = 20.0
DISPLAY_RADIUS_KM = 20.0
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


def _fetch_booked_slots(db: Session, station_ids: list[str]) -> dict[str, list[str]]:
    if not station_ids:
        return {}
    bookings = db.query(Booking).filter(
        Booking.station_id.in_(station_ids),
        Booking.status == 'ACTIVE'
    ).all()
    slots: dict[str, list[str]] = {}
    for booking in bookings:
        if not booking.start_time:
            continue
        slots.setdefault(booking.station_id, []).append(booking.start_time)
    return slots


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
    db: Session = Depends(get_db)
) -> list[StationOut]:
    ensure_global_demo_stations(db)
    stations = db.query(Station).all()
    print(f"🔍 Total stations in DB: {len(stations)}")

    if status and status != 'ALL':
        stations = [station for station in stations if station.status == status]
        print(f"🔍 After status filter ({status}): {len(stations)}")

    if vehicle_type and vehicle_type != 'ALL':
        stations = [
            station for station in stations
            if station.supported_vehicle_types and vehicle_type in station.supported_vehicle_types
        ]
        print(f"🔍 After vehicle type filter ({vehicle_type}): {len(stations)}")

    if q:
        query = q.strip().lower()
        if query:
            stations = [
                station for station in stations
                if query in station.title.lower()
                or query in station.location.lower()
                or query in station.host_name.lower()
            ]
            print(f"🔍 After search query ({q}): {len(stations)}")

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
        print(f"🔍 After tag filters: {len(stations)}")

    results: list[StationOut] = []
    candidates: list[tuple[Station, float]] = []
    for station in stations:
        dist = distance_km(lat, lng, station.lat, station.lng)
        if dist <= radius_km:
            candidates.append((station, dist))

    print(f"🔍 Stations within {radius_km}km radius: {len(candidates)}")
    booked_slots = _fetch_booked_slots(db, [station.id for station, _ in candidates])
    for station, dist in candidates:
        results.append(build_station_out(station, dist, booked_slots.get(station.id, [])))

    print(f"📤 Returning {len(results)} stations")
    return results


@router.get('/bookings', response_model=list[DriverBookingOut])
async def list_driver_bookings(
    current_user: User = Depends(require_driver_profile),
    db: Session = Depends(get_db)
) -> list[DriverBookingOut]:
    rows = db.query(Booking, Station, User).join(
        Station, Booking.station_id == Station.id
    ).join(
        User, Station.host_id == User.id
    ).filter(
        Booking.driver_id == current_user.id
    ).order_by(Booking.created_at.desc()).all()

    results: list[DriverBookingOut] = []
    for booking, station, host in rows:
        contact_number = station.phone_number or host.phone_number
        results.append(DriverBookingOut(
            id=booking.id,
            station_id=station.id,
            station_title=station.title,
            station_location=station.location,
            station_price_per_hour=station.price_per_hour,
            station_image=station.image,
            station_lat=station.lat,
            station_lng=station.lng,
            host_id=station.host_id,
            host_name=station.host_name,
            host_phone_number=contact_number,
            start_time=booking.start_time,
            status=booking.status,
            rating=booking.rating,
            review=booking.review,
            created_at=booking.created_at
        ))

    return results


@router.post('/bookings/complete', response_model=DriverBookingOut)
async def complete_booking(
    payload: CompleteBookingRequest,
    current_user: User = Depends(require_driver_profile),
    db: Session = Depends(get_db)
) -> DriverBookingOut:
    # Validate rating
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'INVALID_RATING', 'message': 'Rating must be between 1 and 5.'}
        )

    # Find booking
    booking = db.query(Booking).filter(
        Booking.id == payload.booking_id,
        Booking.driver_id == current_user.id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={'code': 'NOT_FOUND', 'message': 'Booking not found.'}
        )

    if booking.status == 'COMPLETED':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'ALREADY_COMPLETED', 'message': 'Booking is already completed.'}
        )

    if booking.status == 'CANCELLED':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'CANCELLED', 'message': 'Cannot complete a cancelled booking.'}
        )

    # Update booking
    booking.status = 'COMPLETED'
    booking.rating = payload.rating
    booking.review = payload.review

    # Commit the booking first so it's included in the count
    db.commit()
    db.refresh(booking)

    # Get station and host info
    station = db.query(Station).filter(Station.id == booking.station_id).first()
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={'code': 'STATION_NOT_FOUND', 'message': 'Station not found.'}
        )

    # Update station review count and average rating
    completed_bookings = db.query(Booking).filter(
        Booking.station_id == station.id,
        Booking.status == 'COMPLETED',
        Booking.rating.isnot(None)
    ).all()
    
    if completed_bookings:
        total_rating = sum(b.rating for b in completed_bookings if b.rating)
        station.review_count = len(completed_bookings)
        station.rating = round(total_rating / len(completed_bookings), 1)

    host = db.query(User).filter(User.id == station.host_id).first()
    if not host:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={'code': 'HOST_NOT_FOUND', 'message': 'Host not found.'}
        )

    db.commit()
    db.refresh(station)

    contact_number = station.phone_number or host.phone_number
    return DriverBookingOut(
        id=booking.id,
        station_id=station.id,
        station_title=station.title,
        station_location=station.location,
        station_price_per_hour=station.price_per_hour,
        station_image=station.image,
        station_lat=station.lat,
        station_lng=station.lng,
        host_id=station.host_id,
        host_name=station.host_name,
        host_phone_number=contact_number,
        start_time=booking.start_time,
        status=booking.status,
        rating=booking.rating,
        review=booking.review,
        created_at=booking.created_at
    )


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

    if not payload.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'MISSING_TIME_SLOT', 'message': 'Start time is required to book a station.'}
        )

    existing_booking = db.query(Booking).filter(
        Booking.station_id == station.id,
        Booking.status == 'ACTIVE',
        Booking.start_time == payload.start_time
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
        start_time=payload.start_time
    ))

    station.monthly_earnings += station.price_per_hour
    db.commit()
    db.refresh(station)

    distance_value = None
    if payload.user_lat is not None and payload.user_lng is not None:
        distance_value = distance_km(payload.user_lat, payload.user_lng, station.lat, station.lng)

    booked_slots = _fetch_booked_slots(db, [station.id])
    return build_station_out(station, distance_value, booked_slots.get(station.id, []))


@router.get('/stations/{station_id}/reviews', response_model=list[StationReview])
async def get_station_reviews(
    station_id: str,
    db: Session = Depends(get_db)
) -> list[StationReview]:
    """Get all reviews for a specific station"""
    reviews = db.query(Booking).filter(
        Booking.station_id == station_id,
        Booking.status == 'COMPLETED',
        Booking.rating.isnot(None)
    ).order_by(Booking.created_at.desc()).all()

    return [
        StationReview(
            driver_name=booking.driver_name,
            rating=booking.rating,
            review=booking.review,
            created_at=booking.created_at
        )
        for booking in reviews
    ]
