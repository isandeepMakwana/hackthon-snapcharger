from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from starlette import status
from app.api.deps import get_db, require_host_profile, require_role
from app.api.utils.stations import build_station_out
from app.db.models.booking import Booking
from app.db.models.station import Station
from app.db.models.user import User
from app.db.seed import ensure_demo_stations_for_host
from app.models.booking import HostBookingOut
from app.models.station import HostStats, StationCreate, StationOut, StationStatus, StationUpdate

from typing import List
import uuid
from io import BytesIO
from app.api.utils.ai_service import analyze_multiple_images, optimize_image_for_gemini
from app.api.utils.s3_service import upload_file_to_s3

router = APIRouter(prefix='/api/host', tags=['host'])


@router.get('/stats', response_model=HostStats)
async def get_stats(
    current_user: User = Depends(require_host_profile),
    db: Session = Depends(get_db)
) -> HostStats:
    ensure_demo_stations_for_host(db, current_user)
    stations = db.query(Station).filter(Station.host_id == current_user.id).all()

    if not stations:
        return HostStats(total_earnings=0, active_bookings=0, station_health=0)

    total_earnings = sum(station.monthly_earnings for station in stations)
    active_bookings = db.query(Booking).filter(
        Booking.host_id == current_user.id,
        Booking.status == 'ACTIVE'
    ).count()
    online = sum(1 for station in stations if station.status != StationStatus.OFFLINE.value)
    station_health = round((online / len(stations)) * 100)

    return HostStats(
        total_earnings=total_earnings,
        active_bookings=active_bookings,
        station_health=station_health
    )


@router.get('/stations', response_model=list[StationOut])
async def list_stations(
    current_user: User = Depends(require_host_profile),
    db: Session = Depends(get_db)
) -> list[StationOut]:
    # ensure_demo_stations_for_host(db, current_user)
    stations = db.query(Station).filter(Station.host_id == current_user.id).order_by(
        Station.created_at.desc()
    ).all()
    return [build_station_out(station) for station in stations]


@router.post('/stations', response_model=StationOut, status_code=status.HTTP_201_CREATED)
async def create_station(
    payload: StationCreate,
    current_user: User = Depends(require_host_profile),
    db: Session = Depends(get_db)
) -> StationOut:
    image = payload.image.strip() if payload.image else ''
    if not image:
        image = 'https://picsum.photos/400/300?random=99'
    station_phone = payload.phone_number.strip() if payload.phone_number else current_user.phone_number

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
        phone_number=station_phone,
        supported_vehicle_types=payload.supported_vehicle_types,
        monthly_earnings=payload.monthly_earnings
    )
    db.add(station)
    db.commit()
    db.refresh(station)

    return build_station_out(station)


@router.get('/bookings', response_model=list[HostBookingOut])
async def list_bookings(
    current_user: User = Depends(require_host_profile),
    db: Session = Depends(get_db)
) -> list[HostBookingOut]:
    rows = db.query(Booking, Station).join(
        Station, Booking.station_id == Station.id
    ).filter(
        Booking.host_id == current_user.id
    ).order_by(Booking.created_at.desc()).all()

    results: list[HostBookingOut] = []
    for booking, station in rows:
        results.append(HostBookingOut(
            id=booking.id,
            station_id=booking.station_id,
            station_title=station.title,
            station_location=station.location,
            station_price_per_hour=station.price_per_hour,
            driver_id=booking.driver_id,
            driver_name=booking.driver_name,
            driver_phone_number=booking.driver_phone_number,
            start_time=booking.start_time,
            status=booking.status,
            created_at=booking.created_at
        ))

    return results


@router.patch('/stations/{station_id}', response_model=StationOut)
async def update_station(
    station_id: str,
    payload: StationUpdate,
    current_user: User = Depends(require_host_profile),
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

    status_update = updates.get('status')
    for key, value in updates.items():
        setattr(station, key, value)

    if status_update == StationStatus.OFFLINE.value:
        db.query(Booking).filter(
            Booking.station_id == station.id,
            Booking.status == 'ACTIVE'
        ).update({Booking.status: 'CANCELLED'})

    db.commit()
    db.refresh(station)

    return build_station_out(station)


@router.post('/analyze-photo')
async def analyze_photo(
    current_user: User = Depends(require_host_profile),
    files: List[UploadFile] = File(...)
) -> dict:
    """
    Process station images:
    1. Optimize (Resize/Compress) to save data.
    2. Upload to S3 for permanent storage.
    3. Analyze with Gemini for technical specs.
    """
    try:
        print(f"📸 Received {len(files)} files for processing")
        
        # 1. Prepare lists
        optimized_images = []
        s3_urls = []
        
        # 2. Process Files Loop (Optimize & Upload)
        for idx, file in enumerate(files):
            print(f"Processing file {idx + 1}/{len(files)}: {file.filename}")
            raw_content = await file.read()
            
            # Optimize
            optimized_content = optimize_image_for_gemini(raw_content)
            optimized_images.append(optimized_content)  # Save for AI
            print(f"✅ Optimized file {idx + 1}")
            
            # Upload to S3
            # Use User ID in filename to prevent collisions/overwrites
            filename = f"{current_user.id}_{uuid.uuid4()}.jpg"
            s3_url = upload_file_to_s3(BytesIO(optimized_content), filename)
            
            if not s3_url:
                print(f"❌ S3 upload failed for file {idx + 1}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={'code': 'UPLOAD_FAILED', 'message': f'S3 Upload Failed for file {idx + 1}'}
                )
            
            print(f"✅ Uploaded to S3: {s3_url}")
            s3_urls.append(s3_url)

        # 3. Call AI ONCE with ALL images
        # This enables "Multi-Image Synthesis"
        print(f"🤖 Analyzing {len(optimized_images)} images with AI...")
        ai_data = await analyze_multiple_images(optimized_images)
        
        if not ai_data:
            # Fallback if AI fails
            print("⚠️ AI analysis returned no data, using fallback")
            ai_data = {
                "socket_type": "UNKNOWN",
                "marketing_description": "Manual verification required."
            }
        else:
            print(f"✅ AI analysis complete: {ai_data.get('socket_type', 'N/A')}")

        # 4. Return aggregated result
        result = {
            "image_urls": s3_urls,  # Return all URLs
            "ai_data": ai_data      # Single synthesized result
        }
        print(f"📤 Returning response with {len(s3_urls)} URLs")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in analyze_photo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={'code': 'PROCESSING_ERROR', 'message': str(e)}
        )