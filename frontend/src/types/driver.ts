import type { Station, StationStatus } from '@/types';

export interface DriverLocation {
  name: string;
  lat: number;
  lng: number;
}

export interface DriverFilterTag {
  id: string;
  label: string;
}

export interface DriverStatusOption {
  value: string;
  label: string;
}

export interface DriverVehicleTypeOption {
  value: string;
  label: string;
}

export interface DriverLegendItem {
  status: StationStatus | string;
  label: string;
}

export interface DriverBookingConfig {
  serviceFee: number;
  timeSlots: string[];
  slotDurationMinutes: number;
}

export interface DriverConfig {
  location: DriverLocation;
  locationLabel: string;
  searchRadiusKm: number;
  displayRadiusKm: number;
  personalizedLabel: string;
  searchPlaceholder: string;
  filterTags: DriverFilterTag[];
  statusOptions: DriverStatusOption[];
  vehicleTypeOptions: DriverVehicleTypeOption[];
  legend: DriverLegendItem[];
  booking: DriverBookingConfig;
}

export interface AvailabilitySummary {
  available: number;
  busy: number;
  offline: number;
  total: number;
}

export interface LocationSearchResult {
  label: string;
  lat: number;
  lng: number;
  availability: AvailabilitySummary;
}

export interface TripStop {
  label: string;
  lat: number;
  lng: number;
  source: string;
}

export interface TripPlanRequest {
  stops: TripStop[];
  vehicleType?: string;
  corridorKm?: number;
}

export interface TripLeg {
  fromLabel: string;
  toLabel: string;
  distanceKm: number;
  durationMin: number;
}

export interface TripRoute {
  distanceKm: number;
  durationMin: number;
  polyline: string;
  bbox: number[];
  legs: TripLeg[];
}

export interface RouteStationInfo {
  station: Station;
  distanceToRouteKm: number;
  distanceFromStartKm: number;
  etaFromStartMin: number;
  estimatedChargeMin: number;
  capacityPorts: number;
  availablePorts: number;
}

export interface TripPlanResponse {
  route: TripRoute;
  stations: RouteStationInfo[];
}
