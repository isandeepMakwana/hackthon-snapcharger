def register_host(client, overrides=None):
    payload = {
        'username': 'hostone',
        'email': 'host@example.com',
        'password': 'Password123!',
        'role': 'host'
    }
    if overrides:
        payload.update(overrides)
    return client.post('/api/auth/register', json=payload)


def auth_headers(client):
    response = register_host(client)
    access_token = response.json()['tokens']['accessToken']
    return {'Authorization': f'Bearer {access_token}'}


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
        'status': 'BUSY'
    }

    create_response = client.post('/api/host/stations', json=create_payload, headers=headers)
    assert create_response.status_code == 201
    station_id = create_response.json()['id']

    list_response = client.get('/api/host/stations', headers=headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    stats_response = client.get('/api/host/stats', headers=headers)
    assert stats_response.status_code == 200
    assert stats_response.json()['totalEarnings'] == 5000
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
