import sqlite3
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from app.config import get_auth_db_path


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return dict(row) if row else {}


def get_connection() -> sqlite3.Connection:
    db_path = get_auth_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS drivers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                vehicle_model TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS hosts (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                parking_type TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def create_driver(
    *,
    driver_id: str,
    name: str,
    email: str,
    password_hash: str,
    vehicle_model: str,
    created_at: Optional[str] = None,
) -> None:
    timestamp = created_at or datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO drivers (id, name, email, password_hash, vehicle_model, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (driver_id, name, email, password_hash, vehicle_model, timestamp),
        )


def create_host(
    *,
    host_id: str,
    name: str,
    email: str,
    password_hash: str,
    parking_type: str,
    created_at: Optional[str] = None,
) -> None:
    timestamp = created_at or datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO hosts (id, name, email, password_hash, parking_type, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (host_id, name, email, password_hash, parking_type, timestamp),
        )


def get_driver_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM drivers WHERE email = ?",
            (email,),
        ).fetchone()
    return _row_to_dict(row) if row else None


def get_host_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM hosts WHERE email = ?",
            (email,),
        ).fetchone()
    return _row_to_dict(row) if row else None


def get_driver_by_id(driver_id: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM drivers WHERE id = ?",
            (driver_id,),
        ).fetchone()
    return _row_to_dict(row) if row else None


def get_host_by_id(host_id: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM hosts WHERE id = ?",
            (host_id,),
        ).fetchone()
    return _row_to_dict(row) if row else None
