export interface HostBooking {
  id: string;
  stationId: string;
  stationTitle: string;
  stationLocation: string;
  stationPricePerHour: number;
  driverId: string;
  driverName: string;
  driverPhoneNumber: string;
  bookingDate?: string | null;
  startTime?: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface DriverBooking {
  id: string;
  stationId: string;
  stationTitle: string;
  stationLocation: string;
  stationPricePerHour: number;
  stationImage: string;
  stationLat: number;
  stationLng: number;
  hostId: string;
  hostName: string;
  hostPhoneNumber?: string | null;
  startTime?: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  rating?: number | null;
  review?: string | null;
  createdAt: string;
}
