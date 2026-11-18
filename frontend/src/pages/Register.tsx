import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, Mail, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    setSubmitting(true);
    try {
      await register({ email, username, password, full_name: fullName });
      navigate('/sandbox');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Email or username might already exist.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-graphite-bg flex flex-col justify-center items-center px-4 relative">
      <div className="w-full max-w-sm bg-graphite-card border border-white/[0.08] rounded-xl p-6 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-9 h-9 rounded-md bg-graphite-raised border border-white/[0.08] flex items-center justify-center text-graphite-text mb-3">
            <img src="/auron-logo.png" alt="AURON" className="h-8 w-8 object-contain" />
          </div>
          <h1 className="text-base font-medium text-graphite-text tracking-tight">Create your AURON account</h1>
          <p className="text-xs text-graphite-muted mt-0.5">Software engineering workspace</p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-center gap-2 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-graphite-muted mb-1">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Sourish Narendrula"
              className="w-full px-3 py-1.5 bg-graphite-deep border border-white/[0.08] rounded-md text-xs text-graphite-text placeholder:text-graphite-muted focus:outline-none focus:border-white/20 transition"
            />
          </div>

          <div>
            <label className="block text-xs text-graphite-muted mb-1">Email address</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-graphite-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sourish@example.com"
                className="w-full pl-8 pr-3 py-1.5 bg-graphite-deep border border-white/[0.08] rounded-md text-xs text-graphite-text placeholder:text-graphite-muted focus:outline-none focus:border-white/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-graphite-muted mb-1">Username</label>
            <div className="relative">
              <UserIcon className="w-3.5 h-3.5 text-graphite-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="sourish_dev"
                className="w-full pl-8 pr-3 py-1.5 bg-graphite-deep border border-white/[0.08] rounded-md text-xs text-graphite-text placeholder:text-graphite-muted focus:outline-none focus:border-white/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-graphite-muted mb-1">Password</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-graphite-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-8 pr-3 py-1.5 bg-graphite-deep border border-white/[0.08] rounded-md text-xs text-graphite-text placeholder:text-graphite-muted focus:outline-none focus:border-white/20 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-4 bg-graphite-text hover:bg-white disabled:opacity-50 text-graphite-deep rounded-md text-xs font-medium transition flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? <LoadingSpinner size="sm" /> : 'Create account'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-white/[0.08] text-center">
          <p className="text-xs text-graphite-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-graphite-text hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
