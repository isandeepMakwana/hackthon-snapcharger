from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.db import init_db
from app.rate_limit import limiter


def create_app() -> FastAPI:
    load_dotenv()
    init_db()
    app = FastAPI()

    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def security_headers_middleware(request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/api/drivers") or request.url.path.startswith("/api/hosts"):
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Referrer-Policy"] = "no-referrer"
            response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"
        return response

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=429,
            content={
                "detail": {
                    "code": "RATE_LIMITED",
                    "message": "Too many requests. Please try again later.",
                }
            },
        )

    from app.routers import host, driver
    from app.routers import driver_auth, host_auth

    app.include_router(host.router, prefix="/api/host", tags=["Host"])
    app.include_router(driver.router, prefix="/api/driver", tags=["Driver"])
    app.include_router(driver_auth.router, prefix="/api/drivers", tags=["Drivers"])
    app.include_router(host_auth.router, prefix="/api/hosts", tags=["Hosts"])

    @app.get("/")
    def read_root():
        return {"status": "SnapCharge API is Live (JSON Mode) ⚡"}

    return app


app = create_app()
