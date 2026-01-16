import { Edit2, Zap } from 'lucide-react';
import type { Station } from '@/types';
import { StationStatus } from '@/types';

interface HostStationCardProps {
  station: Station;
  onToggleStatus: (id: string) => void;
  onEdit: (station: Station) => void;
  isUpdating?: boolean;
}

const HostStationCard = ({ station, onToggleStatus, onEdit, isUpdating }: HostStationCardProps) => {
  const isOnline = station.status !== StationStatus.OFFLINE;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-strong shadow-soft transition hover:shadow-card">
      <div className="relative h-40 bg-slate-200">
        <img
          src={station.image}
          alt={station.title}
          className={`h-full w-full object-cover ${station.status === StationStatus.OFFLINE ? 'grayscale' : ''}`}
        />
        <div className="absolute right-3 top-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ${
              isOnline ? 'bg-accent' : 'bg-slate-600'
            }`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-ink">{station.title}</h3>
          <p className="text-sm text-muted line-clamp-2">{station.description}</p>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4 text-sm text-muted">
          <div className="flex items-center gap-1.5">
            <Zap size={16} className="text-accent" />
            <span className="font-semibold text-ink">{station.powerOutput}</span>
          </div>
          <div className="font-semibold text-ink">
            ₹{station.pricePerHour}
            <span className="text-xs font-normal text-muted">/hr</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <label className={`flex items-center text-sm text-muted ${isUpdating ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <span className="sr-only">Toggle station availability</span>
            <input
              type="checkbox"
              className="sr-only"
              checked={isOnline}
              disabled={isUpdating}
              onChange={() => onToggleStatus(station.id)}
            />
            <span
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                isOnline ? 'bg-accent' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 translate-x-1 rounded-full bg-white shadow-sm transition ${
                  isOnline ? 'translate-x-6' : ''
                }`}
              />
            </span>
            <span className="ml-3 font-semibold text-ink">{isOnline ? 'Active' : 'Disabled'}</span>
          </label>

          <button
            type="button"
            onClick={() => onEdit(station)}
            className="flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-accent"
          >
            <Edit2 size={16} />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostStationCard;
