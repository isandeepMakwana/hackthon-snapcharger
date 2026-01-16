import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Activity, Calendar, IndianRupee, Plus } from 'lucide-react';
import HostBookingCard from '@/features/host/components/HostBookingCard';
import HostStatsCard from '@/features/host/components/HostStatsCard';
import HostStationCard from '@/features/host/components/HostStationCard';
import type { Station } from '@/types';
import { StationStatus } from '@/types';
import { useStationStore } from '@/store/useStationStore';
import type { HostBooking } from '@/types/booking';
import { createHostStation, fetchHostBookings, fetchHostStats, fetchHostStations, updateHostStation } from '@/services/hostService';
import { fetchDriverConfig } from '@/services/driverService';

const AddStationModal = lazy(() => import('@/features/host/AddStationModal'));

const HostView = () => {
  const stations = useStationStore((state) => state.stations);
  const stats = useStationStore((state) => state.hostStats);
  const setHostStats = useStationStore((state) => state.setHostStats);
  const loadStations = useStationStore((state) => state.loadStations);
  const saveStation = useStationStore((state) => state.saveStation);
  const toggleStationStatus = useStationStore((state) => state.toggleStationStatus);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  const myStations = useMemo(() => stations, [stations]);

  const refreshStats = async () => {
    try {
      const statsData = await fetchHostStats();
      setHostStats(statsData);
    } catch {
      setErrorMessage('Unable to refresh host stats. Please try again.');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadHostData = async () => {
      try {
        const [stationData, statsData, bookingData, driverConfig] = await Promise.all([
          fetchHostStations(),
          fetchHostStats(),
          fetchHostBookings(),
          fetchDriverConfig()
        ]);
        if (!isMounted) return;
        loadStations(stationData);
        setHostStats(statsData);
        setBookings(bookingData);
        setTimeSlots(driverConfig.booking.timeSlots ?? []);
        setErrorMessage(null);
      } catch {
        if (!isMounted) return;
        setErrorMessage('Unable to load host data. Please ensure you are signed in and try again.');
      }
    };

    loadHostData();

    return () => {
      isMounted = false;
    };
  }, [loadStations, setHostStats]);

  const handleEditClick = (station: Station) => {
    setEditingStation(station);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingStation(undefined);
    setIsModalOpen(true);
  };

  const handleSaveStation = async (stationData: Partial<Station>) => {
    const payload = {
      hostName: stationData.hostName || 'Current User',
      title: stationData.title || 'New Station',
      location: stationData.location || 'Pune',
      description: stationData.description || '',
      connectorType: stationData.connectorType || 'Type 2',
      powerOutput: stationData.powerOutput || '7.2kW',
      pricePerHour: stationData.pricePerHour ?? 0,
      image: stationData.image || '',
      lat: stationData.lat ?? 18.5204,
      lng: stationData.lng ?? 73.8567,
      phoneNumber: stationData.phoneNumber,
      supportedVehicleTypes: stationData.supportedVehicleTypes ?? ['2W', '4W'],
      availableTimeSlots: stationData.availableTimeSlots ?? [],
      blockedTimeSlots: stationData.blockedTimeSlots ?? [],
    };

    try {
      const saved = stationData.id
        ? await updateHostStation(stationData.id, payload)
        : await createHostStation(payload);
      saveStation(saved);
      void refreshStats();
      setErrorMessage(null);
    } catch {
      saveStation(stationData);
      setErrorMessage('Unable to save station. Please check your connection and try again.');
    }
  };

  const handleToggleStatus = async (stationId: string) => {
    const target = stations.find((station) => station.id === stationId);
    if (!target) return;

    const nextStatus =
      target.status === StationStatus.OFFLINE ? StationStatus.AVAILABLE : StationStatus.OFFLINE;

    try {
      const updated = await updateHostStation(stationId, { status: nextStatus });
      saveStation(updated);
      void refreshStats();
      setErrorMessage(null);
    } catch {
      toggleStationStatus(stationId);
      setErrorMessage('Unable to update station status. Please check your login and try again.');
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-y-auto bg-surface">
      <div className="px-4 pt-6 md:px-6">
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
          >
            {errorMessage}
          </div>
        )}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Host Dashboard</p>
            <h1 className="text-2xl font-semibold text-ink">Welcome back, Sandeep</h1>
            <p className="text-sm text-muted">Monitor earnings and keep your stations active.</p>
          </div>
          <button
            type="button"
            onClick={handleAddClick}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-slate-900"
          >
            <Plus size={18} /> Add Station
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <HostStatsCard
            title="Total Earnings"
            value={`₹${stats.totalEarnings.toLocaleString()}`}
            description="Last 30 days"
            icon={<IndianRupee size={22} />}
            tone="emerald"
          />
          <HostStatsCard
            title="Active Bookings"
            value={stats.activeBookings.toString()}
            description="Live sessions today"
            icon={<Calendar size={22} />}
            tone="sky"
          />
          <HostStatsCard
            title="Station Health"
            value={`${stats.stationHealth}%`}
            description="Operational uptime"
            icon={<Activity size={22} />}
            tone="amber"
          />
        </div>
      </div>

      <div className="flex-1 px-4 pb-16 pt-8 md:px-6">
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ink">Recent Bookings</h2>
            <span className="text-xs font-semibold text-muted">{bookings.length} total</span>
          </div>
          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-center text-sm text-muted">
              No bookings yet. New driver bookings will appear here.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {bookings.map((booking) => (
                <HostBookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">My Stations</h2>
          <span className="text-xs font-semibold text-muted">{myStations.length} total</span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {myStations.map((station) => (
            <HostStationCard
              key={station.id}
              station={station}
              onToggleStatus={handleToggleStatus}
              onEdit={handleEditClick}
            />
          ))}
        </div>
      </div>

      <Suspense fallback={null}>
        <AddStationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAddStation={handleSaveStation}
          initialData={editingStation}
          timeSlots={timeSlots}
        />
      </Suspense>
    </div>
  );
};

export default HostView;
