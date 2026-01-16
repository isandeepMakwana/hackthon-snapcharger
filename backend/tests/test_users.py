from app.db.session import SessionLocal
from app.db.models.user import User
from app.security import hash_password


def create_user(username, email, password, role='driver', permissions=None, phone_number='+919811112233'):
    db = SessionLocal()
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        phone_number=phone_number,
        role=role,
        permissions=permissions or []
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


def login_user(client, email, password):
    response = client.post('/api/auth/login', json={'email': email, 'password': password})
    return response.json()['tokens']['accessToken']


def test_admin_can_create_and_list_users(client):
    create_user('adminuser', 'admin@example.com', 'AdminPass123!', role='admin')
    token = login_user(client, 'admin@example.com', 'AdminPass123!')

    response = client.post(
        '/api/users',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'username': 'driver2',
            'email': 'driver2@example.com',
            'password': 'Password123!',
            'phoneNumber': '+919811112244',
            'role': 'driver'
        }
    )
    assert response.status_code == 201

    list_response = client.get('/api/users', headers={'Authorization': f'Bearer {token}'})
    assert list_response.status_code == 200
    assert list_response.json()['total'] == 2


def test_non_admin_cannot_list_users(client):
    create_user('regular', 'regular@example.com', 'UserPass123!', role='driver')
    token = login_user(client, 'regular@example.com', 'UserPass123!')

    response = client.get('/api/users', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 403


def test_user_can_view_self(client):
    user = create_user('selfuser', 'self@example.com', 'UserPass123!')
    token = login_user(client, 'self@example.com', 'UserPass123!')

    response = client.get(f'/api/users/{user.id}', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    assert response.json()['email'] == 'self@example.com'


def test_user_cannot_change_role(client):
    user = create_user('roleuser', 'roleuser@example.com', 'UserPass123!')
    token = login_user(client, 'roleuser@example.com', 'UserPass123!')

    response = client.patch(
        f'/api/users/{user.id}',
        headers={'Authorization': f'Bearer {token}'},
        json={'role': 'admin'}
    )
    assert response.status_code == 403


def test_admin_update_and_delete_user(client):
    create_user('adminuser', 'admin2@example.com', 'AdminPass123!', role='admin')
    admin_token = login_user(client, 'admin2@example.com', 'AdminPass123!')
    user = create_user('todelete', 'todelete@example.com', 'UserPass123!')

    update_response = client.patch(
        f'/api/users/{user.id}',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'role': 'host', 'permissions': ['stations:write']}
    )
    assert update_response.status_code == 200
    assert update_response.json()['role'] == 'host'

    delete_response = client.delete(
        f'/api/users/{user.id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert delete_response.status_code == 200


def test_user_update_requires_fields(client):
    user = create_user('emptyuser', 'empty@example.com', 'UserPass123!')
    token = login_user(client, 'empty@example.com', 'UserPass123!')

    response = client.patch(
        f'/api/users/{user.id}',
        headers={'Authorization': f'Bearer {token}'},
        json={}
    )
    assert response.status_code == 400


def test_admin_update_duplicate_email(client):
    create_user('adminuser', 'admin3@example.com', 'AdminPass123!', role='admin')
    admin_token = login_user(client, 'admin3@example.com', 'AdminPass123!')
    user_a = create_user('usera', 'usera@example.com', 'UserPass123!')
    user_b = create_user('userb', 'userb@example.com', 'UserPass123!')

    response = client.patch(
        f'/api/users/{user_b.id}',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'email': 'usera@example.com'}
    )
    assert response.status_code == 409
