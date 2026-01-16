export type AuthRole = 'driver' | 'host' | 'admin';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: AuthRole;
  permissions: string[];
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface StoredAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  role: AuthRole;
  user: AuthUser;
}
