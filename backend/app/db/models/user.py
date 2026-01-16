import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class User(Base):
    __tablename__ = 'users'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default='member', nullable=False)
    permissions: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
