import type { Station } from '@/types';
import type { DriverConfig } from '@/types/driver';
import type { DriverBooking } from '@/types/booking';
import { loadAuthSession } from '@/services/authService';

const getApiBaseUrl = () =>
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (window as any).VITE_API_BASE_URL ||
  'http://localhost:8000';

const parseErrorMessage = (data: any) => {
  if (!data) return 'Something went wrong. Please try again.';
  if (data.error?.message) return data.error.message as string;
  if (data.detail?.message) return data.detail.message as string;
  if (typeof data.detail === 'string') return data.detail;
  return 'Something went wrong. Please try again.';
};

const getAuthHeaders = () => {
  const session = loadAuthSession();
  if (!session?.accessToken) {
    throw new Error('Missing authentication session.');
  }
  return { Authorization: `Bearer ${session.accessToken}` };
};

const normalizeHeaders = (headers?: HeadersInit) => {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return headers;
};

const requestJson = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const { headers, ...rest } = options;
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...normalizeHeaders(headers)
    },
    ...rest
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(parseErrorMessage(data));
  }

  return data as T;
};

export const fetchDriverStations = async (payload: {
  lat: number;
  lng: number;
  radiusKm: number;
  status?: string;
  vehicleType?: string;
  tags?: string[];
  query?: string;
  bookingDate?: string;
}): Promise<Station[]> => {
  const params = new URLSearchParams({
    lat: String(payload.lat),
    lng: String(payload.lng),
    radius_km: String(payload.radiusKm)
  });
  if (payload.status && payload.status !== 'ALL') {
    params.set('status', payload.status);
  }
  if (payload.vehicleType && payload.vehicleType !== 'ALL') {
    params.set('vehicle_type', payload.vehicleType);
  }
  if (payload.query) {
    params.set('q', payload.query);
  }
  if (payload.bookingDate) {
    params.set('booking_date', payload.bookingDate);
  }
  if (payload.tags) {
    payload.tags.forEach((tag) => params.append('tags', tag));
  }
  return requestJson<Station[]>(`/api/driver/search?${params.toString()}`);
};

export const fetchDriverConfig = async (): Promise<DriverConfig> => {
  return requestJson<DriverConfig>('/api/driver/config');
};

export const createDriverBooking = async (payload: {
  stationId: string;
  bookingDate: string;
  startTime?: string;
  userLat?: number;
  userLng?: number;
}): Promise<Station> => {
  return requestJson<Station>('/api/driver/bookings', {
    method: 'POST',
    headers: {
      ...getAuthHeaders()
    },
    body: JSON.stringify(payload)
  });
};

export const fetchDriverBookings = async (): Promise<DriverBooking[]> => {
  return requestJson<DriverBooking[]>('/api/driver/bookings', {
    headers: {
      ...getAuthHeaders()
    }
  });
};

export const completeDriverBooking = async (payload: {
  bookingId: string;
  rating: number;
  review?: string;
}): Promise<DriverBooking> => {
  return requestJson<DriverBooking>('/api/driver/bookings/complete', {
    method: 'POST',
    headers: {
      ...getAuthHeaders()
    },
    body: JSON.stringify(payload)
  });
};

export interface StationReview {
  driverName: string;
  rating: number;
  review?: string | null;
  createdAt: string;
}

export const fetchStationReviews = async (stationId: string): Promise<StationReview[]> => {
  return requestJson<StationReview[]>(`/api/driver/stations/${stationId}/reviews`);
};
