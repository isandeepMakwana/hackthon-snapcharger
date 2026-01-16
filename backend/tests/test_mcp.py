import os

os.environ['SNAPCHARGE_API_BASE_URL'] = 'http://testserver'
os.environ['SNAPCHARGE_WEB_BASE_URL'] = 'http://localhost:5173'
os.environ['SNAPCHARGE_MCP_USE_ASGI_APP'] = 'true'

import pytest

from app.mcp.server import (
    book_station,
    get_station_link,
    login_user,
    search_stations,
    upsert_driver_profile
)


def register_user(client, *, username: str, email: str, password: str = 'Password123!'):
    payload = {
        'username': username,
        'email': email,
        'password': password,
        'phoneNumber': '+919811112277'
    }
    response = client.post('/api/auth/register', json=payload)
    assert response.status_code == 201
    return response.json()


def create_host_profile(client, headers):
    response = client.put('/api/profile/host', json={
        'parkingType': 'covered',
        'parkingAddress': 'Pune'
    }, headers=headers)
    assert response.status_code == 200


def create_station_for_host(client, headers):
    payload = {
        'title': 'Central Plaza Station',
        'location': 'Pune',
        'description': 'Test station for MCP',
        'connectorType': 'Type 2',
        'powerOutput': '7.2kW',
        'pricePerHour': 150,
        'image': 'https://picsum.photos/400/300?random=80',
        'lat': 18.5204,
        'lng': 73.8567,
        'status': 'AVAILABLE',
        'monthlyEarnings': 1000,
        'supportedVehicleTypes': ['2W', '4W']
    }
    response = client.post('/api/host/stations', json=payload, headers=headers)
    assert response.status_code == 201
    return response.json()


@pytest.mark.anyio
async def test_mcp_search_returns_station_link(client):
    host = register_user(client, username='hostuser', email='host@example.com')
    host_headers = {'Authorization': f"Bearer {host['tokens']['accessToken']}"}
    create_host_profile(client, host_headers)
    create_station_for_host(client, host_headers)

    result = await search_stations(lat=18.5204, lng=73.8567, radius_km=10)
    assert result['count'] == 1
    station = result['stations'][0]
    assert station['title'] == 'Central Plaza Station'
    assert station['stationUrl'].endswith('/stations/central-plaza-station')


@pytest.mark.anyio
async def test_mcp_booking_flow(client):
    host = register_user(client, username='hostuser2', email='host2@example.com')
    host_headers = {'Authorization': f"Bearer {host['tokens']['accessToken']}"}
    create_host_profile(client, host_headers)
    station = create_station_for_host(client, host_headers)

    register_user(client, username='driveruser', email='driver@example.com')
    login = await login_user(email='driver@example.com', password='Password123!')
    access_token = login['accessToken']

    await upsert_driver_profile(vehicle_type='4W', vehicle_model='Test EV', access_token=access_token)
    booking = await book_station(
        station_id=station['id'],
        start_time='10:00 AM',
        access_token=access_token,
        user_lat=18.5204,
        user_lng=73.8567
    )
    assert booking['stationUrl'].endswith('/stations/central-plaza-station')

    link = get_station_link('Central Plaza Station')
    assert link['stationUrl'].endswith('/stations/central-plaza-station')
