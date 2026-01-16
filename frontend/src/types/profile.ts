export interface DriverProfileInput {
  vehicleType: '2W' | '4W';
  vehicleModel: string;
  vehicleNumber?: string;
}

export interface DriverProfile extends DriverProfileInput {
  id?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HostProfileInput {
  parkingType: 'covered' | 'open' | 'shared';
  parkingAddress?: string;
  parkingLat?: number;
  parkingLng?: number;
}

export interface HostProfile extends HostProfileInput {
  id?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}
