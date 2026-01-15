import sqlite3
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request, status, Depends

from app.auth_dependencies import get_current_driver
from app.config import get_auth_rate_limit
from app.db import create_driver, get_driver_by_email
from app.errors import auth_error
from app.models import (
    DriverRegisterRequest,
    DriverLoginRequest,
    DriverAuthResponse,
    DriverPublic,
    AuthToken,
    ErrorResponse,
)
from app.rate_limit import limiter
from app.security import create_access_token, hash_password, verify_password

router = APIRouter()


@router.post(
    "/register",
    response_model=DriverAuthResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        409: {"model": ErrorResponse, "description": "Email already registered"},
        429: {"model": ErrorResponse, "description": "Too many requests"},
    },
)
@limiter.limit(get_auth_rate_limit())
async def register_driver(request: Request, payload: DriverRegisterRequest) -> DriverAuthResponse:
    email = payload.email.lower().strip()
    if get_driver_by_email(email):
        raise auth_error(409, "EMAIL_EXISTS", "Email is already registered.")

    driver_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    try:
        create_driver(
            driver_id=driver_id,
            name=payload.name.strip(),
            email=email,
            password_hash=hash_password(payload.password),
            vehicle_model=payload.vehicle_model.strip(),
            created_at=created_at,
        )
    except sqlite3.IntegrityError:
        raise auth_error(409, "EMAIL_EXISTS", "Email is already registered.")

    token, expires_in = create_access_token(driver_id, "driver")
    user = DriverPublic(
        id=driver_id,
        name=payload.name.strip(),
        email=email,
        vehicle_model=payload.vehicle_model.strip(),
        created_at=created_at,
    )
    return DriverAuthResponse(user=user, token=AuthToken(access_token=token, expires_in=expires_in))


@router.post(
    "/login",
    response_model=DriverAuthResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid credentials"},
        429: {"model": ErrorResponse, "description": "Too many requests"},
    },
)
@limiter.limit(get_auth_rate_limit())
async def login_driver(request: Request, payload: DriverLoginRequest) -> DriverAuthResponse:
    email = payload.email.lower().strip()
    record = get_driver_by_email(email)
    if not record or not verify_password(payload.password, record.get("password_hash", "")):
        raise auth_error(401, "INVALID_CREDENTIALS", "Invalid email or password.")

    token, expires_in = create_access_token(record["id"], "driver")
    user = DriverPublic(
        id=record["id"],
        name=record["name"],
        email=record["email"],
        vehicle_model=record["vehicle_model"],
        created_at=record["created_at"],
    )
    return DriverAuthResponse(user=user, token=AuthToken(access_token=token, expires_in=expires_in))


@router.get(
    "/me",
    response_model=DriverPublic,
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Role mismatch"},
        404: {"model": ErrorResponse, "description": "User not found"},
        429: {"model": ErrorResponse, "description": "Too many requests"},
    },
)
@limiter.limit(get_auth_rate_limit())
async def get_driver_profile(
    request: Request,
    current_driver=Depends(get_current_driver),
) -> DriverPublic:
    return DriverPublic(
        id=current_driver["id"],
        name=current_driver["name"],
        email=current_driver["email"],
        vehicle_model=current_driver["vehicle_model"],
        created_at=current_driver["created_at"],
    )
