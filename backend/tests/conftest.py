import os
import pytest
from fastapi.testclient import TestClient

os.environ.setdefault('JWT_SECRET_KEY', 'test-secret-key-1234567890123456789012')
os.environ.setdefault('JWT_REFRESH_SECRET_KEY', 'test-refresh-secret-key-1234567890123456789012')
os.environ.setdefault('DATABASE_URL', 'sqlite:///./test.db')
os.environ.setdefault('BCRYPT_ROUNDS', '4')
os.environ.setdefault('APP_BASE_URL', 'http://localhost:8000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:5173')
os.environ.setdefault('SEED_DEMO_DATA', 'false')

from app.main import app
from app.core.mailer import clear_email_log
from app.db.base import Base
from app.db.session import engine


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    clear_email_log()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    return TestClient(app)
