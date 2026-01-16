import { useState } from 'react';
import { ArrowRight, Loader2, Lock, Mail, Phone, User, Zap } from 'lucide-react';

interface RegisterPageProps {
  onRegister: (payload: {
    username: string;
    email: string;
    phoneNumber: string;
    password: string;
  }) => Promise<void>;
  onNavigateToLogin: () => void;
  notice?: string;
}

const RegisterPage = ({ onRegister, onNavigateToLogin, notice }: RegisterPageProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await onRegister({
        username,
        email,
        phoneNumber,
        password,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to register. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted" htmlFor="register-username">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  id="register-username"
                  type="text"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="driverone"
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
              <label className="text-xs font-semibold uppercase text-muted" htmlFor="register-phone">
                Phone number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  id="register-phone"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="+91 98765 43210"
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
