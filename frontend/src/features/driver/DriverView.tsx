import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle, Filter } from 'lucide-react';
import DriverFilters from '@/features/driver/components/DriverFilters';
import MapCanvas from '@/features/driver/components/MapCanvas';
import StationCard from '@/features/driver/components/StationCard';
import StationDetailPanel from '@/features/driver/components/StationDetailPanel';
import type { Station } from '@/types';
import { StationStatus } from '@/types';
import { useStationStore } from '@/store/useStationStore';
import { createDriverBooking, fetchDriverConfig, fetchDriverStations } from '@/services/driverService';

interface DriverViewProps {
  isLoggedIn: boolean;
  onLoginRequest: (intent?: 'general' | 'book' | 'host', stationId?: string) => void;
  pendingBookingStationId?: string | null;
  onPendingBookingHandled: () => void;
}

const DriverView = ({
  isLoggedIn,
  onLoginRequest,
  pendingBookingStationId,
  onPendingBookingHandled,
}: DriverViewProps) => {
  const stations = useStationStore((state) => state.stations);
  const loadStations = useStationStore((state) => state.loadStations);
  const bookStation = useStationStore((state) => state.bookStation);
  const saveStation = useStationStore((state) => state.saveStation);
  const driverConfig = useStationStore((state) => state.driverConfig);
  const setDriverConfig = useStationStore((state) => state.setDriverConfig);

  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [showBookingConfirm, setShowBookingConfirm] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'about'>('overview');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const availableSlots = useMemo(() => driverConfig?.booking.timeSlots ?? [], [driverConfig]);
  const handleClearSelection = useCallback(() => setSelectedStationId(null), []);
  const handleSelectStation = useCallback((station: Station) => setSelectedStationId(station.id), []);

  const selectedStation = useMemo(
    () => stations.find((station) => station.id === selectedStationId) || null,
    [stations, selectedStationId]
  );

  useEffect(() => {
    let isMounted = true;

    const loadConfig = async () => {
      try {
        const config = await fetchDriverConfig();
        if (!isMounted) return;
        setDriverConfig(config);
        setStatusFilter((prev) => prev || config.statusOptions[0]?.value || 'ALL');
        if (config.booking.timeSlots.length > 0) {
          setSelectedTimeSlot(config.booking.timeSlots[0]);
        }
        setErrorMessage(null);
      } catch {
        if (!isMounted) return;
        setErrorMessage('Unable to load driver settings. Please try again.');
      }
    };

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, [setDriverConfig]);

  useEffect(() => {
    if (selectedStation) {
      setSelectedTimeSlot(availableSlots[0] ?? '');
    }
  }, [selectedStation, availableSlots]);

  useEffect(() => {
    if (!selectedStationId) return;
    const element = document.getElementById(`station-card-${selectedStationId}`);
    if (!element) return;
    window.setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  }, [selectedStationId]);

  useEffect(() => {
    if (!showBookingConfirm) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowBookingConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showBookingConfirm]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  };

  useEffect(() => {
    if (!driverConfig) return;
    const fetchStations = async () => {
      try {
        const data = await fetchDriverStations({
          lat: driverConfig.location.lat,
          lng: driverConfig.location.lng,
          radiusKm: driverConfig.searchRadiusKm,
          status: statusFilter,
          tags: activeTags,
          query: searchQuery.trim() ? searchQuery.trim() : undefined
        });
        loadStations(data);
        setErrorMessage(null);
      } catch {
        setErrorMessage('Unable to load stations. Please try again.');
      }
    };

    const delay = searchQuery.trim() ? 300 : 0;
    const timeout = window.setTimeout(fetchStations, delay);
    return () => window.clearTimeout(timeout);
  }, [driverConfig, statusFilter, activeTags, searchQuery, loadStations]);

  useEffect(() => {
    if (!selectedStationId) return;
    const stillVisible = stations.some((station) => station.id === selectedStationId);
    if (!stillVisible) setSelectedStationId(null);
  }, [stations, selectedStationId]);

  const initiateBooking = () => {
    if (!selectedStation || selectedStation.status !== StationStatus.AVAILABLE) return;
    if (!isLoggedIn) {
      onLoginRequest('book', selectedStation.id);
      return;
    }
    setShowBookingConfirm(true);
  };

  const confirmBooking = () => {
    if (!selectedStation || !driverConfig) return;
    createDriverBooking({
      stationId: selectedStation.id,
      startTime: selectedTimeSlot,
      userLat: driverConfig.location.lat,
      userLng: driverConfig.location.lng
    })
      .then((updated) => {
        saveStation(updated);
        setErrorMessage(null);
        setShowBookingConfirm(false);
        setShowSuccessToast(true);
        window.setTimeout(() => setShowSuccessToast(false), 3000);
      })
      .catch(() => {
        bookStation(selectedStation.id);
        setErrorMessage('Unable to complete booking. Please try again.');
        window.setTimeout(() => setErrorMessage(null), 3000);
        setShowBookingConfirm(false);
      });
  };

  useEffect(() => {
    if (!isLoggedIn || !pendingBookingStationId) return;
    const station = stations.find((item) => item.id === pendingBookingStationId);
    if (station) {
      setSelectedStationId(station.id);
      setShowBookingConfirm(true);
    }
    onPendingBookingHandled();
  }, [isLoggedIn, pendingBookingStationId, stations, onPendingBookingHandled]);

  const handleDirections = () => {
    if (!selectedStation) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStation.lat},${selectedStation.lng}`;
    window.open(url, '_blank', 'noopener');
  };

  const handleCall = () => {
    if (!selectedStation?.phoneNumber) {
      setErrorMessage('No contact number available for this station.');
      window.setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    window.location.href = `tel:${selectedStation.phoneNumber}`;
  };

  const handleShare = async () => {
    if (!selectedStation) return;
    const shareData = {
      title: `Charge at ${selectedStation.title}`,
      text: `Check out this EV charger: ${selectedStation.title} in ${selectedStation.location}. Rated ${selectedStation.rating} stars!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.warn('Share cancelled or failed:', error);
      }
    } else {
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      setShowSuccessToast(true);
      window.setTimeout(() => setShowSuccessToast(false), 3000);
    }
  };

  return (
    <div className="relative flex h-[calc(100vh-64px)] flex-col overflow-hidden md:flex-row">
      {showSuccessToast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-1/2 top-4 z-[1000] w-11/12 max-w-sm -translate-x-1/2 animate-in slide-in-from-top-5"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-white shadow-glow">
            <CheckCircle size={22} className="shrink-0" />
            <div>
              <p className="text-sm font-semibold">Booking Confirmed!</p>
              <p className="text-xs opacity-90">Slot reserved for {selectedTimeSlot}</p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="absolute left-1/2 top-4 z-[1000] w-11/12 max-w-sm -translate-x-1/2 animate-in slide-in-from-top-5"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-rose-500 px-4 py-3 text-white shadow-glow">
            <span className="text-sm font-semibold">{errorMessage}</span>
          </div>
        </div>
      )}

      {showBookingConfirm && selectedStation && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-title"
          aria-describedby="booking-description"
        >
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-surface-strong shadow-2xl">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
                <CalendarClock size={22} />
              </div>
              <h3 id="booking-title" className="text-lg font-semibold text-ink">
                Confirm Booking
              </h3>
              <p id="booking-description" className="mt-2 text-sm text-muted">
                Book <span className="font-semibold text-ink">{selectedStation.title}</span> for today?
              </p>
              <div className="mt-4 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted">
                Reserve at <span className="font-semibold text-ink">{selectedTimeSlot}</span>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-muted">
                <span>Hourly Rate</span>
                <span className="font-semibold text-ink">₹{selectedStation.pricePerHour}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-muted">
                <span>Service Fee</span>
                <span className="font-semibold text-ink">₹10</span>
              </div>
            </div>
            <div className="flex border-t border-border">
              <button
                type="button"
                onClick={() => setShowBookingConfirm(false)}
                className="flex-1 py-3 text-sm font-semibold text-muted transition hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBooking}
                className="flex-1 py-3 text-sm font-semibold text-accent transition hover:bg-accent/10"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="order-2 flex h-[60%] w-full flex-col rounded-t-3xl bg-surface-strong shadow-soft md:order-1 md:h-full md:w-5/12 lg:w-4/12 md:rounded-none">
        <div className="md:hidden flex w-full justify-center pt-3 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-border" />
        </div>
        <div className="border-b border-border p-4">
          <DriverFilters
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            activeTags={activeTags}
            toggleTag={toggleTag}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterTags={driverConfig?.filterTags ?? []}
            statusOptions={driverConfig?.statusOptions ?? []}
            searchPlaceholder={driverConfig?.searchPlaceholder ?? ''}
          />
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span>{stations.length} stations</span>
            {driverConfig?.personalizedLabel && (
              <span className="flex items-center gap-1">
                <Filter size={12} /> {driverConfig.personalizedLabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-surface px-4 py-4">
          {stations.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-muted">
              <Filter size={28} className="mb-2 opacity-60" />
              <p className="text-sm">No stations found for these filters.</p>
            </div>
          ) : (
            stations.map((station, index) => (
              <div
                key={station.id}
                style={{ animationDelay: `${index * 40}ms` }}
                className="animate-fade-up"
              >
                <StationCard
                  station={station}
                  isSelected={selectedStationId === station.id}
                  onSelect={() => handleSelectStation(station)}
                />
              </div>
            ))
          )}
          <div className="h-20 md:h-0" />
        </div>
      </div>

      <div className="relative z-0 isolate order-1 h-[45%] w-full bg-slate-200 md:order-2 md:h-full md:w-7/12 lg:w-8/12">
        {driverConfig && (
          <MapCanvas
            stations={stations}
            selectedStationId={selectedStationId ?? undefined}
            onSelectStation={handleSelectStation}
            onClearSelection={handleClearSelection}
            userLocation={driverConfig.location}
            legendItems={driverConfig.legend}
          />
        )}
        {selectedStation && (
          <>
            <button
              type="button"
              aria-label="Close station details"
              className="absolute inset-0 z-[450] bg-slate-900/20 md:hidden"
              onClick={handleClearSelection}
            />
            <StationDetailPanel
              station={selectedStation}
              availableSlots={availableSlots}
              selectedTimeSlot={selectedTimeSlot}
              onTimeSlotChange={setSelectedTimeSlot}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClose={handleClearSelection}
              onBook={initiateBooking}
              onDirections={handleDirections}
              onCall={handleCall}
              onShare={handleShare}
              isLoggedIn={isLoggedIn}
              serviceFee={driverConfig?.booking.serviceFee ?? 0}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DriverView;
