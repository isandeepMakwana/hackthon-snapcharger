def register_host(client, overrides=None):
    payload = {
        'username': 'hostone',
        'email': 'host@example.com',
        'password': 'Password123!',
        'phoneNumber': '+919811112255'
    }
    if overrides:
        payload.update(overrides)
    return client.post('/api/auth/register', json=payload)


def register_driver(client, overrides=None):
    payload = {
        'username': 'driverone',
        'email': 'driver@example.com',
        'password': 'Password123!',
        'phoneNumber': '+919811112266'
    }
    if overrides:
        payload.update(overrides)
    return client.post('/api/auth/register', json=payload)


def auth_headers(client):
    response = register_host(client)
    access_token = response.json()['tokens']['accessToken']
    headers = {'Authorization': f'Bearer {access_token}'}
    profile_response = client.put('/api/profile/host', json={
        'parkingType': 'covered',
        'parkingAddress': 'Pune'
    }, headers=headers)
    assert profile_response.status_code == 200
    return headers


def auth_headers_for_driver(client):
    response = register_driver(client)
    access_token = response.json()['tokens']['accessToken']
    headers = {'Authorization': f'Bearer {access_token}'}
    profile_response = client.put('/api/profile/driver', json={
        'vehicleType': '4W',
        'vehicleModel': 'Tata Nexon EV'
    }, headers=headers)
    assert profile_response.status_code == 200
    return headers


def test_host_station_crud_and_stats(client):
    headers = auth_headers(client)

    create_payload = {
        'title': 'Test Station',
        'location': 'Pune',
        'description': 'Test description',
        'connectorType': 'Type 2',
        'powerOutput': '7.2kW',
        'pricePerHour': 150,
        'image': 'https://picsum.photos/400/300?random=50',
        'lat': 18.5204,
        'lng': 73.8567,
        'phoneNumber': '+919999999999',
        'monthlyEarnings': 5000,
        'status': 'AVAILABLE'
    }

    create_response = client.post('/api/host/stations', json=create_payload, headers=headers)
    assert create_response.status_code == 201
    station_id = create_response.json()['id']

    driver_headers = auth_headers_for_driver(client)
    booking_response = client.post(
        '/api/driver/bookings',
        json={'stationId': station_id},
        headers=driver_headers
    )
    assert booking_response.status_code == 200

    list_response = client.get('/api/host/stations', headers=headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    stats_response = client.get('/api/host/stats', headers=headers)
    assert stats_response.status_code == 200
    assert stats_response.json()['totalEarnings'] == 5150
    assert stats_response.json()['activeBookings'] == 1
    assert stats_response.json()['stationHealth'] == 100

    update_response = client.patch(
        f'/api/host/stations/{station_id}',
        json={'status': 'OFFLINE'},
        headers=headers
    )
    assert update_response.status_code == 200
    assert update_response.json()['status'] == 'OFFLINE'

    stats_after = client.get('/api/host/stats', headers=headers)
    assert stats_after.status_code == 200
    assert stats_after.json()['activeBookings'] == 0
    assert stats_after.json()['stationHealth'] == 0


def test_host_requires_profile(client):
    response = register_host(client)
    headers = {'Authorization': f\"Bearer {response.json()['tokens']['accessToken']}\"}

    stats_response = client.get('/api/host/stats', headers=headers)
    assert stats_response.status_code == 403
    assert stats_response.json()['error']['code'] == 'PROFILE_INCOMPLETE'


def test_host_analyze_photo(client):
    headers = auth_headers(client)
    files = {'file': ('charger.jpg', b'fake-image', 'image/jpeg')}

    response = client.post('/api/host/analyze-photo', files=files, headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert 'ai_data' in payload
    assert 'socket_type' in payload['ai_data']
    assert 'power_kw' in payload['ai_data']
    assert 'marketing_description' in payload['ai_data']


def test_host_bookings_include_driver_contact(client):
    host_headers = auth_headers(client)

    create_response = client.post('/api/host/stations', json={
        'title': 'Contact Station',
        'location': 'Pune',
        'description': 'Booking contact test',
        'connectorType': 'Type 2',
        'powerOutput': '7.2kW',
        'pricePerHour': 120,
        'image': 'https://picsum.photos/400/300?random=55',
        'lat': 18.5204,
        'lng': 73.8567,
        'phoneNumber': '+919999000111',
        'monthlyEarnings': 0,
        'status': 'AVAILABLE'
    }, headers=host_headers)
    assert create_response.status_code == 201
    station_id = create_response.json()['id']

    driver_headers = auth_headers_for_driver(client)
    booking_response = client.post(
        '/api/driver/bookings',
        json={'stationId': station_id, 'startTime': '10:00 AM'},
        headers=driver_headers
    )
    assert booking_response.status_code == 200

    bookings_response = client.get('/api/host/bookings', headers=host_headers)
    assert bookings_response.status_code == 200
    payload = bookings_response.json()
    assert len(payload) == 1
    assert payload[0]['driverPhoneNumber'] == '+919811112266'
    assert payload[0]['stationTitle'] == 'Contact Station'
