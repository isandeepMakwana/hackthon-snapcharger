import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import EditProfileModal from '@/components/EditProfileModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStationStore } from '@/store/useStationStore';
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import ProfileGateModal from '@/components/ProfileGateModal';
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
  updateProfile,
} from '@/services/authService';
import { saveDriverProfile, saveHostProfile, fetchDriverProfile, fetchHostProfile } from '@/services/profileService';
import type { AuthUser, StoredAuthSession } from '@/types/auth';
import type { DriverProfileInput, HostProfileInput, DriverProfile, HostProfile } from '@/types/profile';

const DriverView = lazy(() => import('@/features/driver/DriverView'));
const HostView = lazy(() => import('@/features/host/HostView'));

type AuthState = 'guest' | 'login' | 'register' | 'authenticated';
type LoginIntent = 'general' | 'book' | 'host';

const AppShell = () => {
  const { stationId, stationSlug, stationRef } = useParams();
  const resolvedStationId = stationId ?? stationRef;
  const resolvedStationSlug = stationSlug ?? stationRef;
  const navigate = useNavigate();
  const viewMode = useStationStore((state) => state.viewMode);
  const setViewMode = useStationStore((state) => state.setViewMode);
  const driverConfig = useStationStore((state) => state.driverConfig);
  const [authState, setAuthState] = useState<AuthState>('guest');
  const [authSession, setAuthSession] = useState<StoredAuthSession | null>(null);
  const [loginIntent, setLoginIntent] = useState<LoginIntent>('general');
  const [pendingBookingStationId, setPendingBookingStationId] = useState<string | null>(null);
  const [profileGateMode, setProfileGateMode] = useState<'driver' | 'host' | null>(null);
  const [pendingViewMode, setPendingViewMode] = useState<'driver' | 'host' | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [driverProfileData, setDriverProfileData] = useState<DriverProfile | null>(null);
  const [hostProfileData, setHostProfileData] = useState<HostProfile | null>(null);
  const hasHandledStationRoute = useRef(false);

  const isAdmin = authSession?.user.role === 'admin';
  const driverProfileComplete = Boolean(authSession?.user.driverProfileComplete);
  const hostProfileComplete = Boolean(authSession?.user.hostProfileComplete);

  const applyAuthenticatedState = (user: AuthUser) => {
    setAuthState('authenticated');
    const intent = loginIntent;
    if (intent === 'host') {
      setLoginIntent('general');
      if (user.role === 'admin' || user.hostProfileComplete) {
        setViewMode('host');
      } else {
        setPendingViewMode('host');
        setProfileGateMode('host');
      }
      return;
    }
    if (pendingBookingStationId) {
      setLoginIntent('general');
      setViewMode('driver');
      if (!user.driverProfileComplete && user.role !== 'admin') {
        setPendingViewMode('driver');
        setProfileGateMode('driver');
      }
      return;
    }
    if (viewMode === 'host') {
      setLoginIntent('general');
      if (user.role === 'admin' || user.hostProfileComplete) {
        setViewMode('host');
      } else {
        setPendingViewMode('host');
        setProfileGateMode('host');
      }
      return;
    }
    if (!user.driverProfileComplete && user.role !== 'admin') {
      setPendingViewMode('driver');
      setProfileGateMode('driver');
    }
    setLoginIntent('general');
  };

  const handleLogin = async (payload: { email: string; password: string }) => {
    const result = await loginUser({ email: payload.email, password: payload.password });
    const stored = storeAuthSession(result);
    setAuthSession(stored);
    applyAuthenticatedState(result.user);
  };

  const handleRegister = async (payload: {
    username: string;
    email: string;
    phoneNumber: string;
    password: string;
  }) => {
    const result = await registerUser({
      username: payload.username,
      email: payload.email,
      password: payload.password,
      phoneNumber: payload.phoneNumber
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
    setLoginIntent('general');
    setPendingBookingStationId(null);
    setProfileGateMode(null);
    setPendingViewMode(null);
    setViewMode('driver');

    if (refreshToken) {
      void logoutSession(refreshToken).catch(() => {});
    }
  };

  const handleViewModeChange = (mode: 'driver' | 'host') => {
    if (mode === 'host') {
      if (authState !== 'authenticated') {
        setLoginIntent('host');
        setAuthState('login');
        return;
      }
      if (!hostProfileComplete && !isAdmin) {
        setPendingViewMode('host');
        setProfileGateMode('host');
        return;
      }
    }
    if (mode === 'driver' && authState === 'authenticated' && !driverProfileComplete && !isAdmin) {
      setPendingViewMode('driver');
      setProfileGateMode('driver');
      return;
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

  const handleUpdateProfile = async (updates: {
    username?: string;
    email?: string;
    phoneNumber?: string;
    password?: string;
  }) => {
    if (!authSession) throw new Error('Not authenticated');
    
    const updatedUser = await updateProfile(authSession.accessToken, updates);
    const updatedSession = { ...authSession, user: updatedUser };
    setAuthSession(updatedSession);
    persistAuthSession(updatedSession);
  };

  const handleUpdateDriverProfile = async (profile: { vehicleType: '2W' | '4W'; vehicleModel: string; vehicleNumber?: string }) => {
    const updated = await saveDriverProfile(profile);
    setDriverProfileData(updated);
  };

  const handleUpdateHostProfile = async (profile: { parkingType: string; parkingAddress?: string }) => {
    const updated = await saveHostProfile(profile);
    setHostProfileData(updated);
  };

  const handleOpenEditProfile = async () => {
    // Fetch profiles when opening the modal
    if (driverProfileComplete) {
      try {
        const profile = await fetchDriverProfile();
        setDriverProfileData(profile);
      } catch (error) {
        console.error('Failed to fetch driver profile:', error);
      }
    }
    if (hostProfileComplete) {
      try {
        const profile = await fetchHostProfile();
        setHostProfileData(profile);
      } catch (error) {
        console.error('Failed to fetch host profile:', error);
      }
    }
    setIsEditProfileOpen(true);
  };

  useEffect(() => {
    let isActive = true;

    const restoreSession = async () => {
      const stored = loadAuthSession();
      if (!stored) {
        return;
      }

      try {
        // Check if token is expired
        if (isSessionExpired(stored)) {
          // Try to refresh the token
          try {
            const refreshed = await refreshSession(stored.refreshToken);
            const updated = storeAuthSession(refreshed);
            if (!isActive) return;
            setAuthSession(updated);
            applyAuthenticatedState(refreshed.user);
            return;
          } catch (refreshError) {
            // If refresh fails, clear session and log out
            console.error('Token refresh failed:', refreshError);
            clearAuthSession();
            if (!isActive) return;
            setAuthSession(null);
            setAuthState('guest');
            return;
          }
        }

        // Token is still valid, fetch latest profile
        try {
          const profile = await fetchProfile(stored.accessToken);
          const updatedSession = { ...stored, user: profile, role: profile.role };
          persistAuthSession(updatedSession);
          if (!isActive) return;
          setAuthSession(updatedSession);
          applyAuthenticatedState(profile);
        } catch (profileError) {
          // If profile fetch fails but token is valid, use stored session
          console.warn('Profile fetch failed, using stored session:', profileError);
          if (!isActive) return;
          setAuthSession(stored);
          applyAuthenticatedState(stored.user);
        }
      } catch (error) {
        // Only clear session on critical errors
        console.error('Session restoration error:', error);
        clearAuthSession();
        if (!isActive) return;
        setAuthSession(null);
        setAuthState('guest');
      }
    };

    restoreSession();

    return () => {
      isActive = false;
    };
  }, [setViewMode]);

  // Only auto-switch to driver view if user navigates directly to a station URL
  // Don't interfere with manual tab switches
  useEffect(() => {
    const hasStationRoute = Boolean(stationSlug || stationId || stationRef);
    if (!hasStationRoute) {
      hasHandledStationRoute.current = false;
      return;
    }
    if (!hasHandledStationRoute.current) {
      hasHandledStationRoute.current = true;
      if (viewMode !== 'driver') {
        setViewMode('driver');
      }
    }
  }, [stationSlug, stationId, stationRef, viewMode, setViewMode]);

  useEffect(() => {
    if (viewMode === 'host' && (stationSlug || stationId || stationRef)) {
      navigate('/', { replace: true });
    }
  }, [viewMode, stationSlug, stationId, stationRef, navigate]);

  if (authState === 'login') {
    const loginMessage =
      loginIntent === 'book'
        ? 'Sign in to book this charger. We will bring you back to your booking after login.'
        : loginIntent === 'host'
          ? 'Sign in to unlock the host dashboard.'
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
          ? 'Create an account to unlock the host dashboard.'
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
      <Tabs
        value={viewMode}
        onValueChange={(value) => handleViewModeChange(value as 'driver' | 'host')}
        className="app-content min-h-screen flex flex-col"
      >
        <Navbar
          viewSwitcher={
            <TabsList aria-label="Switch dashboard role">
              <TabsTrigger value="driver">Driver</TabsTrigger>
              <TabsTrigger value="host">Host</TabsTrigger>
            </TabsList>
          }
          isAuthenticated={authState === 'authenticated'}
          onLoginClick={() => handleLoginRequest('general')}
          onLogout={handleLogout}
          onEditProfile={handleOpenEditProfile}
          authRole={authSession?.user.role ?? null}
          locationLabel={viewMode === 'driver' ? driverConfig?.locationLabel : undefined}
        />
        {authSession && (
          <EditProfileModal
            isOpen={isEditProfileOpen}
            onClose={() => setIsEditProfileOpen(false)}
            onSave={handleUpdateProfile}
            onSaveDriverProfile={handleUpdateDriverProfile}
            onSaveHostProfile={handleUpdateHostProfile}
            currentUser={authSession.user}
            driverProfile={driverProfileData}
            hostProfile={hostProfileData}
          />
        )}
        <ProfileGateModal
          isOpen={profileGateMode !== null}
          mode={profileGateMode ?? 'driver'}
          onClose={() => {
            setProfileGateMode(null);
            setPendingViewMode(null);
          }}
          onSave={async (mode, payload) => {
            if (!authSession) return;
            if (mode === 'driver') {
              await saveDriverProfile(payload as DriverProfileInput);
              const updatedUser = { ...authSession.user, driverProfileComplete: true };
              const updatedSession = { ...authSession, user: updatedUser };
              setAuthSession(updatedSession);
              persistAuthSession(updatedSession);
            } else {
              await saveHostProfile(payload as HostProfileInput);
              const updatedUser = { ...authSession.user, hostProfileComplete: true };
              const updatedSession = { ...authSession, user: updatedUser };
              setAuthSession(updatedSession);
              persistAuthSession(updatedSession);
            }
            setProfileGateMode(null);
            if (pendingViewMode) {
              setViewMode(pendingViewMode);
              setPendingViewMode(null);
            }
          }}
        />
        <main id="main-content" className="flex-1 min-h-0 overflow-hidden">
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
            <TabsContent value="driver" className="h-full">
              <DriverView
                isLoggedIn={authState === 'authenticated'}
                onLoginRequest={handleLoginRequest}
                pendingBookingStationId={pendingBookingStationId}
                onPendingBookingHandled={handlePendingBookingHandled}
                driverProfileComplete={driverProfileComplete}
                stationId={resolvedStationId}
                stationSlug={resolvedStationSlug}
                onRequireDriverProfile={() => {
                  if (authState !== 'authenticated') return;
                  if (!driverProfileComplete && !isAdmin) {
                    setPendingViewMode('driver');
                    setProfileGateMode('driver');
                  }
                }}
              />
            </TabsContent>
            <TabsContent value="host" className="h-full">
              <HostView />
            </TabsContent>
          </Suspense>
        </main>
      </Tabs>
    </div>
  );
};

const App = () => (
  <Routes>
    <Route path="/" element={<AppShell />} />
    <Route path="/stations/:stationRef" element={<AppShell />} />
    <Route path="/stations/:stationId/:stationSlug" element={<AppShell />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
