import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ApiError } from '../lib/api.ts';
import { User, Lock, AlertCircle, ArrowRight, Ticket } from 'lucide-react';

interface LoginPageProps {
  navigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigate }) => {
  const { login } = useAuth();
  const [nameOrEmail, setNameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(nameOrEmail, password);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        // Direct to genre and location selection!
        navigate('/services');
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your name and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold">
            <Ticket className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-mono uppercase font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
            CUSTOMER PORTAL
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
            Customer Login
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign in with your name and password to choose a service & get a token.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Your Name (or Email)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={nameOrEmail}
                onChange={(e) => setNameOrEmail(e.target.value)}
                placeholder="e.g. Harsha Patnaik"
                className="w-full text-xs pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Sign In & Select Service'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2 text-center text-xs text-slate-500">
          <div>
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-blue-600 font-bold hover:underline"
            >
              Register here (Name, Email & Password)
            </button>
          </div>
          <button
            onClick={() => navigate('/admin/login')}
            className="text-slate-600 hover:text-slate-900 font-semibold text-[11px] mt-1"
          >
            Staff / Operator? Go to Admin Portal →
          </button>
        </div>
      </div>
    </div>
  );
};
