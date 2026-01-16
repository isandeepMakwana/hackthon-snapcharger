import type { StationStatus } from '@/types';

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
