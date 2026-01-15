from typing import Dict, Any

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt

from app.db import get_driver_by_id, get_host_by_id
from app.errors import auth_error
from app.security import decode_access_token

security = HTTPBearer(auto_error=False)


def _validate_token(credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
    if credentials is None:
        raise auth_error(401, "AUTH_MISSING", "Authorization header missing.")
    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise auth_error(401, "TOKEN_EXPIRED", "Token has expired.")
    except jwt.InvalidTokenError:
        raise auth_error(401, "TOKEN_INVALID", "Token is invalid.")
    return payload


def get_current_driver(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    payload = _validate_token(credentials)
    if payload.get("role") != "driver":
        raise auth_error(403, "ROLE_MISMATCH", "Driver credentials required.")
    driver_id = payload.get("sub")
    if not driver_id:
        raise auth_error(401, "TOKEN_INVALID", "Token payload missing subject.")
    driver = get_driver_by_id(driver_id)
    if not driver:
        raise auth_error(404, "USER_NOT_FOUND", "Driver account not found.")
    return driver


def get_current_host(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    payload = _validate_token(credentials)
    if payload.get("role") != "host":
        raise auth_error(403, "ROLE_MISMATCH", "Host credentials required.")
    host_id = payload.get("sub")
    if not host_id:
        raise auth_error(401, "TOKEN_INVALID", "Token payload missing subject.")
    host = get_host_by_id(host_id)
    if not host:
        raise auth_error(404, "USER_NOT_FOUND", "Host account not found.")
    return host
