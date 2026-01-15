from fastapi import APIRouter
from typing import List
from app.models import BookingCreate, BookingResponse, StationFrontend
from app.utils import read_db
from geopy.distance import geodesic
import uuid

router = APIRouter()


@router.get("/search", response_model=List[StationFrontend])
async def search_nearby(lat: float, lng: float, radius_km: int = 5):
    user_location = (lat, lng)
    nearby_stations = []
    stations = read_db()

    for data in stations:
        if data.get("status") == "OFFLINE":
            continue

        station_lat = data.get("lat")
        station_lng = data.get("lng")
        if station_lat is None or station_lng is None:
            continue

        station_loc = (station_lat, station_lng)
        distance_km = geodesic(user_location, station_loc).km

        if distance_km <= radius_km:
            data = dict(data)
            data["distance"] = f"{round(distance_km, 1)} km"
            nearby_stations.append(data)

    return nearby_stations


@router.post("/book", response_model=BookingResponse)
async def create_booking(booking: BookingCreate):
    booking_id = str(uuid.uuid4())
    booking_data = booking.dict()
    booking_data["booking_id"] = booking_id
    booking_data["status"] = "CONFIRMED"
    return booking_data
