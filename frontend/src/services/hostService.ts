import type { HostStats, Station } from '@/types';
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
      ...getAuthHeaders(),
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

export const fetchHostStations = async (): Promise<Station[]> => {
  return requestJson<Station[]>('/api/host/stations');
};

export const fetchHostStats = async (): Promise<HostStats> => {
  return requestJson<HostStats>('/api/host/stats');
};

export const createHostStation = async (payload: Partial<Station>): Promise<Station> => {
  return requestJson<Station>('/api/host/stations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const updateHostStation = async (stationId: string, payload: Partial<Station>): Promise<Station> => {
  return requestJson<Station>(`/api/host/stations/${stationId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
};

export const analyzeHostPhoto = async (file: File): Promise<any> => {
  const response = await fetch(`${getApiBaseUrl()}/api/host/analyze-photo`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders()
    },
    body: (() => {
      const form = new FormData();
      form.append('file', file);
      return form;
    })()
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

  return data;
};
