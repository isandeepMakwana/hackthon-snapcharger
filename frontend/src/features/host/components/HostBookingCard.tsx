import { CalendarClock, Phone, User } from 'lucide-react';
import type { HostBooking } from '@/types/booking';

interface HostBookingCardProps {
  booking: HostBooking;
}

const statusTone: Record<HostBooking['status'], string> = {
  ACTIVE: 'bg-accent text-white',
  COMPLETED: 'bg-emerald-500 text-white',
  CANCELLED: 'bg-slate-400 text-white',
};

const HostBookingCard = ({ booking }: HostBookingCardProps) => {
  const formattedTime = booking.startTime ?? 'Flexible';
  const formattedDate = booking.bookingDate ?? 'Today';

  return (
    <div className="rounded-2xl border border-border bg-surface-strong p-4 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Booking</p>
          <h3 className="text-lg font-semibold text-ink">{booking.stationTitle}</h3>
          <p className="text-sm text-muted">{booking.stationLocation}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusTone[booking.status]}`}
        >
          {booking.status}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-2">
        <div className="flex items-center gap-2">
          <User size={16} className="text-muted" />
          <span className="font-semibold text-ink">{booking.driverName}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="text-muted" />
          <span>{formattedDate} · {formattedTime}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone size={16} className="text-muted" />
          <span>{booking.driverPhoneNumber}</span>
        </div>
        <div className="text-sm text-muted">
          INR {booking.stationPricePerHour}
          <span className="text-xs">/hr</span>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <a
          href={`tel:${booking.driverPhoneNumber}`}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:bg-slate-900"
        >
          <Phone size={14} /> Call driver
        </a>
      </div>
    </div>
  );
};

export default HostBookingCard;
