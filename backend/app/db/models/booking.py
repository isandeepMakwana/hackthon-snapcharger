import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Booking(Base):
    __tablename__ = 'bookings'
    __table_args__ = (
        UniqueConstraint('station_id', 'booking_date', 'start_time', 'status', name='uq_booking_slot_status'),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    station_id: Mapped[str] = mapped_column(String(36), ForeignKey('stations.id'), index=True, nullable=False)
    host_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), index=True, nullable=False)
    driver_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), index=True, nullable=False)
    driver_name: Mapped[str] = mapped_column(String(120), nullable=False)
    driver_phone_number: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default='ACTIVE', nullable=False)
    booking_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_time: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
