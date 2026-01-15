import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle, Filter } from 'lucide-react';
import DriverFilters from '@/features/driver/components/DriverFilters';
import MapCanvas from '@/features/driver/components/MapCanvas';
import StationCard from '@/features/driver/components/StationCard';
import StationDetailPanel from '@/features/driver/components/StationDetailPanel';
import type { Station } from '@/types';
import { StationStatus } from '@/types';
import { useStationStore } from '@/store/useStationStore';

interface DriverViewProps {
  isLoggedIn: boolean;
  onLoginRequest: (intent?: 'general' | 'book' | 'host', stationId?: string) => void;
  pendingBookingStationId?: string | null;
  onPendingBookingHandled: () => void;
}

const USER_LOCATION = { lat: 18.5204, lng: 73.8567 };

const generateTimeSlots = () => {
  const slots: string[] = [];
  const now = new Date();
  now.setHours(now.getHours() + 1, 0, 0, 0);

  for (let i = 0; i < 6; i += 1) {
    slots.push(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    now.setHours(now.getHours() + 1);
  }

  return slots;
};

const DriverView = ({
  isLoggedIn,
  onLoginRequest,
  pendingBookingStationId,
  onPendingBookingHandled,
}: DriverViewProps) => {
  const stations = useStationStore((state) => state.stations);
  const loadStations = useStationStore((state) => state.loadStations);
  const bookStation = useStationStore((state) => state.bookStation);

  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [showBookingConfirm, setShowBookingConfirm] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'about'>('overview');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const availableSlots = useMemo(() => generateTimeSlots(), []);
  const handleClearSelection = useCallback(() => setSelectedStationId(null), []);
  const handleSelectStation = useCallback((station: Station) => setSelectedStationId(station.id), []);

  const selectedStation = useMemo(
    () => stations.find((station) => station.id === selectedStationId) || null,
    [stations, selectedStationId]
  );

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

  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      if (statusFilter !== 'All') {
        if (statusFilter === 'Available' && station.status !== StationStatus.AVAILABLE) return false;
        if (statusFilter === 'Busy' && station.status !== StationStatus.BUSY) return false;
        if (statusFilter === 'Offline' && station.status !== StationStatus.OFFLINE) return false;
      }

      if (activeTags.includes('Fast Charge')) {
        if (!station.powerOutput.includes('22kW') && !station.powerOutput.includes('11kW')) return false;
      }
      if (activeTags.includes('Type 2') && station.connectorType !== 'Type 2') return false;
      if (activeTags.includes('< ₹200/hr') && station.pricePerHour >= 200) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matches =
          station.title.toLowerCase().includes(query) ||
          station.location.toLowerCase().includes(query) ||
          station.hostName.toLowerCase().includes(query);
        if (!matches) return false;
      }

    return true;
    });
  }, [stations, statusFilter, activeTags, searchQuery]);

  useEffect(() => {
    const apiBaseUrl =
      (import.meta as any).env?.VITE_API_BASE_URL || (window as any).VITE_API_BASE_URL || 'http://localhost:8000';
    const controller = new AbortController();

    const fetchStations = async () => {
      try {
        const params = new URLSearchParams({
          lat: String(USER_LOCATION.lat),
          lng: String(USER_LOCATION.lng),
          radius_km: '10',
        });
        const response = await fetch(`${apiBaseUrl}/api/driver/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        loadStations(data as Station[]);
      } catch {
      }
    };

    fetchStations();

    return () => {
      controller.abort();
    };
  }, [loadStations]);

  useEffect(() => {
    if (!selectedStationId) return;
    const stillVisible = filteredStations.some((station) => station.id === selectedStationId);
    if (!stillVisible) setSelectedStationId(null);
  }, [filteredStations, selectedStationId]);

  const initiateBooking = () => {
    if (!selectedStation || selectedStation.status !== StationStatus.AVAILABLE) return;
    if (!isLoggedIn) {
      onLoginRequest('book', selectedStation.id);
      return;
    }
    setShowBookingConfirm(true);
  };

  const confirmBooking = () => {
    if (!selectedStation) return;
    bookStation(selectedStation.id);
    setShowBookingConfirm(false);
    setShowSuccessToast(true);
    window.setTimeout(() => setShowSuccessToast(false), 3000);
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
    if (!selectedStation) return;
    const number = selectedStation.phoneNumber || '+919999999999';
    window.location.href = `tel:${number}`;
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
          />
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span>{filteredStations.length} stations</span>
            <span className="flex items-center gap-1">
              <Filter size={12} /> Personalized for Pune
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-surface px-4 py-4">
          {filteredStations.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-muted">
              <Filter size={28} className="mb-2 opacity-60" />
              <p className="text-sm">No stations found for these filters.</p>
            </div>
          ) : (
            filteredStations.map((station, index) => (
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

      <div className="order-1 h-[45%] w-full bg-slate-200 md:order-2 md:h-full md:w-7/12 lg:w-8/12">
        <MapCanvas
          stations={filteredStations}
          selectedStationId={selectedStationId ?? undefined}
          onSelectStation={handleSelectStation}
          onClearSelection={handleClearSelection}
          userLocation={USER_LOCATION}
        />
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
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DriverView;
