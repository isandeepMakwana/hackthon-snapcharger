from urllib.parse import urlparse, parse_qs
from app.core.mailer import get_email_log


def register_user(client, overrides=None):
    payload = {
        'username': 'driverone',
        'email': 'driver@example.com',
        'password': 'Password123!',
        'role': 'driver'
    }
    if overrides:
        payload.update(overrides)
    return client.post('/api/auth/register', json=payload)


def login_user(client, overrides=None):
    payload = {
        'email': 'driver@example.com',
        'password': 'Password123!'
    }
    if overrides:
        payload.update(overrides)
    return client.post('/api/auth/login', json=payload)


def test_register_sends_verification(client):
    response = register_user(client)
    assert response.status_code == 201
    assert response.json()['user']['email'] == 'driver@example.com'
    assert response.json()['tokens']['accessToken']
    assert response.json()['tokens']['refreshToken']

    emails = get_email_log()
    assert len(emails) == 1
    assert emails[0]['type'] == 'verification'


def test_register_duplicate(client):
    register_user(client)
    response = register_user(client, {'email': 'driver@example.com'})
    assert response.status_code == 409
    assert response.json()['error']['code'] == 'CONFLICT'


def test_register_validation_error(client):
    response = register_user(client, {'email': 'not-an-email'})
    assert response.status_code == 400
    assert response.json()['error']['code'] == 'VALIDATION_ERROR'


def test_login_success(client):
    register_user(client)
    response = login_user(client)
    assert response.status_code == 200
    assert response.json()['user']['username'] == 'driverone'


def test_login_invalid_credentials(client):
    register_user(client)
    response = login_user(client, {'password': 'WrongPassword1!'})
    assert response.status_code == 401
    assert response.json()['error']['code'] == 'INVALID_CREDENTIALS'


def test_verify_email(client):
    register_user(client)
    emails = get_email_log()
    verification_link = emails[0]['meta']['link']
    token = parse_qs(urlparse(verification_link).query)['token'][0]

    response = client.get('/api/auth/verify-email', params={'token': token})
    assert response.status_code == 200
    assert response.json()['user']['emailVerified'] is True


def test_refresh_tokens(client):
    register_response = register_user(client)
    refresh_token = register_response.json()['tokens']['refreshToken']

    response = client.post('/api/auth/refresh', json={'refreshToken': refresh_token})
    assert response.status_code == 200
    assert response.json()['tokens']['refreshToken'] != refresh_token


def test_logout_revokes_session(client):
    register_response = register_user(client)
    refresh_token = register_response.json()['tokens']['refreshToken']

    logout_response = client.post('/api/auth/logout', json={'refreshToken': refresh_token})
    assert logout_response.status_code == 200

    refresh_response = client.post('/api/auth/refresh', json={'refreshToken': refresh_token})
    assert refresh_response.status_code == 401


def test_forgot_and_reset_password(client):
    register_user(client)

    forgot_response = client.post('/api/auth/forgot-password', json={'email': 'driver@example.com'})
    assert forgot_response.status_code == 200

    reset_email = [email for email in get_email_log() if email['type'] == 'password_reset'][0]
    token = parse_qs(urlparse(reset_email['meta']['link']).query)['token'][0]

    reset_response = client.post('/api/auth/reset-password', json={'token': token, 'password': 'NewPassword123!'})
    assert reset_response.status_code == 200

    login_response = login_user(client, {'password': 'NewPassword123!'})
    assert login_response.status_code == 200


def test_me_requires_auth(client):
    response = client.get('/api/auth/me')
    assert response.status_code == 401


def test_me_returns_user(client):
    register_response = register_user(client)
    access_token = register_response.json()['tokens']['accessToken']

    response = client.get('/api/auth/me', headers={'Authorization': f'Bearer {access_token}'})
    assert response.status_code == 200
    assert response.json()['email'] == 'driver@example.com'
