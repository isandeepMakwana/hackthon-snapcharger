import { useEffect, useState } from 'react';
import { Check, X, User, Mail, Phone, Lock, Car, Home } from 'lucide-react';
import type { AuthUser } from '@/types/auth';
import type { DriverProfile, HostProfile } from '@/types/profile';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: {
    username?: string;
    email?: string;
    phoneNumber?: string;
    password?: string;
  }) => Promise<void>;
  onSaveDriverProfile?: (profile: { vehicleType: '2W' | '4W'; vehicleModel: string; vehicleNumber?: string }) => Promise<void>;
  onSaveHostProfile?: (profile: { parkingType: string; parkingAddress?: string }) => Promise<void>;
  currentUser: AuthUser;
  driverProfile?: DriverProfile | null;
  hostProfile?: HostProfile | null;
}

type TabType = 'account' | 'driver' | 'host';

const EditProfileModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onSaveDriverProfile,
  onSaveHostProfile,
  currentUser,
  driverProfile,
  hostProfile 
}: EditProfileModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
  });
  const [driverData, setDriverData] = useState({
    vehicleType: '2W' as '2W' | '4W',
    vehicleModel: '',
    vehicleNumber: '',
  });
  const [hostData, setHostData] = useState({
    parkingType: 'covered',
    parkingAddress: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showDriverTab = currentUser.driverProfileComplete || currentUser.role === 'admin';
  const showHostTab = currentUser.hostProfileComplete || currentUser.role === 'admin';

  useEffect(() => {
    if (isOpen) {
      setFormData({
        username: currentUser.username,
        email: currentUser.email,
        phoneNumber: currentUser.phoneNumber || '',
        password: '',
      });
      setDriverData({
        vehicleType: (driverProfile?.vehicleType as '2W' | '4W') || '2W',
        vehicleModel: driverProfile?.vehicleModel || '',
        vehicleNumber: driverProfile?.vehicleNumber || '',
      });
      setHostData({
        parkingType: hostProfile?.parkingType || 'covered',
        parkingAddress: hostProfile?.parkingAddress || '',
      });
      setActiveTab('account');
      setError(null);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, currentUser, driverProfile, hostProfile]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let hasChanges = false;

      // Update user profile based on active tab
      if (activeTab === 'account') {
        const updates: any = {};
        
        if (formData.username !== currentUser.username) {
          updates.username = formData.username;
        }
        if (formData.email !== currentUser.email) {
          updates.email = formData.email;
        }
        if (formData.phoneNumber !== (currentUser.phoneNumber || '')) {
          updates.phoneNumber = formData.phoneNumber;
        }
        if (formData.password) {
          updates.password = formData.password;
        }

        if (Object.keys(updates).length > 0) {
          await onSave(updates);
          hasChanges = true;
        }
      }

      // Update driver profile
      if (activeTab === 'driver' && showDriverTab && onSaveDriverProfile) {
        const driverUpdates: any = {
          vehicleType: driverData.vehicleType,
          vehicleModel: driverData.vehicleModel,
        };
        if (driverData.vehicleNumber) {
          driverUpdates.vehicleNumber = driverData.vehicleNumber;
        }
        
        await onSaveDriverProfile(driverUpdates);
        hasChanges = true;
      }

      // Update host profile
      if (activeTab === 'host' && showHostTab && onSaveHostProfile) {
        const hostUpdates: any = {
          parkingType: hostData.parkingType,
        };
        if (hostData.parkingAddress) {
          hostUpdates.parkingAddress = hostData.parkingAddress;
        }
        
        await onSaveHostProfile(hostUpdates);
        hasChanges = true;
      }

      if (!hasChanges) {
        setError('No changes to save');
        setIsLoading(false);
        return;
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface-strong shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold text-ink">Edit Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted transition hover:bg-surface"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border bg-surface">
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === 'account'
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <User size={16} /> Account
            </button>
            {showDriverTab && (
              <button
                type="button"
                onClick={() => setActiveTab('driver')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition ${
                  activeTab === 'driver'
                    ? 'border-b-2 border-accent text-accent'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <Car size={16} /> Driver
              </button>
            )}
            {showHostTab && (
              <button
                type="button"
                onClick={() => setActiveTab('host')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition ${
                  activeTab === 'host'
                    ? 'border-b-2 border-accent text-accent'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <Home size={16} /> Host
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase text-muted" htmlFor="username">
                  <User size={14} /> Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  required
                  minLength={3}
                  maxLength={50}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase text-muted" htmlFor="email">
                  <Mail size={14} /> Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  required
                />
                <p className="mt-1 text-xs text-muted">Changing email will require re-verification</p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase text-muted" htmlFor="phoneNumber">
                  <Phone size={14} /> Phone Number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  minLength={7}
                  maxLength={30}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase text-muted" htmlFor="password">
                  <Lock size={14} /> New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  placeholder="Leave blank to keep current"
                  minLength={8}
                />
                {formData.password && (
                  <p className="mt-1 text-xs text-amber-600">
                    Changing password will log you out from other devices
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Driver Tab */}
          {activeTab === 'driver' && showDriverTab && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted" htmlFor="vehicleType">
                  Vehicle Type
                </label>
                <select
                  id="vehicleType"
                  value={driverData.vehicleType}
                  onChange={(e) => setDriverData({ ...driverData, vehicleType: e.target.value as '2W' | '4W' })}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                >
                  <option value="2W">2 Wheeler</option>
                  <option value="4W">4 Wheeler</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted" htmlFor="vehicleModel">
                  Vehicle Model
                </label>
                <input
                  id="vehicleModel"
                  type="text"
                  value={driverData.vehicleModel}
                  onChange={(e) => setDriverData({ ...driverData, vehicleModel: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  placeholder="e.g., Tesla Model 3, Tata Nexon EV"
                  required
                  minLength={2}
                  maxLength={120}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted" htmlFor="vehicleNumber">
                  Vehicle Number (Optional)
                </label>
                <input
                  id="vehicleNumber"
                  type="text"
                  value={driverData.vehicleNumber}
                  onChange={(e) => setDriverData({ ...driverData, vehicleNumber: e.target.value.toUpperCase() })}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  placeholder="e.g., MH12AB1234"
                  maxLength={20}
                />
              </div>
            </div>
          )}

          {/* Host Tab */}
          {activeTab === 'host' && showHostTab && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted" htmlFor="parkingType">
                  Parking Type
                </label>
                <select
                  id="parkingType"
                  value={hostData.parkingType}
                  onChange={(e) => setHostData({ ...hostData, parkingType: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                >
                  <option value="covered">Covered Parking</option>
                  <option value="open">Open Parking</option>
                  <option value="shared">Shared Parking</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted" htmlFor="parkingAddress">
                  Parking Address
                </label>
                <textarea
                  id="parkingAddress"
                  value={hostData.parkingAddress}
                  onChange={(e) => setHostData({ ...hostData, parkingAddress: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm resize-none"
                  placeholder="Enter your parking location address"
                  rows={4}
                  maxLength={255}
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-muted hover:text-ink transition"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-accent-strong disabled:opacity-50"
              disabled={isLoading}
            >
              <Check size={18} /> {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
