from enum import Enum
from typing import Optional
from pydantic import Field
from app.models.base import CamelModel


class StationStatus(str, Enum):
    AVAILABLE = 'AVAILABLE'
    BUSY = 'BUSY'
    OFFLINE = 'OFFLINE'


class Coordinates(CamelModel):
    x: float
    y: float


class StationCreate(CamelModel):
    title: str = Field(min_length=3, max_length=160)
    location: str = Field(min_length=2, max_length=255)
    description: str = Field(default='')
    connector_type: str = Field(min_length=2, max_length=60)
    power_output: str = Field(min_length=2, max_length=60)
    price_per_hour: int = Field(ge=0)
    image: str = Field(default='')  # URL from S3 or external source
    lat: float
    lng: float
    phone_number: Optional[str] = Field(default=None, max_length=30)
    host_name: Optional[str] = Field(default=None, max_length=120)
    supported_vehicle_types: list[str] = Field(default_factory=lambda: ['2W', '4W'])
    rating: float = Field(default=0.0, ge=0, le=5)
    review_count: int = Field(default=0, ge=0)
    status: StationStatus = StationStatus.AVAILABLE
    monthly_earnings: int = Field(default=0, ge=0)


class StationUpdate(CamelModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=160)
    location: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = None
    connector_type: Optional[str] = Field(default=None, min_length=2, max_length=60)
    power_output: Optional[str] = Field(default=None, min_length=2, max_length=60)
    price_per_hour: Optional[int] = Field(default=None, ge=0)
    image: Optional[str] = Field(default=None)
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone_number: Optional[str] = Field(default=None, max_length=30)
    supported_vehicle_types: Optional[list[str]] = None
    rating: Optional[float] = Field(default=None, ge=0, le=5)
    review_count: Optional[int] = Field(default=None, ge=0)
    status: Optional[StationStatus] = None
    monthly_earnings: Optional[int] = Field(default=None, ge=0)


class StationOut(CamelModel):
    id: str
    host_name: str
    title: str
    location: str
    rating: float
    review_count: int
    price_per_hour: int
    status: StationStatus
    image: str
    connector_type: str
    power_output: str
    description: str
    coords: Coordinates
    lat: float
    lng: float
    distance: str
    phone_number: Optional[str] = None
    supported_vehicle_types: list[str] = Field(default_factory=list)
    booked_time_slots: list[str] = Field(default_factory=list)


class HostStats(CamelModel):
    total_earnings: int
    active_bookings: int
    station_health: int
