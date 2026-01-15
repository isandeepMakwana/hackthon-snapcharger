from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum


class StationStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    OFFLINE = "OFFLINE"


class Coordinates(BaseModel):
    x: int = 50
    y: int = 50


class StationFrontendBase(BaseModel):
    hostName: str = "Current User"
    title: str
    location: str = "Pune"
    description: str
    connectorType: str
    powerOutput: str
    pricePerHour: float
    image: str = ""
    lat: float = 18.5204
    lng: float = 73.8567
    phoneNumber: Optional[str] = None


class StationFrontendCreate(StationFrontendBase):
    pass


class StationFrontend(StationFrontendBase):
    id: str
    status: StationStatus = StationStatus.AVAILABLE
    rating: float = 0.0
    reviewCount: int = 0
    coords: Coordinates = Coordinates()
    distance: str = "0.1 km"


class BookingCreate(BaseModel):
    station_id: str
    driver_id: str
    start_time: datetime
    duration_minutes: int
    amount: float


class BookingResponse(BookingCreate):
    booking_id: str
    status: str
    payment_id: str
