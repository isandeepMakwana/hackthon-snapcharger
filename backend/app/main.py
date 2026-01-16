from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, users, host, driver, profile
from app.core.config import get_settings
from app.core.exceptions import (
    http_exception_handler,
    internal_exception_handler,
    validation_exception_handler
)
from app.db.session import init_db
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

settings = get_settings()

app = FastAPI(title=settings.app_name)

origins = [origin.strip() for origin in settings.cors_origins.split(',') if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, internal_exception_handler)


@app.on_event('startup')
def on_startup() -> None:
    init_db()


@app.get('/health')
def health_check() -> dict:
    return {'status': 'ok'}


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(host.router)
app.include_router(driver.router)
app.include_router(profile.router)
