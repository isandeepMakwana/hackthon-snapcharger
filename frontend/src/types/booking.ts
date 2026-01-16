export interface HostBooking {
  id: string;
  stationId: string;
  stationTitle: string;
  stationLocation: string;
  stationPricePerHour: number;
  driverId: string;
  driverName: string;
  driverPhoneNumber: string;
  startTime?: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}
