from datetime import datetime, timedelta
from typing import Any
import hashlib
import secrets
import bcrypt
from jose import jwt
from app.core.config import get_settings

settings = get_settings()


def _normalize_password(password: str) -> bytes:
    raw = password.encode('utf-8')
    if len(raw) > 72:
        return hashlib.sha256(raw).digest()
    return raw


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=settings.bcrypt_rounds)
    return bcrypt.hashpw(_normalize_password(password), salt).decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(_normalize_password(password), password_hash.encode('utf-8'))


def create_access_token(data: dict[str, Any], expires_minutes: int | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes or settings.access_token_expire_minutes)
    to_encode.update({'exp': expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm='HS256')


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret_key, algorithms=['HS256'])


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()
