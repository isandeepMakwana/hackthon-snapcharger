import { Suspense, lazy, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useStationStore } from '@/store/useStationStore';
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';

const DriverView = lazy(() => import('@/features/driver/DriverView'));
const HostView = lazy(() => import('@/features/host/HostView'));

type AuthState = 'guest' | 'login' | 'register' | 'authenticated';
type AuthRole = 'driver' | 'host' | null;
type LoginIntent = 'general' | 'book' | 'host';

const App = () => {
  const viewMode = useStationStore((state) => state.viewMode);
  const setViewMode = useStationStore((state) => state.setViewMode);
  const [authState, setAuthState] = useState<AuthState>('guest');
  const [authRole, setAuthRole] = useState<AuthRole>(null);
  const [loginIntent, setLoginIntent] = useState<LoginIntent>('general');
  const [pendingBookingStationId, setPendingBookingStationId] = useState<string | null>(null);

  const handleLogin = (role: 'driver' | 'host') => {
    setAuthState('authenticated');
    setAuthRole(role);
    if (pendingBookingStationId) {
      setViewMode('driver');
      return;
    }
    setViewMode(role);
  };

  const handleRegister = (role: 'driver' | 'host') => {
    setAuthState('authenticated');
    setAuthRole(role);
    if (pendingBookingStationId) {
      setViewMode('driver');
      return;
    }
    setViewMode(role);
  };

  const handleLogout = () => {
    setAuthState('guest');
    setAuthRole(null);
    setLoginIntent('general');
    setPendingBookingStationId(null);
    setViewMode('driver');
  };

  const handleViewModeChange = (mode: 'driver' | 'host') => {
    if (mode === 'host') {
      if (authState !== 'authenticated' || authRole !== 'host') {
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
