import type { Station } from '@/types';
import type { DriverConfig } from '@/types/driver';
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

const requestJson = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
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
  tags?: string[];
  query?: string;
}): Promise<Station[]> => {
  const params = new URLSearchParams({
    lat: String(payload.lat),
    lng: String(payload.lng),
    radius_km: String(payload.radiusKm)
  });
  if (payload.status && payload.status !== 'ALL') {
    params.set('status', payload.status);
  }
  if (payload.query) {
    params.set('q', payload.query);
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
