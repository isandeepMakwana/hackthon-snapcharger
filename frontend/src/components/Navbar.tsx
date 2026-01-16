import { ChevronDown, LogOut, MapPin, Menu, User, Zap } from 'lucide-react';
import { INITIAL_USER_AVATAR } from '@/data/mockStations';
import { useState } from 'react';

interface NavbarProps {
  viewMode: 'driver' | 'host';
  setViewMode: (mode: 'driver' | 'host') => void;
  isAuthenticated: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
  authRole: 'driver' | 'host' | 'admin' | null;
  locationLabel?: string;
}

const Navbar = ({
  viewMode,
  setViewMode,
  isAuthenticated,
  onLoginClick,
  onLogout,
  authRole,
  locationLabel,
}: NavbarProps) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <nav className="relative z-[1100] flex h-16 items-center justify-between border-b border-border bg-surface-strong/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-500 p-1.5 text-white">
          <Zap size={20} fill="currentColor" aria-hidden="true" />
        </div>
        <div className="hidden sm:flex flex-col">
          <span className="text-lg font-semibold text-ink">
            Snap<span className="text-accent">Charge</span>
          </span>
          <span className="text-xs text-muted">EV charging marketplace</span>
        </div>
      </div>

      <div
        className="flex items-center gap-2 rounded-full border border-border bg-surface px-1.5 py-1 text-xs font-semibold"
        role="group"
        aria-label="Switch dashboard role"
      >
        <button
          type="button"
          onClick={() => setViewMode('driver')}
          aria-pressed={viewMode === 'driver'}
          className={`rounded-full px-4 py-1.5 transition-colors ${
            viewMode === 'driver'
              ? 'bg-surface-strong text-ink shadow-soft'
              : 'text-muted hover:text-ink'
          }`}
        >
          Driver
        </button>
        <button
          type="button"
          onClick={() => setViewMode('host')}
          aria-pressed={viewMode === 'host'}
          className={`rounded-full px-4 py-1.5 transition-colors ${
            viewMode === 'host'
              ? 'bg-surface-strong text-ink shadow-soft'
              : 'text-muted hover:text-ink'
          }`}
        >
          Host
        </button>
      </div>

      <div className="flex items-center gap-3">
        {locationLabel && (
          <div className="hidden items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted sm:flex">
            <MapPin size={12} aria-hidden="true" />
            {locationLabel}
          </div>
        )}
        <button
          type="button"
          className="rounded-full p-2 text-muted transition hover:bg-surface sm:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        {isAuthenticated ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-2 py-1"
              aria-expanded={showMenu}
              aria-haspopup="menu"
            >
              <User size={14} className="text-muted" aria-hidden="true" />
              <div className="h-8 w-8 overflow-hidden rounded-full">
                <img src={INITIAL_USER_AVATAR} alt="Profile" className="h-full w-full object-cover" />
              </div>
              <ChevronDown size={14} className="hidden text-muted sm:block" aria-hidden="true" />
            </button>

            {showMenu && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-[1050]"
                  aria-label="Close menu"
                  onClick={() => setShowMenu(false)}
                />
                <div
                  className="absolute right-0 top-full z-[1100] mt-2 w-48 overflow-hidden rounded-2xl border border-border bg-surface-strong shadow-card"
                  role="menu"
                >
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-semibold text-ink">Signed in</p>
                    <p className="text-xs text-muted">
                      Role: {authRole === 'host' ? 'Host' : authRole === 'admin' ? 'Admin' : 'Driver'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-rose-50"
                    role="menuitem"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onLoginClick}
            className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-slate-900"
          >
            <User size={16} /> Sign in
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
