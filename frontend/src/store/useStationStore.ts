import { create } from 'zustand';
import type { HostStats, Station } from '@/types';
import type { DriverConfig } from '@/types/driver';
import { StationStatus } from '@/types';

type ViewMode = 'driver' | 'host';

type StationStore = {
  viewMode: ViewMode;
  stations: Station[];
  hostStats: HostStats;
  driverConfig: DriverConfig | null;
  setViewMode: (mode: ViewMode) => void;
  loadStations: (stations: Station[]) => void;
  setHostStats: (stats: HostStats) => void;
  setDriverConfig: (config: DriverConfig) => void;
  saveStation: (stationData: Partial<Station>) => void;
  bookStation: (id: string) => void;
  toggleStationStatus: (id: string) => void;
  reset: () => void;
};

const createNewStation = (stationData: Partial<Station>): Station => ({
  id: String(Date.now()),
  hostName: 'Current User',
  title: stationData.title || 'New Station',
  location: stationData.location || 'Pune',
  rating: stationData.rating ?? 0,
  reviewCount: stationData.reviewCount ?? 0,
  pricePerHour: stationData.pricePerHour ?? 0,
  status: StationStatus.AVAILABLE,
  image: stationData.image || 'https://picsum.photos/400/300',
  connectorType: stationData.connectorType || 'Type 2',
  powerOutput: stationData.powerOutput || '7.2kW',
  description: stationData.description || '',
  coords: stationData.coords || { x: 50, y: 50 },
  lat: stationData.lat ?? 18.5204,
  lng: stationData.lng ?? 73.8567,
  distance: stationData.distance || '0.1 km',
  phoneNumber: stationData.phoneNumber,
  supportedVehicleTypes: stationData.supportedVehicleTypes ?? ['2W', '4W'],
  bookedTimeSlots: stationData.bookedTimeSlots ?? [],
  blockedTimeSlots: stationData.blockedTimeSlots ?? [],
  availableTimeSlots: stationData.availableTimeSlots ?? [],
});

const initialState = {
  viewMode: 'driver' as ViewMode,
  stations: [] as Station[],
  hostStats: {
    totalEarnings: 0,
    activeBookings: 0,
    stationHealth: 0
  } as HostStats,
  driverConfig: null,
};

export const useStationStore = create<StationStore>((set) => ({
  ...initialState,
  setViewMode: (mode) => set({ viewMode: mode }),
  loadStations: (stations) => set({ stations }),
  setHostStats: (stats) => set({ hostStats: stats }),
  setDriverConfig: (config) => set({ driverConfig: config }),
  saveStation: (stationData) =>
    set((state) => {
      if (stationData.id) {
        const existing = state.stations.some((station) => station.id === stationData.id);
        if (!existing) {
          return { stations: [stationData as Station, ...state.stations] };
        }
        return {
          stations: state.stations.map((station) =>
            station.id === stationData.id
              ? ({ ...station, ...stationData } as Station)
              : station
          ),
        };
      }

      return {
        stations: [createNewStation(stationData), ...state.stations],
      };
    }),
  bookStation: (id) =>
    set((state) => ({
      stations: state.stations.map((station) =>
        station.id === id
          ? { ...station, status: StationStatus.BUSY }
          : station
      ),
    })),
  toggleStationStatus: (id) =>
    set((state) => ({
      stations: state.stations.map((station) => {
        if (station.id !== id) return station;
        const newStatus =
          station.status === StationStatus.OFFLINE
            ? StationStatus.AVAILABLE
            : StationStatus.OFFLINE;
        return { ...station, status: newStatus };
      }),
    })),
  reset: () => set(initialState),
}));
