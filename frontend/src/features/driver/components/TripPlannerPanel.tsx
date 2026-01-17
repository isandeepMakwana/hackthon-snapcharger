import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, MapPin, Plus, Search, X } from 'lucide-react';
import { planTrip, searchLocations } from '@/services/driverService';
import type {
  DriverLocation,
  LocationSearchResult,
  RouteStationInfo,
  TripPlanRequest,
  TripPlanResponse,
  TripStop
} from '@/types/driver';
import { StationStatus } from '@/types';

interface TripPlannerPanelProps {
  defaultLocation: DriverLocation;
  searchRadiusKm: number;
  defaultVehicleType?: string;
  onPlanChange: (plan: TripPlanResponse | null, stops: TripStop[]) => void;
}

const TripPlannerPanel = ({
  defaultLocation,
  searchRadiusKm,
  defaultVehicleType,
  onPlanChange
}: TripPlannerPanelProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [vehicleType, setVehicleType] = useState(defaultVehicleType ?? '4W');
  const [plan, setPlan] = useState<TripPlanResponse | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  useEffect(() => {
    if (stops.length > 0) return;
    setStops([
      {
        label: defaultLocation.name,
        lat: defaultLocation.lat,
        lng: defaultLocation.lng,
        source: 'current'
      }
    ]);
  }, [defaultLocation, stops.length]);

  useEffect(() => {
    if (!defaultVehicleType) return;
    setVehicleType(defaultVehicleType);
  }, [defaultVehicleType]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearchError(null);
      return;
    }

    let isActive = true;
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const data = await searchLocations(query.trim(), searchRadiusKm);
        if (!isActive) return;
        setResults(data);
      } catch (error) {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : 'Unable to search locations.';
        setSearchError(message);
      } finally {
        if (isActive) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(timeout);
    };
  }, [query, searchRadiusKm]);

  useEffect(() => {
    if (stops.length < 2) {
      setPlan(null);
      setPlanError(null);
      onPlanChange(null, stops);
      return;
    }

    const payload: TripPlanRequest = {
      stops,
      vehicleType
    };

    let isActive = true;
    const timeout = window.setTimeout(async () => {
      setIsPlanning(true);
      setPlanError(null);
      try {
        const response = await planTrip(payload);
        if (!isActive) return;
        setPlan(response);
        onPlanChange(response, stops);
      } catch (error) {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : 'Unable to plan trip.';
        setPlanError(message);
        setPlan(null);
        onPlanChange(null, stops);
      } finally {
        if (isActive) {
          setIsPlanning(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(timeout);
    };
  }, [stops, vehicleType, onPlanChange]);

  const handleAddStop = (location: LocationSearchResult) => {
    setStops((prev) => [
      ...prev,
      { label: location.label, lat: location.lat, lng: location.lng, source: 'search' }
    ]);
    setQuery('');
    setResults([]);
  };

  const handleSetStart = (location: LocationSearchResult) => {
    setStops((prev) => {
      const next = [...prev];
      if (next.length === 0) {
        next.push({ label: location.label, lat: location.lat, lng: location.lng, source: 'search' });
        return next;
      }
      next[0] = { label: location.label, lat: location.lat, lng: location.lng, source: 'search' };
      return next;
    });
    setQuery('');
    setResults([]);
  };

  const handleResetStart = () => {
    setStops((prev) => {
      if (prev.length === 0) {
        return [{ label: defaultLocation.name, lat: defaultLocation.lat, lng: defaultLocation.lng, source: 'current' }];
      }
      const next = [...prev];
      next[0] = { label: defaultLocation.name, lat: defaultLocation.lat, lng: defaultLocation.lng, source: 'current' };
      return next;
    });
  };

  const moveStop = (index: number, direction: 'up' | 'down') => {
    setStops((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const [removed] = next.splice(index, 1);
      next.splice(targetIndex, 0, removed);
      return next;
    });
  };

  const removeStop = (index: number) => {
    setStops((prev) => prev.filter((_, idx) => idx !== index));
  };

  const routeStations = useMemo<RouteStationInfo[]>(() => {
    if (!plan) return [];
    return [...plan.stations].sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);
  }, [plan]);

  const routeLegs = plan?.route.legs ?? [];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface-strong p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Plan a trip</p>
            <p className="text-sm text-muted">Add stops to build a route and see chargers along the way.</p>
          </div>
          <button
            type="button"
            onClick={handleResetStart}
            className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted transition hover:text-ink"
          >
            Use current location
          </button>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold uppercase text-muted" htmlFor="trip-search">
            Search destination
          </label>
          <div className="relative mt-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              id="trip-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter a city, address, or coordinates"
              className="w-full rounded-xl border border-border bg-surface px-9 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition hover:bg-surface"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          </div>
          {isSearching && <p className="mt-2 text-xs text-muted">Searching locations...</p>}
          {searchError && <p className="mt-2 text-xs text-rose-600">{searchError}</p>}
          {results.length > 0 && (
            <div className="mt-3 space-y-2">
              {results.map((result) => (
                <div
                  key={`${result.label}-${result.lat}-${result.lng}`}
                  className="rounded-xl border border-border bg-surface px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink line-clamp-2">{result.label}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted">
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                          {result.availability.available} available
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                          {result.availability.busy} busy
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                          {result.availability.offline} offline
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetStart(result)}
                        className="rounded-full border border-border bg-surface px-2 py-1 text-[11px] font-semibold text-muted transition hover:text-ink"
                      >
                        Set start
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddStop(result)}
                        className="rounded-full bg-ink px-2 py-1 text-[11px] font-semibold text-white"
                      >
                        Add stop
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface-strong p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Trip stops</p>
          <div className="flex items-center gap-2">
            <label htmlFor="vehicle-type" className="text-xs font-semibold text-muted">
              Vehicle
            </label>
            <select
              id="vehicle-type"
              value={vehicleType}
              onChange={(event) => setVehicleType(event.target.value)}
              className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-ink"
            >
              <option value="2W">2 Wheeler</option>
              <option value="4W">4 Wheeler</option>
            </select>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {stops.map((stop, index) => (
            <div
              key={`${stop.label}-${index}`}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-accent" />
                <div>
                  <p className="text-xs font-semibold text-ink">{index === 0 ? 'Start' : `Stop ${index}`}</p>
                  <p className="text-xs text-muted line-clamp-1">{stop.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveStop(index, 'up')}
                  className="rounded-full border border-border bg-surface p-1 text-muted transition hover:text-ink"
                  aria-label="Move stop up"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => moveStop(index, 'down')}
                  className="rounded-full border border-border bg-surface p-1 text-muted transition hover:text-ink"
                  aria-label="Move stop down"
                >
                  <ArrowDown size={12} />
                </button>
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => removeStop(index)}
                    className="rounded-full border border-border bg-surface p-1 text-rose-500"
                    aria-label="Remove stop"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {stops.length < 2 && (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-3 py-3 text-xs text-muted">
              <Plus size={14} /> Add at least one destination to start planning.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface-strong p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Route overview</p>
          {isPlanning && <span className="text-xs text-muted">Planning route...</span>}
        </div>
        {planError && <p className="mt-2 text-xs text-rose-600">{planError}</p>}
        {!plan && !planError && (
          <p className="mt-2 text-xs text-muted">Add two or more stops to see route details.</p>
        )}
        {plan && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted">
              <span>Total distance</span>
              <span className="font-semibold text-ink">{plan.route.distanceKm} km</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted">
              <span>Estimated travel time</span>
              <span className="font-semibold text-ink">{plan.route.durationMin} min</span>
            </div>
            {routeLegs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted">Legs</p>
                {routeLegs.map((leg, index) => (
                  <div key={`${leg.fromLabel}-${index}`} className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted">
                    <p className="font-semibold text-ink">{leg.fromLabel} → {leg.toLabel}</p>
                    <p>{leg.distanceKm} km • {leg.durationMin} min</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface-strong p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Charging stations along route</p>
          <span className="text-xs text-muted">{routeStations.length} found</span>
        </div>
        {routeStations.length === 0 ? (
          <p className="mt-3 text-xs text-muted">Plan a route to see stations along the path.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {routeStations.map((entry) => {
              const statusTone =
                entry.station.status === StationStatus.AVAILABLE
                  ? 'bg-emerald-500'
                  : entry.station.status === StationStatus.BUSY
                    ? 'bg-rose-500'
                    : 'bg-slate-400';
              return (
                <div key={entry.station.id} className="rounded-2xl border border-border bg-surface px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{entry.station.title}</p>
                      <p className="text-xs text-muted">{entry.station.location}</p>
                    </div>
                    <span className={`h-2.5 w-2.5 rounded-full ${statusTone}`} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted">
                    <span>ETA {entry.etaFromStartMin} min</span>
                    <span>{entry.distanceFromStartKm} km from start</span>
                    <span>{entry.estimatedChargeMin} min charge</span>
                    <span>{entry.availablePorts}/{entry.capacityPorts} ports</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TripPlannerPanel;
