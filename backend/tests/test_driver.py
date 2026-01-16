def register_user(client, role: str, overrides=None):
    payload = {
        'username': f'{role}user',
        'email': f'{role}@example.com',
        'password': 'Password123!',
        'role': role
    }
    if overrides:
        payload.update(overrides)
    return client.post('/api/auth/register', json=payload)


def auth_headers_for_role(client, role: str):
    response = register_user(client, role)
    access_token = response.json()['tokens']['accessToken']
    return {'Authorization': f'Bearer {access_token}'}


def create_station_for_host(client, headers, overrides=None):
    payload = {
        'title': 'Driver Test Station',
        'location': 'Pune',
        'description': 'Driver test station description',
        'connectorType': 'Type 2',
        'powerOutput': '7.2kW',
        'pricePerHour': 150,
        'image': 'https://picsum.photos/400/300?random=60',
        'lat': 18.5204,
        'lng': 73.8567,
        'status': 'AVAILABLE',
        'monthlyEarnings': 1000
    }
    if overrides:
        payload.update(overrides)
    response = client.post('/api/host/stations', json=payload, headers=headers)
    assert response.status_code == 201
    return response.json()


def test_driver_search_returns_station(client):
    headers = auth_headers_for_role(client, 'host')
    create_station_for_host(client, headers)
    response = client.get('/api/driver/search', params={'lat': 18.5204, 'lng': 73.8567, 'radius_km': 10})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]['title'] == 'Driver Test Station'


def test_driver_booking_updates_station(client):
    host_headers = auth_headers_for_role(client, 'host')
    station = create_station_for_host(client, host_headers)
    headers = auth_headers_for_role(client, 'driver')

    booking_response = client.post(
        '/api/driver/bookings',
        json={'stationId': station['id'], 'userLat': 18.5204, 'userLng': 73.8567},
        headers=headers
    )
    assert booking_response.status_code == 200
    assert booking_response.json()['status'] == 'BUSY'

    search_response = client.get('/api/driver/search', params={'lat': 18.5204, 'lng': 73.8567, 'radius_km': 10})
    assert search_response.status_code == 200
    assert search_response.json()[0]['status'] == 'BUSY'


def test_driver_booking_rejects_unavailable_station(client):
    host_headers = auth_headers_for_role(client, 'host')
    station = create_station_for_host(client, host_headers)
    headers = auth_headers_for_role(client, 'driver')

    client.post(
        '/api/driver/bookings',
        json={'stationId': station['id']},
        headers=headers
    )

    second_response = client.post(
        '/api/driver/bookings',
        json={'stationId': station['id']},
        headers=headers
    )
    assert second_response.status_code == 400
    assert second_response.json()['error']['code'] == 'UNAVAILABLE'


def test_driver_config(client):
    response = client.get('/api/driver/config')
    assert response.status_code == 200
    payload = response.json()
    assert payload['location']['name']
    assert payload['locationLabel']
    assert payload['searchRadiusKm'] > 0
    assert len(payload['filterTags']) > 0
    assert len(payload['statusOptions']) > 0
    assert len(payload['booking']['timeSlots']) > 0


def test_driver_search_filters(client):
    headers = auth_headers_for_role(client, 'host')
    create_station_for_host(client, headers, {
        'title': 'Fast Charger',
        'powerOutput': '22kW',
        'pricePerHour': 300
    })
    create_station_for_host(client, headers, {
        'title': 'Budget Charger',
        'powerOutput': '7.2kW',
        'pricePerHour': 150
    })

    fast_response = client.get('/api/driver/search', params={
        'lat': 18.5204,
        'lng': 73.8567,
        'radius_km': 10,
        'tags': ['fast_charge']
    })
    assert fast_response.status_code == 200
    assert fast_response.json()[0]['title'] == 'Fast Charger'

    budget_response = client.get('/api/driver/search', params={
        'lat': 18.5204,
        'lng': 73.8567,
        'radius_km': 10,
        'tags': ['under_200']
    })
    assert budget_response.status_code == 200
    assert budget_response.json()[0]['title'] == 'Budget Charger'
