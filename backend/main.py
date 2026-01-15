from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import host, driver
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(host.router, prefix="/api/host", tags=["Host"])
app.include_router(driver.router, prefix="/api/driver", tags=["Driver"])

@app.get("/")
def read_root():
    return {"status": "SnapCharge API is Live (JSON Mode) ⚡"}