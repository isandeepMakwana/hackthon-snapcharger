import { useEffect, useState } from 'react';
import { Car, Home, Loader2, MapPin, Navigation } from 'lucide-react';
import type { DriverProfileInput, HostProfileInput } from '@/types/profile';
import MapPicker from '@/components/MapPicker';

interface ProfileGateModalProps {
  isOpen: boolean;
  mode: 'driver' | 'host';
  onClose: () => void;
  onSave: (mode: 'driver' | 'host', payload: DriverProfileInput | HostProfileInput) => Promise<void>;
}

const ProfileGateModal = ({ isOpen, mode, onClose, onSave }: ProfileGateModalProps) => {
  const [vehicleType, setVehicleType] = useState<DriverProfileInput['vehicleType']>('4W');
  const [vehicleModel, setVehicleModel] = useState('');
  const [parkingType, setParkingType] = useState<HostProfileInput['parkingType']>('covered');
  const [parkingAddress, setParkingAddress] = useState('');
  const [parkingCoords, setParkingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addressLookup, setAddressLookup] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setIsSubmitting(false);
    setVehicleType('4W');
    setVehicleModel('');
    setParkingType('covered');
    setParkingAddress('');
    setParkingCoords(null);
    setAddressLookup(null);
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'driver') {
        await onSave('driver', { vehicleType, vehicleModel });
      } else {
        await onSave('host', {
          parkingType,
          parkingAddress: parkingAddress.trim() || undefined,
          parkingLat: parkingCoords?.lat,
          parkingLng: parkingCoords?.lng
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save profile. Please try again.';
      setErrorMessage(message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onClose();
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: { Accept: 'application/json' },
        }
      );
      if (!response.ok) return null;
      const data = await response.json();
      return typeof data?.display_name === 'string' ? data.display_name : null;
    } catch {
      return null;
    }
  };

  const handleLocationSelect = async (coords: { lat: number; lng: number }) => {
    setParkingCoords(coords);
    setAddressLookup('Finding address...');
    const address = await reverseGeocode(coords.lat, coords.lng);
    if (address) {
      setParkingAddress(address);
      setAddressLookup(address);
    } else {
      setAddressLookup('Location selected. Unable to resolve address.');
    }
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close profile setup"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface-strong shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Complete your profile</p>
          <h2 className="text-lg font-semibold text-ink">
            {mode === 'driver' ? 'Driver details' : 'Host details'}
          </h2>
          <p className="text-sm text-muted">
            {mode === 'driver'
              ? 'Tell us about your EV so we can match chargers.'
              : 'Add your parking setup to unlock host tools.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          {mode === 'driver' ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted" htmlFor="vehicle-type">
                  Vehicle type
                </label>
                <div className="flex gap-2">
                  {(['2W', '4W'] as const).map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setVehicleType(value)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        vehicleType === value
                          ? 'border-accent bg-accent-soft text-ink'
                          : 'border-border text-muted hover:text-ink'
                      }`}
                    >
                      {value === '2W' ? '2 Wheeler' : '4 Wheeler'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted" htmlFor="vehicle-model">
                  Vehicle model
                </label>
                <div className="relative">
                  <Car className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input
                    id="vehicle-model"
                    type="text"
                    required
                    value={vehicleModel}
                    onChange={(event) => setVehicleModel(event.target.value)}
                    placeholder="e.g. Tata Nexon EV"
                    className="w-full rounded-xl border border-border bg-surface px-10 py-3 text-sm text-ink shadow-soft"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted" htmlFor="parking-type">
                  Parking type
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <select
                    id="parking-type"
                    required
                    value={parkingType}
                    onChange={(event) => setParkingType(event.target.value as HostProfileInput['parkingType'])}
                    className="w-full rounded-xl border border-border bg-surface px-10 py-3 text-sm text-ink shadow-soft"
                  >
                    <option value="covered">Covered parking</option>
                    <option value="open">Open parking</option>
                    <option value="shared">Shared driveway</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted" htmlFor="parking-address">
                  Parking address (optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input
                    id="parking-address"
                    type="text"
                    value={parkingAddress}
                    onChange={(event) => setParkingAddress(event.target.value)}
                    placeholder="Society, landmark, or city"
                    className="w-full rounded-xl border border-border bg-surface px-10 py-3 text-sm text-ink shadow-soft"
                  />
                </div>
              </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-muted">Pin parking location</p>
                    <button
                      type="button"
                      onClick={() => {
                      if (!navigator.geolocation) {
                        setErrorMessage('Geolocation is not supported in this browser.');
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          handleLocationSelect({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                          });
                        },
                        () => setErrorMessage('Unable to fetch current location.')
                      );
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] font-semibold text-muted transition hover:text-ink"
                  >
                    <Navigation size={12} /> Use current location
                  </button>
                </div>
                <MapPicker value={parkingCoords} onChange={handleLocationSelect} />
                <p className="text-xs text-muted">
                  {addressLookup ?? 'Click the map to select the exact location.'}
                </p>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2 text-sm font-semibold text-muted transition hover:bg-surface"
            >
              Not now
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-ink py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-slate-900"
            >
              {isSubmitting ? <Loader2 size={16} className="mx-auto animate-spin" /> : 'Save profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileGateModal;
