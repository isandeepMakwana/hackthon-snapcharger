from datetime import datetime
from typing import List, Optional
from pydantic import EmailStr, Field
from app.models.base import CamelModel


class UserBase(CamelModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    role: str = 'driver'
    permissions: List[str] = Field(default_factory=list)


class UserCreate(CamelModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Optional[str] = 'driver'
    permissions: List[str] = Field(default_factory=list)


class UserUpdate(CamelModel):
    username: Optional[str] = Field(default=None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)
    role: Optional[str] = None
    permissions: Optional[List[str]] = None


class UserOut(CamelModel):
    id: str
    username: str
    email: EmailStr
    role: str
    permissions: List[str]
    email_verified: bool
    created_at: datetime
    updated_at: datetime


class UserList(CamelModel):
    data: List[UserOut]
    page: int
    limit: int
    total: int
