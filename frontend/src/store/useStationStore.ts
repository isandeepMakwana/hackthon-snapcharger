import { create } from 'zustand';
import type { HostStats, Station } from '@/types';
import { StationStatus } from '@/types';
import { MOCK_HOST_STATS, MOCK_STATIONS } from '@/data/mockStations';

type ViewMode = 'driver' | 'host';

type StationStore = {
  viewMode: ViewMode;
  stations: Station[];
  hostStats: HostStats;
  setViewMode: (mode: ViewMode) => void;
  saveStation: (stationData: Partial<Station>) => void;
  bookStation: (id: string) => void;
  toggleStationStatus: (id: string) => void;
  reset: () => void;
};

const defaultStats: HostStats = MOCK_HOST_STATS;

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
});

const initialState = {
  viewMode: 'driver' as ViewMode,
  stations: MOCK_STATIONS,
  hostStats: defaultStats,
};

export const useStationStore = create<StationStore>((set) => ({
  ...initialState,
  setViewMode: (mode) => set({ viewMode: mode }),
  saveStation: (stationData) =>
    set((state) => {
      if (stationData.id) {
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
