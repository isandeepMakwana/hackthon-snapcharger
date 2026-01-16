from datetime import datetime
from typing import Optional
from pydantic import Field
from app.models.base import CamelModel


class DriverProfileIn(CamelModel):
    vehicle_type: str = Field(min_length=2, max_length=5)
    vehicle_model: str = Field(min_length=2, max_length=120)
    vehicle_number: Optional[str] = Field(default=None, max_length=20)


class DriverProfileOut(CamelModel):
    id: str
    user_id: str
    vehicle_type: str
    vehicle_model: str
    vehicle_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class HostProfileIn(CamelModel):
    parking_type: str = Field(min_length=3, max_length=30)
    parking_address: Optional[str] = Field(default=None, max_length=255)


class HostProfileOut(CamelModel):
    id: str
    user_id: str
    parking_type: str
    parking_address: Optional[str] = None
    created_at: datetime
    updated_at: datetime
