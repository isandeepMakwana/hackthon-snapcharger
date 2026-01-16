import { CalendarClock, MapPin, Phone, User } from 'lucide-react';
import type { DriverBooking } from '@/types/booking';

interface DriverBookingCardProps {
  booking: DriverBooking;
}

const statusTone: Record<DriverBooking['status'], string> = {
  ACTIVE: 'bg-accent text-white',
  COMPLETED: 'bg-emerald-500 text-white',
  CANCELLED: 'bg-slate-400 text-white',
};

const DriverBookingCard = ({ booking }: DriverBookingCardProps) => {
  const formattedTime = booking.startTime ?? 'Flexible';
  const formattedDate = booking.createdAt
    ? new Date(booking.createdAt).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short'
      })
    : 'Today';
  const hasCoords =
    Number.isFinite(booking.stationLat) && Number.isFinite(booking.stationLng);
  const destination = hasCoords
    ? `${booking.stationLat},${booking.stationLng}`
    : booking.stationLocation;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;

  return (
    <div className="rounded-2xl border border-border bg-surface-strong p-4 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-20 w-full overflow-hidden rounded-xl bg-surface sm:h-24 sm:w-32">
          <img
            src={booking.stationImage}
            alt={booking.stationTitle}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">My booking</p>
              <h3 className="text-lg font-semibold text-ink">{booking.stationTitle}</h3>
              <p className="text-sm text-muted">{booking.stationLocation}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusTone[booking.status]}`}
            >
              {booking.status}
            </span>
          </div>

          <div className="mt-3 grid gap-3 text-sm text-muted md:grid-cols-2">
            <div className="flex items-center gap-2">
              <CalendarClock size={16} className="text-muted" />
              <span>{formattedDate} · {formattedTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <User size={16} className="text-muted" />
              <span className="font-semibold text-ink">{booking.hostName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-muted" />
              <span>{booking.hostPhoneNumber ?? 'Contact unavailable'}</span>
            </div>
            <div className="text-sm text-muted">
              INR {booking.stationPricePerHour}
              <span className="text-xs">/hr</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {booking.hostPhoneNumber && (
              <a
                href={`tel:${booking.hostPhoneNumber}`}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:bg-slate-900"
              >
                <Phone size={14} /> Call host
              </a>
            )}
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink shadow-soft transition hover:bg-surface-strong"
            >
              <MapPin size={14} /> Directions
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverBookingCard;
