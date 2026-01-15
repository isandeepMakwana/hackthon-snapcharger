from pydantic import BaseModel, EmailStr, Field, constr, ConfigDict
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


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    detail: ErrorDetail


class AuthToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class DriverRegisterRequest(BaseModel):
    model_config = ConfigDict(validate_by_name=True)

    name: constr(min_length=2, max_length=100)
    email: EmailStr
    password: constr(min_length=8, max_length=128)
    vehicle_model: str = Field(..., alias="vehicleModel")


class DriverLoginRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=8, max_length=128)


class DriverPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    vehicle_model: str
    created_at: datetime


class DriverAuthResponse(BaseModel):
    user: DriverPublic
    token: AuthToken


class HostRegisterRequest(BaseModel):
    model_config = ConfigDict(validate_by_name=True)

    name: constr(min_length=2, max_length=100)
    email: EmailStr
    password: constr(min_length=8, max_length=128)
    parking_type: str = Field(..., alias="parkingType")


class HostLoginRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=8, max_length=128)


class HostPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    parking_type: str
    created_at: datetime


class HostAuthResponse(BaseModel):
    user: HostPublic
    token: AuthToken
