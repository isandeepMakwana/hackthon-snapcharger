import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class HostProfile(Base):
    __tablename__ = 'host_profiles'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), unique=True, index=True, nullable=False)
    parking_type: Mapped[str] = mapped_column(String(30), nullable=False)
    parking_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    parking_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    parking_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
