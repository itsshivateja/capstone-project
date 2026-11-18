import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface LoginProps {
  embedded?: boolean;
  onClose?: () => void;
}

export const Login: React.FC<LoginProps> = ({ embedded = false, onClose }) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isLight = false;
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ username_or_email: usernameOrEmail, password });
      navigate('/sandbox');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid username or password');
    } finally {
      setSubmitting(false);
    }
  };

  const form = (
    <div className={`w-full max-w-sm rounded-[1.75rem] border p-7 shadow-2xl backdrop-blur-2xl ${isLight ? 'border-white/80 bg-white/75 shadow-blue-900/10' : 'border-white/15 bg-[#111522]/75 shadow-black/50'}`}>
        <div className="flex flex-col items-center mb-6">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border mb-4 ${isLight ? 'border-blue-200 bg-white/80' : 'border-cyan-300/25 bg-cyan-500/10'}`}>
            <img src="/auron-logo.png" alt="AURON" className="h-8 w-8 object-contain" />
          </div>
          <h1 className={`text-xl font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Sign in to AURON</h1>
          <p className={`mt-1 text-sm ${isLight ? 'text-slate-500' : 'text-white/55'}`}>Your intelligent engineering workspace</p>
        </div>

        {error && (
          <div className={`mb-4 flex items-center gap-2 rounded-xl border p-3 text-sm ${isLight ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-rose-400/20 bg-rose-500/10 text-rose-300'}`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className={`mb-1.5 block text-sm font-medium ${isLight ? 'text-slate-700' : 'text-white/75'}`}>Username or email</label>
            <div className="relative">
              <UserIcon className={`absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-white/40'}`} />
              <input
                type="text"
                required
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="developer or dev@company.com"
                className={`w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none transition ${isLight ? 'border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus:border-blue-400' : 'border-white/10 bg-white/[0.06] text-white placeholder:text-white/35 focus:border-blue-300/60'}`}
              />
            </div>
          </div>

          <div>
            <label className={`mb-1.5 block text-sm font-medium ${isLight ? 'text-slate-700' : 'text-white/75'}`}>Password</label>
            <div className="relative">
              <Lock className={`absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-white/40'}`} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none transition ${isLight ? 'border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus:border-blue-400' : 'border-white/10 bg-white/[0.06] text-white placeholder:text-white/35 focus:border-blue-300/60'}`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${isLight ? 'bg-slate-900 text-white hover:bg-blue-700' : 'bg-white text-slate-950 hover:bg-blue-50'}`}
          >
            {submitting ? <LoadingSpinner size="sm" /> : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={() => {
              setUsernameOrEmail('demo');
              setPassword('devmind123');
            }}
            className={`flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-mono transition ${isLight ? 'border-slate-200 bg-white/60 text-slate-500 hover:bg-white' : 'border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.09] hover:text-white/80'}`}
          >
            <span>Auto-fill demo account</span>
          </button>
        </form>

        <div className={`mt-5 border-t pt-5 text-center ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
          <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
            Don't have an account?{' '}
            <Link to="/register" className={`font-semibold hover:underline ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Create account
            </Link>
          </p>
        </div>
      </div>
  );

  if (embedded) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-xl ${isLight ? 'bg-slate-900/25' : 'bg-[#02030a]/70'}`}>
        <button
          type="button"
          aria-label="Close sign in"
          onClick={onClose}
          className="absolute inset-0 cursor-default"
        />
        <div className="relative z-10 w-full max-w-sm">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`absolute right-3 top-3 z-20 text-xl leading-none ${isLight ? 'text-slate-400 hover:text-slate-800' : 'text-white/40 hover:text-white'}`}
              aria-label="Close sign in"
            >
              ×
            </button>
          )}
          {form}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-graphite-bg flex flex-col justify-center items-center px-4 relative">
      {form}
    </div>
  );
};
