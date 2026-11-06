import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Ticket, Shield, ArrowRight, Lock, User } from 'lucide-react';

interface HomePageProps {
  navigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const { isAuthenticated, isAdmin } = useAuth();

  const handleCustomerEnter = () => {
    if (isAuthenticated && !isAdmin) {
      navigate('/services');
    } else {
      navigate('/login');
    }
  };

  const handleAdminEnter = () => {
    if (isAuthenticated && isAdmin) {
      navigate('/admin');
    } else {
      navigate('/admin/login');
    }
  };

  return (
    <div className="min-h-[88vh] bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-4xl w-full mx-auto text-center space-y-8">
        {/* Simple Title */}
        <div>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-mono text-xl font-bold shadow-sm mb-4">
            Q
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight uppercase">
            QUEUELESS SMART MANAGEMENT SYSTEM
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-2 max-w-md mx-auto">
            Select a portal below to proceed
          </p>
        </div>

        {/* The Two Main Portals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto pt-4 text-left">
          {/* Customer Portal Card */}
          <div className="bg-white border-2 border-blue-600 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-5 shadow-2xs">
                <Ticket className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Customer Portal</h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                For students, clients, and patients. Log in with your name and password, choose your service genre, location, and purpose, and receive your digital queue token.
              </p>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col gap-2.5">
              <button
                onClick={handleCustomerEnter}
                className="w-full py-3.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Enter Customer Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="text-center text-[11px] text-slate-400">
                New user?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Register with Name, Email & Password
                </button>
              </div>
            </div>
          </div>

          {/* Admin Portal Card */}
          <div className="bg-slate-900 text-white border-2 border-slate-900 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-slate-800 text-blue-400 flex items-center justify-center font-bold mb-5 shadow-2xs">
                <Shield className="w-7 h-7" />
              </div>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">Admin Portal</h2>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Staff Only
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                For authorized counter operators and staff. Call waiting tokens to your desk, mark customers as served or skipped, and manage service lines.
              </p>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-800">
              <button
                onClick={handleAdminEnter}
                className="w-full py-3.5 px-4 text-xs font-bold text-slate-950 bg-white hover:bg-slate-100 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-slate-900" />
                <span>Enter Admin Portal</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
