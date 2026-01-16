import { useState } from 'react';
import { ArrowRight, Loader2, Lock, Mail, Zap } from 'lucide-react';

interface LoginPageProps {
  onLogin: (payload: { role: 'driver' | 'host'; email: string; password: string }) => Promise<void>;
  onForgotPassword?: (email: string) => Promise<void>;
  onNavigateToRegister: () => void;
  notice?: string;
  defaultRole?: 'driver' | 'host';
}

const LoginPage = ({ onLogin, onForgotPassword, onNavigateToRegister, notice }: LoginPageProps) => {
  const [role, setRole] = useState<'driver' | 'host'>('driver');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await onLogin({ role, email, password });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!onForgotPassword) {
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!email.trim()) {
      setErrorMessage('Enter your email to request a password reset.');
      return;
    }
    setIsLoading(true);
    try {
      await onForgotPassword(email.trim());
      setSuccessMessage('Password reset instructions sent. Check your inbox.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to request a reset.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface-strong shadow-card">
        <div className="p-8">
          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl bg-accent p-3 text-white shadow-glow">
              <Zap size={28} fill="currentColor" />
            </div>
          </div>

          <h2 className="text-center text-2xl font-semibold text-ink">Welcome back</h2>
          <p className="mt-2 text-center text-sm text-muted">Sign in to continue to SnapCharge</p>

          {notice && (
            <div className="mt-6 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-ink">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('driver')}
                disabled={isLoading}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3 text-sm font-semibold transition ${
                  role === 'driver'
                    ? 'border-accent bg-accent-soft text-ink'
                    : 'border-border text-muted hover:border-accent/40'
                }`}
              >
                <Car size={20} className={role === 'driver' ? 'text-accent' : 'text-muted'} />
                Driver
              </button>
              <button
                type="button"
                onClick={() => setRole('host')}
                disabled={isLoading}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3 text-sm font-semibold transition ${
                  role === 'host'
                    ? 'border-accent bg-accent-soft text-ink'
                    : 'border-border text-muted hover:border-accent/40'
                }`}
              >
                <Home size={20} className={role === 'host' ? 'text-accent' : 'text-muted'} />
                Host
              </button>
            </div>
            {errorMessage && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted" htmlFor="login-email">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="john@example.com"
                  className="w-full rounded-xl border border-border bg-surface px-10 py-3 text-sm text-ink shadow-soft focus:border-accent"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted" htmlFor="login-password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-surface px-10 py-3 text-sm text-ink shadow-soft focus:border-accent"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isLoading || !onForgotPassword}
                className="text-xs font-semibold text-accent hover:text-accent-strong"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-accent-strong"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>
                Sign In <ArrowRight size={18} />
              </>}
            </button>
          </form>
        </div>

        <div className="border-t border-border bg-surface px-6 py-4 text-center text-sm text-muted">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="font-semibold text-accent hover:text-accent-strong"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
