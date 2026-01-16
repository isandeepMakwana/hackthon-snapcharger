import { Suspense, lazy, useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useStationStore } from '@/store/useStationStore';
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import {
  clearAuthSession,
  fetchProfile,
  isSessionExpired,
  loadAuthSession,
  loginUser,
  logoutSession,
  persistAuthSession,
  refreshSession,
  registerUser,
  requestPasswordReset,
  storeAuthSession,
} from '@/services/authService';
import type { AuthRole, AuthUser, StoredAuthSession } from '@/types/auth';

const DriverView = lazy(() => import('@/features/driver/DriverView'));
const HostView = lazy(() => import('@/features/host/HostView'));

type AuthState = 'guest' | 'login' | 'register' | 'authenticated';
type LoginIntent = 'general' | 'book' | 'host';

const App = () => {
  const viewMode = useStationStore((state) => state.viewMode);
  const setViewMode = useStationStore((state) => state.setViewMode);
  const [authState, setAuthState] = useState<AuthState>('guest');
  const [authRole, setAuthRole] = useState<AuthRole | null>(null);
  const [authSession, setAuthSession] = useState<StoredAuthSession | null>(null);
  const [loginIntent, setLoginIntent] = useState<LoginIntent>('general');
  const [pendingBookingStationId, setPendingBookingStationId] = useState<string | null>(null);

  const resolveViewMode = (role: AuthRole) => (role === 'host' || role === 'admin' ? 'host' : 'driver');

  const applyAuthenticatedState = (user: AuthUser) => {
    setAuthState('authenticated');
    setAuthRole(user.role);
    if (pendingBookingStationId) {
      setViewMode('driver');
      return;
    }
    setViewMode(resolveViewMode(user.role));
  };

  const handleLogin = async (payload: { role: 'driver' | 'host'; email: string; password: string }) => {
    const result = await loginUser({ email: payload.email, password: payload.password });
    if (result.user.role !== payload.role && !(result.user.role === 'admin' && payload.role === 'host')) {
      throw new Error(`This account is registered as a ${result.user.role}.`);
    }
    const stored = storeAuthSession(result);
    setAuthSession(stored);
    applyAuthenticatedState(result.user);
  };

  const handleRegister = async (payload: {
    role: 'driver' | 'host';
    username: string;
    email: string;
    password: string;
    vehicleModel?: string;
    parkingType?: string;
  }) => {
    const result = await registerUser({
      username: payload.username,
      email: payload.email,
      password: payload.password,
      role: payload.role,
    });
    const stored = storeAuthSession(result);
    setAuthSession(stored);
    applyAuthenticatedState(result.user);
  };

  const handleForgotPassword = async (email: string) => {
    await requestPasswordReset(email);
  };

  const handleLogout = () => {
    const refreshToken = authSession?.refreshToken;
    clearAuthSession();
    setAuthSession(null);
    setAuthState('guest');
    setAuthRole(null);
    setLoginIntent('general');
    setPendingBookingStationId(null);
    setViewMode('driver');

    if (refreshToken) {
      void logoutSession(refreshToken).catch(() => {});
    }
  };

  const handleViewModeChange = (mode: 'driver' | 'host') => {
    if (mode === 'host') {
      if (authState !== 'authenticated' || (authRole !== 'host' && authRole !== 'admin')) {
        setLoginIntent('host');
        setAuthState('login');
        return;
      }
    }
    setViewMode(mode);
  };

  const handleLoginRequest = (intent: LoginIntent = 'general', stationId?: string) => {
    setLoginIntent(intent);
    if (intent === 'book' && stationId) {
      setPendingBookingStationId(stationId);
    }
    setAuthState('login');
  };

  const handlePendingBookingHandled = () => {
    setPendingBookingStationId(null);
    setLoginIntent('general');
  };

  useEffect(() => {
    let isActive = true;

    const restoreSession = async () => {
      const stored = loadAuthSession();
      if (!stored) {
        return;
      }

      try {
        if (isSessionExpired(stored)) {
          const refreshed = await refreshSession(stored.refreshToken);
          const updated = storeAuthSession(refreshed);
          if (!isActive) return;
          setAuthSession(updated);
          applyAuthenticatedState(refreshed.user);
          return;
        }

        const profile = await fetchProfile(stored.accessToken);
        const updatedSession = { ...stored, user: profile, role: profile.role };
        persistAuthSession(updatedSession);
        if (!isActive) return;
        setAuthSession(updatedSession);
        applyAuthenticatedState(profile);
      } catch {
        clearAuthSession();
        if (!isActive) return;
        setAuthSession(null);
        setAuthState('guest');
        setAuthRole(null);
      }
    };

    restoreSession();

    return () => {
      isActive = false;
    };
  }, [setViewMode]);

  if (authState === 'login') {
    const loginMessage =
      loginIntent === 'book'
        ? 'Sign in to book this charger. We will bring you back to your booking after login.'
        : loginIntent === 'host'
          ? 'Host dashboard access requires a host account. Sign in as a host to continue.'
          : undefined;
    return (
      <LoginPage
        onLogin={handleLogin}
        onForgotPassword={handleForgotPassword}
        onNavigateToRegister={() => setAuthState('register')}
        notice={loginMessage}
      />
    );
  }

  if (authState === 'register') {
    const registerMessage =
      loginIntent === 'book'
        ? 'Create an account to book your selected charger. We will bring you back to your booking after signup.'
        : loginIntent === 'host'
          ? 'Host dashboard access requires a host account. Create a host account to continue.'
          : undefined;
    return (
      <RegisterPage
        onRegister={handleRegister}
        onNavigateToLogin={() => setAuthState('login')}
        notice={registerMessage}
      />
    );
  }

  return (
    <div className="app-background min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface-strong focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>
      <div className="app-content min-h-screen flex flex-col">
        <Navbar
          viewMode={viewMode}
          setViewMode={handleViewModeChange}
          isAuthenticated={authState === 'authenticated'}
          onLoginClick={() => handleLoginRequest('general')}
          onLogout={handleLogout}
          authRole={authRole}
        />
        <main id="main-content" className="flex-1 overflow-hidden">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-muted">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <p className="text-sm font-medium">Loading experience...</p>
                </div>
              </div>
            }
          >
            {viewMode === 'driver' ? (
              <DriverView
                isLoggedIn={authState === 'authenticated'}
                onLoginRequest={handleLoginRequest}
                pendingBookingStationId={pendingBookingStationId}
                onPendingBookingHandled={handlePendingBookingHandled}
              />
            ) : (
              <HostView />
            )}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default App;
