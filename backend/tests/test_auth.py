import uuid

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "auth.db"
    monkeypatch.setenv("AUTH_DB_PATH", str(db_path))
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    monkeypatch.setenv("JWT_EXPIRES_MINUTES", "60")
    monkeypatch.setenv("AUTH_RATE_LIMIT", "5/minute")

    from main import create_app

    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def _driver_payload(email: str):
    return {
        "name": "Driver One",
        "email": email,
        "password": "StrongPass123",
        "vehicle_model": "Tata Nexon EV",
    }


def _host_payload(email: str):
    return {
        "name": "Host One",
        "email": email,
        "password": "StrongPass123",
        "parking_type": "covered",
    }


def test_driver_register_login_and_me(client):
    email = f"driver-{uuid.uuid4()}@example.com"
    register_response = client.post("/api/drivers/register", json=_driver_payload(email))
    assert register_response.status_code == 201
    register_body = register_response.json()
    assert register_body["user"]["email"] == email
    assert "access_token" in register_body["token"]
    assert register_response.headers.get("X-Content-Type-Options") == "nosniff"
    assert register_response.headers.get("X-Frame-Options") == "DENY"

    login_response = client.post(
        "/api/drivers/login",
        json={"email": email, "password": "StrongPass123"},
    )
    assert login_response.status_code == 200
    login_body = login_response.json()
    token = login_body["token"]["access_token"]

    me_response = client.get(
        "/api/drivers/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == email


def test_driver_register_duplicate_email(client):
    email = f"driver-{uuid.uuid4()}@example.com"
    response = client.post("/api/drivers/register", json=_driver_payload(email))
    assert response.status_code == 201

    duplicate_response = client.post("/api/drivers/register", json=_driver_payload(email))
    assert duplicate_response.status_code == 409
    detail = duplicate_response.json().get("detail")
    assert detail["code"] == "EMAIL_EXISTS"


def test_driver_login_invalid_password(client):
    email = f"driver-{uuid.uuid4()}@example.com"
    response = client.post("/api/drivers/register", json=_driver_payload(email))
    assert response.status_code == 201

    login_response = client.post(
        "/api/drivers/login",
        json={"email": email, "password": "WrongPass123"},
    )
    assert login_response.status_code == 401
    detail = login_response.json().get("detail")
    assert detail["code"] == "INVALID_CREDENTIALS"


def test_host_login_rate_limit_and_me(client):
    email = f"host-{uuid.uuid4()}@example.com"
    register_response = client.post("/api/hosts/register", json=_host_payload(email))
    assert register_response.status_code == 201

    login_payload = {"email": email, "password": "StrongPass123"}
    first_login = client.post("/api/hosts/login", json=login_payload)
    assert first_login.status_code == 200
    token = first_login.json()["token"]["access_token"]

    me_response = client.get(
        "/api/hosts/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == email

    for _ in range(4):
        response = client.post("/api/hosts/login", json=login_payload)
        assert response.status_code == 200

    limited_response = client.post("/api/hosts/login", json=login_payload)
    assert limited_response.status_code == 429
    detail = limited_response.json().get("detail")
    assert detail["code"] == "RATE_LIMITED"
