import { Star, Zap } from 'lucide-react';
import type { Station } from '@/types';
import { StationStatus } from '@/types';

interface StationCardProps {
  station: Station;
  isSelected: boolean;
  onSelect: () => void;
}

const StationCard = ({ station, isSelected, onSelect }: StationCardProps) => {
  return (
    <div
      id={`station-card-${station.id}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={isSelected}
      className={`group flex w-full gap-3 rounded-2xl border bg-surface-strong p-3 text-left transition-all focus-visible:outline-none ${
        isSelected
          ? 'border-accent shadow-card ring-1 ring-accent/40'
          : 'border-border hover:border-accent/40 hover:shadow-soft'
      }`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-200">
        <img src={station.image} alt={station.title} className="h-full w-full object-cover" />
        <div className="absolute left-2 top-2 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-semibold text-white">
          {station.distance}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between py-1">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink line-clamp-1">
              {station.title}
            </h3>
            <p className="text-xs text-muted">{station.location}</p>
          </div>
          <span
            className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
              station.status === StationStatus.AVAILABLE
                ? 'bg-accent shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                : station.status === StationStatus.BUSY
                  ? 'bg-danger'
                  : 'bg-slate-400'
            }`}
            aria-hidden="true"
          />
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted">
          <div className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-warning">
            <Star size={10} fill="currentColor" />
            <span className="font-semibold text-ink">{station.rating}</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap size={12} className="text-muted" />
            {station.powerOutput}
          </div>
        </div>

        <div className="mt-2 flex items-end justify-between">
          <span className="text-sm font-semibold text-accent">
            ₹{station.pricePerHour}
            <span className="text-xs font-normal text-muted">/hr</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default StationCard;
