import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Shield, User, LogOut, Lock, Ticket, Menu, X, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, navigate }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminView = currentPath.startsWith('/admin');

  const handleNav = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Zone 1: Brand title */}
          <button
            onClick={() => handleNav('/')}
            className="flex items-center gap-2.5 text-left text-sm sm:text-base font-black tracking-tight text-slate-900 whitespace-nowrap shrink-0 group focus:outline-none"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white font-mono text-xs font-bold shadow-xs group-hover:bg-blue-700 transition-colors">
              Q
            </span>
            <span className="tracking-tight font-extrabold text-slate-900 uppercase">
              QUEUELESS SMART MANAGEMENT SYSTEM
            </span>
          </button>

          {/* Center: Two Clear Portals Selector */}
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => handleNav(isAuthenticated ? '/dashboard' : '/services')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                !isAdminView
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Customer Portal</span>
              <span className="text-[10px] font-normal opacity-85">(Get Token)</span>
            </button>

            <button
              onClick={() => handleNav('/admin')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isAdminView
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Admin Portal</span>
              <span className="text-[10px] font-normal opacity-85">(Call & Serve)</span>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold text-slate-600">
            <button
              onClick={() => handleNav('/services')}
              className={`whitespace-nowrap hover:text-blue-600 py-1 ${
                currentPath === '/services' ? 'text-blue-600 font-bold border-b-2 border-blue-600' : ''
              }`}
            >
              Select Location & Use
            </button>
            {isAuthenticated && !isAdminView && (
              <>
                <button
                  onClick={() => handleNav('/dashboard')}
                  className={`whitespace-nowrap hover:text-blue-600 py-1 ${
                    currentPath === '/dashboard' ? 'text-blue-600 font-bold border-b-2 border-blue-600' : ''
                  }`}
                >
                  My Active Tokens
                </button>
                <button
                  onClick={() => handleNav('/history')}
                  className={`whitespace-nowrap hover:text-blue-600 py-1 ${
                    currentPath === '/history' ? 'text-blue-600 font-bold border-b-2 border-blue-600' : ''
                  }`}
                >
                  Token History
                </button>
              </>
            )}
            {isAdminView && (
              <>
                <button
                  onClick={() => handleNav('/admin')}
                  className={`whitespace-nowrap hover:text-blue-900 py-1 ${
                    currentPath === '/admin' ? 'text-blue-900 font-bold border-b-2 border-blue-900' : ''
                  }`}
                >
                  Calling Console
                </button>
                <button
                  onClick={() => handleNav('/admin/centers')}
                  className={`whitespace-nowrap hover:text-blue-900 py-1 ${
                    currentPath === '/admin/centers' ? 'text-blue-900 font-bold border-b-2 border-blue-900' : ''
                  }`}
                >
                  Manage Locations & Counters
                </button>
              </>
            )}
          </nav>

          {/* Zone 3: Profile / Auth Actions */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <div className="text-right hidden xl:block">
                  <div className="text-xs font-bold text-slate-800">{user?.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {user?.role === 'admin' ? 'Authorized Operator' : user?.email}
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    handleNav('/');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span>Exit</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNav('/login')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors"
                >
                  Customer Login
                </button>
                <button
                  onClick={() => handleNav('/admin/login')}
                  className="px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Lock className="w-3 h-3 text-slate-700" />
                  <span>Admin Login</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => handleNav('/services')}
              className={`py-2 text-xs font-bold rounded-lg text-center ${
                !isAdminView ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Customer Portal
            </button>
            <button
              onClick={() => handleNav('/admin')}
              className={`py-2 text-xs font-bold rounded-lg text-center ${
                isAdminView ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Admin Portal
            </button>
          </div>

          <button
            onClick={() => handleNav('/services')}
            className="block w-full text-left py-2 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-md"
          >
            Select Location & Service Use
          </button>
          {isAuthenticated && (
            <>
              <button
                onClick={() => handleNav('/dashboard')}
                className="block w-full text-left py-2 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-md"
              >
                My Active Tickets
              </button>
              <button
                onClick={() => handleNav('/history')}
                className="block w-full text-left py-2 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-md"
              >
                Queue History
              </button>
              <button
                onClick={() => {
                  logout();
                  handleNav('/');
                }}
                className="block w-full text-left py-2 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-md"
              >
                Sign Out
              </button>
            </>
          )}
          {!isAuthenticated && (
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => handleNav('/login')}
                className="w-full text-center py-2 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg"
              >
                Customer Sign In / Register
              </button>
              <button
                onClick={() => handleNav('/admin/login')}
                className="w-full text-center py-2 text-xs font-bold bg-slate-900 text-white rounded-lg flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-blue-300" />
                Admin Portal Login
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
