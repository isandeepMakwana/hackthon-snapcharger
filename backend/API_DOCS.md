# User Profile Update API

## Endpoint: PATCH /api/auth/me

Update the current authenticated user's profile information.

### Authentication
Requires Bearer token in Authorization header.

### Request Body
All fields are optional, but at least one must be provided:

```json
{
  "username": "newusername",
  "email": "newemail@example.com",
  "phoneNumber": "+919999999999",
  "password": "NewPassword123!"
}
```

### Field Validations
- `username`: 3-50 characters
- `email`: Valid email format
- `phoneNumber`: 7-30 characters
- `password`: Minimum 8 characters

### Response
Returns the updated user object:

```json
{
  "id": "user-id",
  "username": "newusername",
  "email": "newemail@example.com",
  "phoneNumber": "+919999999999",
  "role": "member",
  "permissions": [],
  "emailVerified": false,
  "driverProfileComplete": false,
  "hostProfileComplete": false,
  "createdAt": "2024-01-01T00:00:00",
  "updatedAt": "2024-01-02T00:00:00"
}
```

### Error Responses

#### 400 Bad Request - No fields provided
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "At least one field is required."
  }
}
```

#### 409 Conflict - Username or email already exists
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Username already exists."
  }
}
```

#### 401 Unauthorized - Invalid or missing token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token."
  }
}
```

### Special Behaviors

1. **Email Change**: When email is updated, `emailVerified` is set to `false` and a new verification email should be sent (future enhancement).

2. **Password Change**: When password is updated, all existing sessions (refresh tokens) are revoked for security. The user will need to log in again on other devices.

3. **Conflict Detection**: The endpoint checks for username/email conflicts with other users before updating.

### Frontend Usage Example

```typescript
import { updateProfile, loadAuthSession, persistAuthSession } from '@/services/authService';

// Update username
const session = loadAuthSession();
if (session) {
  try {
    const updatedUser = await updateProfile(session.accessToken, {
      username: 'newusername'
    });
    
    // Update the stored session with new user data
    session.user = updatedUser;
    persistAuthSession(session);
    
    console.log('Profile updated successfully');
  } catch (error) {
    console.error('Failed to update profile:', error.message);
  }
}
```

### Testing

Run the test suite:
```bash
cd backend
python -m pytest tests/test_auth.py -k "test_update_me" -v
```
