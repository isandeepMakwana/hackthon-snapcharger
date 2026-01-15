import { useState } from 'react';
import { ArrowRight, Car, Home, Loader2, Lock, Mail, User, Zap } from 'lucide-react';

interface RegisterPageProps {
  onRegister: (role: 'driver' | 'host') => void;
  onNavigateToLogin: () => void;
  notice?: string;
}

const RegisterPage = ({ onRegister, onNavigateToLogin, notice }: RegisterPageProps) => {
  const [role, setRole] = useState<'driver' | 'host'>('driver');
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [parkingType, setParkingType] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      onRegister(role);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface-strong shadow-card">
        <div className="p-8">
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className="rounded-xl bg-accent p-2 text-white shadow-glow">
              <Zap size={20} fill="currentColor" />
            </div>
            <h2 className="text-xl font-semibold text-ink">Create account</h2>
          </div>

          {notice && (
            <div className="mb-6 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-ink">
              {notice}
            </div>
          )}

          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('driver')}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm font-semibold transition ${
                role === 'driver'
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-border text-muted hover:border-accent/40'
              }`}
            >
              <Car size={22} className={role === 'driver' ? 'text-accent' : 'text-muted'} />
              I'm a Driver
            </button>
            <button
              type="button"
              onClick={() => setRole('host')}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm font-semibold transition ${
                role === 'host'
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-border text-muted hover:border-accent/40'
              }`}
            >
              <Home size={22} className={role === 'host' ? 'text-accent' : 'text-muted'} />
              I'm a Host
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted" htmlFor="register-name">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  id="register-name"
                  type="text"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-border bg-surface px-10 py-3 text-sm text-ink shadow-soft"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted" htmlFor="register-email">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  id="register-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="john@example.com"
                  className="w-full rounded-xl border border-border bg-surface px-10 py-3 text-sm text-ink shadow-soft"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted" htmlFor="register-password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  id="register-password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-surface px-10 py-3 text-sm text-ink shadow-soft"
                />
              </div>
            </div>

            {role === 'driver' ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted" htmlFor="vehicle-model">
                  Vehicle model
                </label>
                <input
                  id="vehicle-model"
                  type="text"
                  required
                  value={vehicleModel}
                  onChange={(event) => setVehicleModel(event.target.value)}
                  placeholder="e.g. Tata Nexon EV"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink shadow-soft"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted" htmlFor="parking-type">
                  Parking type
                </label>
                <select
                  id="parking-type"
                  required
                  value={parkingType}
                  onChange={(event) => setParkingType(event.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink shadow-soft"
                >
                  <option value="">Select a type</option>
                  <option value="covered">Covered parking</option>
                  <option value="open">Open parking</option>
                  <option value="shared">Shared driveway</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-accent-strong"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>
                Create account <ArrowRight size={18} />
              </>}
            </button>
          </form>
        </div>

        <div className="border-t border-border bg-surface px-6 py-4 text-center text-sm text-muted">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="font-semibold text-accent hover:text-accent-strong"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
