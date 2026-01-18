from typing import Optional
from pydantic import Field
from app.models.base import CamelModel
from app.models.station import StationOut


class AvailabilitySummary(CamelModel):
    available: int
    busy: int
    offline: int
    total: int


class LocationSearchResult(CamelModel):
    label: str
    lat: float
    lng: float
    availability: AvailabilitySummary


class TripStopIn(CamelModel):
    label: str = Field(min_length=1)
    lat: float
    lng: float
    source: str = Field(min_length=1)


class TripPlanRequest(CamelModel):
    stops: list[TripStopIn]
    vehicle_type: Optional[str] = None
    corridor_km: Optional[float] = Field(default=None, gt=0)


class TripLegOut(CamelModel):
    from_label: str
    to_label: str
    distance_km: float
    duration_min: float


class TripRouteOut(CamelModel):
    distance_km: float
    duration_min: float
    polyline: str
    bbox: list[float]
    legs: list[TripLegOut]


class RouteStationOut(CamelModel):
    station: StationOut
    distance_to_route_km: float
    distance_from_start_km: float
    eta_from_start_min: float
    estimated_charge_min: int
    capacity_ports: int
    available_ports: int


class TripPlanResponse(CamelModel):
    route: TripRouteOut
    stations: list[RouteStationOut]
