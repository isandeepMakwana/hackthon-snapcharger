import type { DriverProfile, DriverProfileInput, HostProfile, HostProfileInput } from '@/types/profile';
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
      ...getAuthHeaders(),
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

export const fetchDriverProfile = async (): Promise<DriverProfile> => {
  return requestJson<DriverProfile>('/api/profile/driver');
};

export const saveDriverProfile = async (payload: DriverProfileInput): Promise<DriverProfile> => {
  return requestJson<DriverProfile>('/api/profile/driver', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

export const fetchHostProfile = async (): Promise<HostProfile> => {
  return requestJson<HostProfile>('/api/profile/host');
};

export const saveHostProfile = async (payload: HostProfileInput): Promise<HostProfile> => {
  return requestJson<HostProfile>('/api/profile/host', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};
