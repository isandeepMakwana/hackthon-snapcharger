export interface DriverProfileInput {
  vehicleType: '2W' | '4W';
  vehicleModel: string;
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
}

export interface HostProfile extends HostProfileInput {
  id?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}
