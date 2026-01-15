from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"


def get_auth_db_path() -> Path:
    env_path = os.getenv("AUTH_DB_PATH")
    if env_path:
        return Path(env_path).expanduser()
    return DATA_DIR / "auth.db"


def get_jwt_secret() -> str:
    return os.getenv("JWT_SECRET", "dev-secret-change-me")


def get_jwt_algorithm() -> str:
    return os.getenv("JWT_ALGORITHM", "HS256")


def get_jwt_exp_minutes() -> int:
    value = os.getenv("JWT_EXPIRES_MINUTES", "1440")
    try:
        return int(value)
    except ValueError:
        return 1440


def get_auth_rate_limit() -> str:
    return os.getenv("AUTH_RATE_LIMIT", "5/minute")
