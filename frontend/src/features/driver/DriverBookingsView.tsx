import { useEffect, useState } from 'react';
import { Calendar, LogIn, UserCheck } from 'lucide-react';
import DriverBookingCard from '@/features/driver/components/DriverBookingCard';
import type { DriverBooking } from '@/types/booking';
import { fetchDriverBookings } from '@/services/driverService';

interface DriverBookingsViewProps {
  isLoggedIn: boolean;
  onLoginRequest: (intent?: 'general' | 'book' | 'host') => void;
  driverProfileComplete: boolean;
  onRequireDriverProfile: () => void;
}

const DriverBookingsView = ({
  isLoggedIn,
  onLoginRequest,
  driverProfileComplete,
  onRequireDriverProfile,
}: DriverBookingsViewProps) => {
  const [bookings, setBookings] = useState<DriverBooking[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !driverProfileComplete) return;
    let isMounted = true;
    setIsLoading(true);

    fetchDriverBookings()
      .then((data) => {
        if (!isMounted) return;
        setBookings(data);
        setErrorMessage(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setErrorMessage('Unable to load your bookings. Please try again.');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, driverProfileComplete]);

  const handleBookingUpdated = (updatedBooking: DriverBooking) => {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === updatedBooking.id ? updatedBooking : booking
      )
    );
  };

  const renderContent = () => {
    if (!isLoggedIn) {
      return (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
          <h2 className="text-lg font-semibold text-ink">Sign in to see your bookings</h2>
          <p className="mt-2 text-sm text-muted">Track your upcoming charging sessions in one place.</p>
          <button
            type="button"
            onClick={() => onLoginRequest('general')}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-slate-900"
          >
            <LogIn size={16} /> Sign in
          </button>
        </div>
      );
    }

    if (!driverProfileComplete) {
      return (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
          <h2 className="text-lg font-semibold text-ink">Complete your driver profile</h2>
          <p className="mt-2 text-sm text-muted">We need your vehicle details before showing bookings.</p>
          <button
            type="button"
            onClick={onRequireDriverProfile}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-slate-900"
          >
            <UserCheck size={16} /> Finish profile
          </button>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex h-48 items-center justify-center text-muted">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm font-medium">Loading bookings...</p>
          </div>
        </div>
      );
    }

    if (bookings.length === 0) {
      return (
        <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 text-center text-muted">
          <Calendar size={28} className="mb-2 opacity-60" />
          <p className="text-sm">No bookings yet. Your next reservation will show up here.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {bookings.map((booking) => (
          <DriverBookingCard 
            key={booking.id} 
            booking={booking}
            onBookingUpdated={handleBookingUpdated}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-surface">
      <div className="px-4 pt-6 md:px-6">
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
          >
            {errorMessage}
          </div>
        )}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Driver dashboard</p>
            <h1 className="text-2xl font-semibold text-ink">My bookings</h1>
            <p className="text-sm text-muted">Track your reserved charging sessions.</p>
          </div>
          {isLoggedIn && driverProfileComplete && (
            <span className="text-xs font-semibold text-muted">{bookings.length} total</span>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 pb-16 md:px-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default DriverBookingsView;
