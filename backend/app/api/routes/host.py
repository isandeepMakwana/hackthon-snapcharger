from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from starlette import status
from app.api.deps import get_db, require_role
from app.db.models.station import Station
from app.db.models.user import User
from app.db.seed import ensure_demo_stations_for_host
from app.models.station import HostStats, StationCreate, StationOut, StationStatus, StationUpdate

router = APIRouter(prefix='/api/host', tags=['host'])


def _coords_for_station(station: Station) -> dict:
    x = abs(int(station.lat * 10) % 100)
    y = abs(int(station.lng * 10) % 100)
    return {'x': float(x), 'y': float(y)}


def _station_to_out(station: Station, distance: str = '0.0 km') -> StationOut:
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
        'coords': _coords_for_station(station),
        'lat': station.lat,
        'lng': station.lng,
        'distance': distance,
        'phone_number': station.phone_number
    }
    return StationOut.model_validate(payload)


@router.get('/stats', response_model=HostStats)
async def get_stats(
    current_user: User = Depends(require_role('host', 'admin')),
    db: Session = Depends(get_db)
) -> HostStats:
    ensure_demo_stations_for_host(db, current_user)
    stations = db.query(Station).filter(Station.host_id == current_user.id).all()

    if not stations:
        return HostStats(total_earnings=0, active_bookings=0, station_health=0)

    total_earnings = sum(station.monthly_earnings for station in stations)
    active_bookings = sum(1 for station in stations if station.status == StationStatus.BUSY.value)
    online = sum(1 for station in stations if station.status != StationStatus.OFFLINE.value)
    station_health = round((online / len(stations)) * 100)

    return HostStats(
        total_earnings=total_earnings,
        active_bookings=active_bookings,
        station_health=station_health
    )


@router.get('/stations', response_model=list[StationOut])
async def list_stations(
    current_user: User = Depends(require_role('host', 'admin')),
    db: Session = Depends(get_db)
) -> list[StationOut]:
    ensure_demo_stations_for_host(db, current_user)
    stations = db.query(Station).filter(Station.host_id == current_user.id).order_by(
        Station.created_at.desc()
    ).all()
    return [_station_to_out(station) for station in stations]


@router.post('/stations', response_model=StationOut, status_code=status.HTTP_201_CREATED)
async def create_station(
    payload: StationCreate,
    current_user: User = Depends(require_role('host', 'admin')),
    db: Session = Depends(get_db)
) -> StationOut:
    image = payload.image.strip() if payload.image else ''
    if not image:
        image = 'https://picsum.photos/400/300?random=99'

    station = Station(
        host_id=current_user.id,
        host_name=current_user.username,
        title=payload.title,
        location=payload.location,
        rating=payload.rating,
        review_count=payload.review_count,
        price_per_hour=payload.price_per_hour,
        status=payload.status.value,
        image=image,
        connector_type=payload.connector_type,
        power_output=payload.power_output,
        description=payload.description,
        lat=payload.lat,
        lng=payload.lng,
        phone_number=payload.phone_number,
        monthly_earnings=payload.monthly_earnings
    )
    db.add(station)
    db.commit()
    db.refresh(station)

    return _station_to_out(station)


@router.patch('/stations/{station_id}', response_model=StationOut)
async def update_station(
    station_id: str,
    payload: StationUpdate,
    current_user: User = Depends(require_role('host', 'admin')),
    db: Session = Depends(get_db)
) -> StationOut:
    query = db.query(Station).filter(Station.id == station_id)
    if current_user.role != 'admin':
        query = query.filter(Station.host_id == current_user.id)
    station = query.first()

    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={'code': 'NOT_FOUND', 'message': 'Station not found.'}
        )

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'VALIDATION_ERROR', 'message': 'At least one field is required.'}
        )
    if 'status' in updates and isinstance(updates['status'], StationStatus):
        updates['status'] = updates['status'].value

    for key, value in updates.items():
        setattr(station, key, value)

    db.commit()
    db.refresh(station)

    return _station_to_out(station)


@router.post('/analyze-photo')
async def analyze_photo(
    current_user: User = Depends(require_role('host', 'admin')),
    file: UploadFile | None = File(default=None)
) -> dict:
    return {
        'ai_data': {
            'socket_type': 'TYPE_2_AC',
            'power_kw': 7.2,
            'marketing_description': 'Reliable home charger with secure access and easy parking.'
        }
    }
