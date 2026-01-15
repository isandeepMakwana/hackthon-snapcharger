import { Suspense, lazy, useMemo, useState } from 'react';
import { Activity, Calendar, IndianRupee, Plus } from 'lucide-react';
import HostStatsCard from '@/features/host/components/HostStatsCard';
import HostStationCard from '@/features/host/components/HostStationCard';
import type { Station } from '@/types';
import { useStationStore } from '@/store/useStationStore';

const AddStationModal = lazy(() => import('@/features/host/AddStationModal'));

const HostView = () => {
  const stations = useStationStore((state) => state.stations);
  const stats = useStationStore((state) => state.hostStats);
  const saveStation = useStationStore((state) => state.saveStation);
  const toggleStationStatus = useStationStore((state) => state.toggleStationStatus);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | undefined>();

  const myStations = useMemo(
    () => stations.filter((station) => Number.parseInt(station.id, 10) % 2 !== 0),
    [stations]
  );

  const handleEditClick = (station: Station) => {
    setEditingStation(station);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingStation(undefined);
    setIsModalOpen(true);
  };

  const handleSaveStation = async (stationData: Partial<Station>) => {
    const apiBaseUrl =
      (import.meta as any).env?.VITE_API_BASE_URL || (window as any).VITE_API_BASE_URL || 'http://localhost:8000';

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
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/host/stations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        saveStation(stationData);
        return;
      }

      const saved = (await response.json()) as Station;
      saveStation(saved);
    } catch {
      saveStation(stationData);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-y-auto bg-surface">
      <div className="px-4 pt-6 md:px-6">
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">My Stations</h2>
          <span className="text-xs font-semibold text-muted">{myStations.length} total</span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {myStations.map((station) => (
            <HostStationCard
              key={station.id}
              station={station}
              onToggleStatus={toggleStationStatus}
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
        />
      </Suspense>
    </div>
  );
};

export default HostView;
