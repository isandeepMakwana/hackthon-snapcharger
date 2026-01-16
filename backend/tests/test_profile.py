def register_user(client, overrides=None):
    payload = {
        'username': 'profileuser',
        'email': 'profile@example.com',
        'password': 'Password123!',
        'phoneNumber': '+919811112288'
    }
    if overrides:
        payload.update(overrides)
    return client.post('/api/auth/register', json=payload)


def auth_headers(client):
    response = register_user(client)
    access_token = response.json()['tokens']['accessToken']
    return {'Authorization': f'Bearer {access_token}'}


def test_driver_profile_upsert_and_get(client):
    headers = auth_headers(client)

    upsert_response = client.put('/api/profile/driver', json={
        'vehicleType': '4W',
        'vehicleModel': 'Tata Nexon EV'
    }, headers=headers)
    assert upsert_response.status_code == 200
    assert upsert_response.json()['vehicleType'] == '4W'

    get_response = client.get('/api/profile/driver', headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()['vehicleModel'] == 'Tata Nexon EV'


def test_host_profile_upsert_and_get(client):
    headers = auth_headers(client)

    upsert_response = client.put('/api/profile/host', json={
        'parkingType': 'covered',
        'parkingAddress': 'Pune'
    }, headers=headers)
    assert upsert_response.status_code == 200
    assert upsert_response.json()['parkingType'] == 'covered'

    get_response = client.get('/api/profile/host', headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()['parkingAddress'] == 'Pune'
