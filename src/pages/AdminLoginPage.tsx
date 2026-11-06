import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ApiError } from '../lib/api.ts';
import { Shield, Mail, Lock, AlertCircle, ArrowRight, KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface AdminLoginPageProps {
  navigate: (path: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ navigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role !== 'admin') {
        setError('This account does not have authorized operator/admin clearance.');
        return;
      }
      navigate('/admin');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please check your email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-7 sm:p-9 text-white">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/40 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <Shield className="w-7 h-7 text-blue-400" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
            ENCRYPTED OPERATOR CONSOLE
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-2">Admin Portal Login</h2>
          <p className="text-xs text-slate-400 mt-1">
            Accept queues, call next tokens to counters, and manage locations.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-800 rounded-xl flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Staff Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter staff email"
                className="w-full text-xs pl-10 pr-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Security Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-10 pr-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 px-4 text-xs font-bold text-slate-950 bg-white hover:bg-slate-100 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? 'Verifying Credentials...' : 'Sign In to Admin Portal'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs text-slate-400">
          Customer or Student looking to get a token?{' '}
          <button
            onClick={() => navigate('/services')}
            className="text-blue-400 font-semibold hover:underline block mx-auto mt-1"
          >
            Switch to Customer Portal →
          </button>
        </div>
      </div>
    </div>
  );
};
