import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Booking(Base):
    __tablename__ = 'bookings'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    station_id: Mapped[str] = mapped_column(String(36), ForeignKey('stations.id'), index=True, nullable=False)
    host_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), index=True, nullable=False)
    driver_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), index=True, nullable=False)
    driver_name: Mapped[str] = mapped_column(String(120), nullable=False)
    driver_phone_number: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default='ACTIVE', nullable=False)
    start_time: Mapped[str | None] = mapped_column(String(40), nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    review: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
