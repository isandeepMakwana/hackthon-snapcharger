from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from starlette import status
from app.api.deps import get_current_user, get_db
from app.db.models.driver_profile import DriverProfile
from app.db.models.host_profile import HostProfile
from app.db.models.user import User
from app.models.profile import DriverProfileIn, DriverProfileOut, HostProfileIn, HostProfileOut

VALID_VEHICLE_TYPES = {'2W', '4W'}
VALID_PARKING_TYPES = {'covered', 'open', 'shared'}

router = APIRouter(prefix='/api/profile', tags=['profile'])


@router.get('/driver', response_model=DriverProfileOut)
async def get_driver_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> DriverProfileOut:
    profile = db.query(DriverProfile).filter(DriverProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={'code': 'NOT_FOUND', 'message': 'Driver profile not found.'}
        )
    return DriverProfileOut.model_validate(profile)


@router.put('/driver', response_model=DriverProfileOut)
async def upsert_driver_profile(
    payload: DriverProfileIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> DriverProfileOut:
    if payload.vehicle_type not in VALID_VEHICLE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'VALIDATION_ERROR', 'message': 'Invalid vehicle type.'}
        )
    profile = db.query(DriverProfile).filter(DriverProfile.user_id == current_user.id).first()
    if profile:
        profile.vehicle_type = payload.vehicle_type
        profile.vehicle_model = payload.vehicle_model
        profile.vehicle_number = payload.vehicle_number
    else:
        profile = DriverProfile(
            user_id=current_user.id,
            vehicle_type=payload.vehicle_type,
            vehicle_model=payload.vehicle_model,
            vehicle_number=payload.vehicle_number
        )
        db.add(profile)
    db.commit()
    db.refresh(profile)
    return DriverProfileOut.model_validate(profile)


@router.get('/host', response_model=HostProfileOut)
async def get_host_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> HostProfileOut:
    profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={'code': 'NOT_FOUND', 'message': 'Host profile not found.'}
        )
    return HostProfileOut.model_validate(profile)


@router.put('/host', response_model=HostProfileOut)
async def upsert_host_profile(
    payload: HostProfileIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> HostProfileOut:
    if payload.parking_type not in VALID_PARKING_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'VALIDATION_ERROR', 'message': 'Invalid parking type.'}
        )
    profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()
    if profile:
        profile.parking_type = payload.parking_type
        profile.parking_address = payload.parking_address
    else:
        profile = HostProfile(
            user_id=current_user.id,
            parking_type=payload.parking_type,
            parking_address=payload.parking_address
        )
        db.add(profile)
    db.commit()
    db.refresh(profile)
    return HostProfileOut.model_validate(profile)
