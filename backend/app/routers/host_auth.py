import sqlite3
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request, status, Depends

from app.auth_dependencies import get_current_host
from app.config import get_auth_rate_limit
from app.db import create_host, get_host_by_email
from app.errors import auth_error
from app.models import (
    HostRegisterRequest,
    HostLoginRequest,
    HostAuthResponse,
    HostPublic,
    AuthToken,
    ErrorResponse,
)
from app.rate_limit import limiter
from app.security import create_access_token, hash_password, verify_password

router = APIRouter()


@router.post(
    "/register",
    response_model=HostAuthResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        409: {"model": ErrorResponse, "description": "Email already registered"},
        429: {"model": ErrorResponse, "description": "Too many requests"},
    },
)
@limiter.limit(get_auth_rate_limit())
async def register_host(request: Request, payload: HostRegisterRequest) -> HostAuthResponse:
    email = payload.email.lower().strip()
    if get_host_by_email(email):
        raise auth_error(409, "EMAIL_EXISTS", "Email is already registered.")

    host_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    try:
        create_host(
            host_id=host_id,
            name=payload.name.strip(),
            email=email,
            password_hash=hash_password(payload.password),
            parking_type=payload.parking_type.strip(),
            created_at=created_at,
        )
    except sqlite3.IntegrityError:
        raise auth_error(409, "EMAIL_EXISTS", "Email is already registered.")

    token, expires_in = create_access_token(host_id, "host")
    user = HostPublic(
        id=host_id,
        name=payload.name.strip(),
        email=email,
        parking_type=payload.parking_type.strip(),
        created_at=created_at,
    )
    return HostAuthResponse(user=user, token=AuthToken(access_token=token, expires_in=expires_in))


@router.post(
    "/login",
    response_model=HostAuthResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid credentials"},
        429: {"model": ErrorResponse, "description": "Too many requests"},
    },
)
@limiter.limit(get_auth_rate_limit())
async def login_host(request: Request, payload: HostLoginRequest) -> HostAuthResponse:
    email = payload.email.lower().strip()
    record = get_host_by_email(email)
    if not record or not verify_password(payload.password, record.get("password_hash", "")):
        raise auth_error(401, "INVALID_CREDENTIALS", "Invalid email or password.")

    token, expires_in = create_access_token(record["id"], "host")
    user = HostPublic(
        id=record["id"],
        name=record["name"],
        email=record["email"],
        parking_type=record["parking_type"],
        created_at=record["created_at"],
    )
    return HostAuthResponse(user=user, token=AuthToken(access_token=token, expires_in=expires_in))


@router.get(
    "/me",
    response_model=HostPublic,
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Role mismatch"},
        404: {"model": ErrorResponse, "description": "User not found"},
        429: {"model": ErrorResponse, "description": "Too many requests"},
    },
)
@limiter.limit(get_auth_rate_limit())
async def get_host_profile(
    request: Request,
    current_host=Depends(get_current_host),
) -> HostPublic:
    return HostPublic(
        id=current_host["id"],
        name=current_host["name"],
        email=current_host["email"],
        parking_type=current_host["parking_type"],
        created_at=current_host["created_at"],
    )
