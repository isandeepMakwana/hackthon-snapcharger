from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from app.db.models.booking import Booking

DEFAULT_DURATION_MINUTES = 60


def _parse_start_time(booking_date: date, start_time: str) -> datetime | None:
    try:
        parsed = datetime.strptime(start_time.strip(), '%I:%M %p')
    except ValueError:
        return None
    return datetime.combine(booking_date, parsed.time())


def expire_bookings(db: Session) -> int:
    now = datetime.utcnow()
    backfilled = 0
    candidates = db.query(Booking).filter(
        Booking.status == 'ACTIVE',
        Booking.end_at.is_(None),
        Booking.booking_date.is_not(None),
        Booking.start_time.is_not(None)
    ).all()

    for booking in candidates:
        start_at = booking.start_at or _parse_start_time(booking.booking_date, booking.start_time)
        if not start_at:
            continue
        duration = booking.duration_minutes or DEFAULT_DURATION_MINUTES
        booking.start_at = start_at
        booking.end_at = start_at + timedelta(minutes=duration)
        backfilled += 1

    if backfilled:
        db.commit()

    expired_by_time = db.query(Booking).filter(
        Booking.status == 'ACTIVE',
        Booking.end_at.is_not(None),
        Booking.end_at < now
    ).update({Booking.status: 'COMPLETED'}, synchronize_session=False)
    expired_by_date = db.query(Booking).filter(
        Booking.status == 'ACTIVE',
        Booking.end_at.is_(None),
        Booking.booking_date.is_not(None),
        Booking.booking_date < date.today()
    ).update({Booking.status: 'COMPLETED'}, synchronize_session=False)

    if expired_by_time or expired_by_date:
        db.commit()
    return backfilled + expired_by_time + expired_by_date
