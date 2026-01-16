from typing import Optional
from pydantic import EmailStr, Field
from app.models.base import CamelModel
from app.models.user import UserOut


class RegisterRequest(CamelModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone_number: str = Field(min_length=7, max_length=30)
    role: Optional[str] = 'driver'


class LoginRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class RefreshRequest(CamelModel):
    refresh_token: str = Field(min_length=10)


class LogoutRequest(CamelModel):
    refresh_token: str = Field(min_length=10)


class ForgotPasswordRequest(CamelModel):
    email: EmailStr


class ResetPasswordRequest(CamelModel):
    token: str = Field(min_length=10)
    password: str = Field(min_length=8, max_length=128)


class TokenResponse(CamelModel):
    access_token: str
    refresh_token: str
    expires_in: int


class AuthResponse(CamelModel):
    user: UserOut
    tokens: TokenResponse


class MessageResponse(CamelModel):
    success: bool


class EmailVerificationResponse(CamelModel):
    user: UserOut
