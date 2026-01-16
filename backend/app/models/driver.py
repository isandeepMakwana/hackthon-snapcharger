from datetime import date
from typing import Optional
from pydantic import Field
from app.models.base import CamelModel


class BookingRequest(CamelModel):
    station_id: str = Field(min_length=1)
    booking_date: date
    start_time: Optional[str] = None
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None


class DriverLocation(CamelModel):
    name: str
    lat: float
    lng: float


class DriverFilterTag(CamelModel):
    id: str
    label: str


class DriverStatusOption(CamelModel):
    value: str
    label: str


class DriverLegendItem(CamelModel):
    status: str
    label: str


class DriverVehicleTypeOption(CamelModel):
    value: str
    label: str


class BookingConfig(CamelModel):
    service_fee: int = Field(ge=0)
    time_slots: list[str]
    slot_duration_minutes: int = Field(ge=15, le=360)


class DriverConfig(CamelModel):
    location: DriverLocation
    location_label: str
    search_radius_km: float = Field(gt=0)
    display_radius_km: float = Field(gt=0)
    personalized_label: str
    search_placeholder: str
    filter_tags: list[DriverFilterTag]
    status_options: list[DriverStatusOption]
    vehicle_type_options: list[DriverVehicleTypeOption]
    legend: list[DriverLegendItem]
    booking: BookingConfig
