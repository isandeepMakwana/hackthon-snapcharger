from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from app.services.ai_service import analyze_charger_image
from app.services.s3_services import upload_file_to_s3
from app.models import StationFrontendCreate, StationFrontend
from app.utils import add_station_to_db, read_db
import uuid
from io import BytesIO

router = APIRouter()


@router.post("/analyze-photo")
async def analyze_photo(file: UploadFile = File(...)):
    content = await file.read()
    filename = f"{uuid.uuid4()}.jpg"
    s3_url = upload_file_to_s3(BytesIO(content), filename)
    ai_result = await analyze_charger_image(content)
    return {"image_url": s3_url, "ai_data": ai_result}


@router.post("/stations", response_model=StationFrontend)
async def create_station(station: StationFrontendCreate):
    station_id = str(uuid.uuid4())
    station_full = StationFrontend(id=station_id, **station.dict())
    data = station_full.dict()
    add_station_to_db(data)
    return data


@router.get("/my-stations/{host_id}", response_model=List[StationFrontend])
async def get_my_stations(host_id: str):
    all_stations = read_db()
    my_stations = [s for s in all_stations if s.get("hostName") == host_id]
    return my_stations
