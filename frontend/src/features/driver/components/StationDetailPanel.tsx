import {
  AlertCircle,
  CalendarClock,
  CheckCircle,
  Clock,
  MapPin,
  Navigation,
  Phone,
  Share2,
  ShieldCheck,
  Star,
  ThumbsUp,
  X,
  Zap,
} from 'lucide-react';
import type { Station } from '@/types';
import { StationStatus } from '@/types';

interface StationDetailPanelProps {
  station: Station;
  availableSlots: string[];
  selectedTimeSlot: string;
  onTimeSlotChange: (slot: string) => void;
  activeTab: 'overview' | 'reviews' | 'about';
  onTabChange: (tab: 'overview' | 'reviews' | 'about') => void;
  onClose: () => void;
  onBook: () => void;
  onDirections: () => void;
  onCall: () => void;
  onShare: () => void;
  isLoggedIn: boolean;
}

const StationDetailPanel = ({
  station,
  availableSlots,
  selectedTimeSlot,
  onTimeSlotChange,
  activeTab,
  onTabChange,
  onClose,
  onBook,
  onDirections,
  onCall,
  onShare,
  isLoggedIn,
}: StationDetailPanelProps) => {
  return (
    <div className="absolute bottom-0 right-0 z-[500] flex h-[85vh] w-full animate-in slide-in-from-bottom-10 flex-col justify-end bg-surface-strong shadow-2xl md:top-0 md:h-full md:w-[380px] md:animate-in md:slide-in-from-right-10">
      <div className="relative flex h-full flex-col overflow-y-auto">
        <div className="absolute right-4 top-4 z-20 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-900/60 p-2 text-white transition hover:bg-slate-900"
            aria-label="Close station details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative h-52">
          <img src={station.image} alt={station.title} className="h-full w-full object-cover" />
          <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-slate-900/60 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ${
                station.status === StationStatus.AVAILABLE
                  ? 'bg-accent'
                  : station.status === StationStatus.BUSY
                    ? 'bg-danger'
                    : 'bg-slate-500'
              }`}
            >
              {station.status}
            </span>
          </div>
        </div>

        <div className="flex-1 p-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-ink">{station.title}</h2>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted">
              <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-warning">
                <Star size={12} fill="currentColor" /> {station.rating}
              </span>
              <span>{station.reviewCount} reviews</span>
            </div>
          </div>

          {station.status === StationStatus.AVAILABLE && (
            <div className="mb-5 rounded-2xl border border-border bg-surface px-3 py-3">
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase text-muted">
                <Clock size={12} /> Select Start Time
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {availableSlots.map((slot) => (
                  <button
                    type="button"
                    key={slot}
                    onClick={() => onTimeSlotChange(slot)}
                    className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      selectedTimeSlot === slot
                        ? 'border-accent bg-accent text-white'
                        : 'border-border bg-surface-strong text-muted hover:text-ink'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onBook}
            disabled={station.status !== StationStatus.AVAILABLE}
            className={`mb-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold shadow-soft transition ${
              station.status === StationStatus.AVAILABLE
                ? 'bg-accent text-white hover:bg-accent-strong'
                : 'cursor-not-allowed bg-slate-100 text-slate-400'
            }`}
          >
            {station.status === StationStatus.AVAILABLE ? (
              <>
                <Zap size={18} /> {isLoggedIn ? `Book for ${selectedTimeSlot}` : 'Login to book'}
              </>
            ) : (
              <>
                <AlertCircle size={18} /> Station {station.status === StationStatus.BUSY ? 'Occupied' : 'Unavailable'}
              </>
            )}
          </button>

          <div className="mb-6 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={onDirections}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-2 text-xs font-semibold text-muted transition hover:text-ink"
            >
              <Navigation size={18} />
              Directions
            </button>
            <button
              type="button"
              onClick={onCall}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-2 text-xs font-semibold text-muted transition hover:text-ink"
            >
              <Phone size={18} />
              Call
            </button>
            <button
              type="button"
              onClick={onShare}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-2 text-xs font-semibold text-muted transition hover:text-ink"
            >
              <Share2 size={18} />
              Share
            </button>
          </div>

          <div className="sticky top-0 z-10 mb-4 flex border-b border-border bg-surface-strong">
            {(['overview', 'reviews', 'about'] as const).map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`flex-1 border-b-2 pb-3 text-xs font-semibold uppercase tracking-wide transition ${
                  activeTab === tab
                    ? 'border-accent text-ink'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-4 text-sm text-muted">
              <p className="leading-relaxed text-ink/80">{station.description}</p>
              <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-muted" />
                  <div>
                    <p className="text-sm font-semibold text-ink">Location</p>
                    <p className="text-xs text-muted">{station.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock size={18} className="text-muted" />
                  <div>
                    <p className="text-sm font-semibold text-ink">Hours</p>
                    <p className="text-xs text-accent">Open 24 hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap size={18} className="text-muted" />
                  <div>
                    <p className="text-sm font-semibold text-ink">Charging Specs</p>
                    <p className="text-xs text-muted">
                      {station.connectorType} - {station.powerOutput}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4 text-sm text-muted">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">AS</div>
                  <div>
                    <p className="text-sm font-semibold text-ink">Arjun Singh</p>
                    <div className="flex text-warning">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} size={10} fill="currentColor" />
                      ))}
                    </div>
                  </div>
                  <span className="ml-auto text-xs text-muted">2 days ago</span>
                </div>
                <p className="text-xs text-muted">
                  Great experience! The host was very helpful and the charging speed was exactly as advertised.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">NK</div>
                  <div>
                    <p className="text-sm font-semibold text-ink">Neha Kumar</p>
                    <div className="flex text-warning">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Star key={index} size={10} fill="currentColor" />
                      ))}
                      <Star size={10} className="text-warning" />
                    </div>
                  </div>
                  <span className="ml-auto text-xs text-muted">1 week ago</span>
                </div>
                <p className="text-xs text-muted">
                  Good charger but the approach road is a bit narrow for SUVs. Otherwise perfect.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">RD</div>
                  <div>
                    <p className="text-sm font-semibold text-ink">Rahul Dravid</p>
                    <div className="flex text-warning">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} size={10} fill="currentColor" />
                      ))}
                    </div>
                  </div>
                  <span className="ml-auto text-xs text-muted">2 weeks ago</span>
                </div>
                <p className="text-xs text-muted">
                  Reliable and fast. Will definitely use again when I'm in the area.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-4 text-sm text-muted">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-200">
                  <img
                    src={`https://ui-avatars.com/api/?name=${station.hostName}&background=0D9488&color=fff`}
                    alt={`Host ${station.hostName}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Hosted by {station.hostName}</p>
                  <p className="text-xs text-muted">Superhost - Joined 2023</p>
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-ink">Amenities</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-accent" /> 24/7 CCTV
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-accent" /> Fast Charging
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-accent" /> Covered Parking
                  </div>
                  <div className="flex items-center gap-2">
                    <ThumbsUp size={14} className="text-accent" /> Easy Access
                  </div>
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-ink">Safety Guidelines</h4>
                <p className="text-xs text-muted">
                  Please ensure the connector is firmly locked before starting the session. Do not unplug forcibly.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border bg-surface p-4">
          <div className="flex items-center justify-between text-sm text-muted">
            <span>Hourly Rate</span>
            <span className="font-semibold text-ink">₹{station.pricePerHour}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-muted">
            <span>Service Fee</span>
            <span className="font-semibold text-ink">₹10</span>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-strong px-3 py-2 text-xs text-muted">
            <CalendarClock size={14} className="text-accent" />
            Reserve for today at <span className="font-semibold text-ink">{selectedTimeSlot}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationDetailPanel;
