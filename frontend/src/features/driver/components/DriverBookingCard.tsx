import { useState } from 'react';
import { CalendarClock, MapPin, Phone, User, Star, CheckCircle } from 'lucide-react';
import type { DriverBooking } from '@/types/booking';
import { completeDriverBooking } from '@/services/driverService';

interface DriverBookingCardProps {
  booking: DriverBooking;
  onBookingUpdated?: (updatedBooking: DriverBooking) => void;
}

const statusTone: Record<DriverBooking['status'], string> = {
  ACTIVE: 'bg-accent text-white',
  COMPLETED: 'bg-emerald-500 text-white',
  CANCELLED: 'bg-slate-400 text-white',
};

const DriverBookingCard = ({ booking, onBookingUpdated }: DriverBookingCardProps) => {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const handleCompleteBooking = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updated = await completeDriverBooking({
        bookingId: booking.id,
        rating,
        review: review.trim() || undefined
      });
      setShowReviewModal(false);
      if (onBookingUpdated) {
        onBookingUpdated(updated);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete booking';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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

            {booking.status === 'COMPLETED' && booking.rating && (
              <div className="mt-3 rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted">Your rating:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={star <= booking.rating! ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                      />
                    ))}
                  </div>
                </div>
                {booking.review && (
                  <p className="mt-2 text-xs text-muted">{booking.review}</p>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {booking.status === 'ACTIVE' && (
                <button
                  type="button"
                  onClick={() => setShowReviewModal(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:bg-emerald-600"
                >
                  <CheckCircle size={14} /> Complete & Review
                </button>
              )}
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

      {showReviewModal && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface-strong shadow-2xl">
            <div className="p-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Star size={22} />
              </div>
              <h3 id="review-title" className="text-center text-lg font-semibold text-ink">
                Complete Booking
              </h3>
              <p className="mt-2 text-center text-sm text-muted">
                How was your charging experience at {booking.stationTitle}?
              </p>

              {errorMessage && (
                <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
                  {errorMessage}
                </div>
              )}

              <div className="mt-6">
                <label className="block text-sm font-semibold text-ink">Rating</label>
                <div className="mt-2 flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="transition hover:scale-110"
                    >
                      <Star
                        size={32}
                        className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="review-text" className="block text-sm font-semibold text-ink">
                  Review (optional)
                </label>
                <textarea
                  id="review-text"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share your experience..."
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder-muted focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="flex border-t border-border">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 text-sm font-semibold text-muted transition hover:bg-surface disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteBooking}
                disabled={isSubmitting}
                className="flex-1 py-3 text-sm font-semibold text-accent transition hover:bg-accent/10 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DriverBookingCard;
