from datetime import datetime
from enum import Enum
from typing import Optional
from app.models.base import CamelModel


class BookingStatus(str, Enum):
    ACTIVE = 'ACTIVE'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'


class HostBookingOut(CamelModel):
    id: str
    station_id: str
    station_title: str
    station_location: str
    station_price_per_hour: int
    driver_id: str
    driver_name: str
    driver_phone_number: str
    start_time: Optional[str] = None
    status: BookingStatus
    created_at: datetime
