import type { AuthResponse, AuthUser, StoredAuthSession } from '@/types/auth';

const AUTH_STORAGE_KEY = 'snapcharge.auth';

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

export const loginUser = async (payload: { email: string; password: string }): Promise<AuthResponse> => {
  return requestJson<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const registerUser = async (payload: {
  username: string;
  email: string;
  password: string;
  phoneNumber: string;
}): Promise<AuthResponse> => {
  return requestJson<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const refreshSession = async (refreshToken: string): Promise<AuthResponse> => {
  return requestJson<AuthResponse>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
};

export const logoutSession = async (refreshToken: string): Promise<void> => {
  await requestJson('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  await requestJson('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
};

export const fetchProfile = async (accessToken: string): Promise<AuthUser> => {
  return requestJson<AuthUser>('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
};

export const storeAuthSession = (auth: AuthResponse): StoredAuthSession => {
  const expiresAt = Date.now() + auth.tokens.expiresIn * 1000;
  const stored: StoredAuthSession = {
    accessToken: auth.tokens.accessToken,
    refreshToken: auth.tokens.refreshToken,
    expiresAt,
    role: auth.user.role,
    user: auth.user
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
  return stored;
};

export const loadAuthSession = (): StoredAuthSession | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredAuthSession;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const persistAuthSession = (session: StoredAuthSession) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const isSessionExpired = (session: StoredAuthSession, skewSeconds = 30) => {
  return Date.now() >= session.expiresAt - skewSeconds * 1000;
};
