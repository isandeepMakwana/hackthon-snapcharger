from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Tuple

import bcrypt
import jwt

from app.config import get_jwt_algorithm, get_jwt_exp_minutes, get_jwt_secret


def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: str, role: str) -> Tuple[str, int]:
    expires_minutes = get_jwt_exp_minutes()
    expires_delta = timedelta(minutes=expires_minutes)
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    token = jwt.encode(payload, get_jwt_secret(), algorithm=get_jwt_algorithm())
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token, int(expires_delta.total_seconds())


def decode_access_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, get_jwt_secret(), algorithms=[get_jwt_algorithm()])
