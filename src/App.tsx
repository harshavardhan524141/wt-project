import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { AdminLoginPage } from './pages/AdminLoginPage.tsx';
import { UserDashboardPage } from './pages/UserDashboardPage.tsx';
import { ServicesPage } from './pages/ServicesPage.tsx';
import { QueueStatusPage } from './pages/QueueStatusPage.tsx';
import { QueueHistoryPage } from './pages/QueueHistoryPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { ManageCentersPage } from './pages/ManageCentersPage.tsx';

function MainRouter() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const { isAuthenticated, isAdmin, loading } = useAuth();

  // Listen to popstate for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Loading QueueLess...</span>
        </div>
      </div>
    );
  }

  // Routing logic
  const renderPage = () => {
    // Exact routes
    if (currentPath === '/' || currentPath === '') {
      return <HomePage navigate={navigate} />;
    }
    if (currentPath === '/register') {
      return <RegisterPage navigate={navigate} />;
    }
    if (currentPath === '/login') {
      return <LoginPage navigate={navigate} />;
    }
    if (currentPath === '/admin/login') {
      return <AdminLoginPage navigate={navigate} />;
    }
    if (currentPath === '/services') {
      return <ServicesPage navigate={navigate} />;
    }
    if (currentPath === '/dashboard') {
      if (!isAuthenticated) {
        return <LoginPage navigate={navigate} />;
      }
      return <UserDashboardPage navigate={navigate} />;
    }
    if (currentPath === '/history') {
      if (!isAuthenticated) {
        return <LoginPage navigate={navigate} />;
      }
      return <QueueHistoryPage navigate={navigate} />;
    }
    if (currentPath === '/admin') {
      if (!isAuthenticated || !isAdmin) {
        return <AdminLoginPage navigate={navigate} />;
      }
      return <AdminDashboardPage navigate={navigate} />;
    }
    if (currentPath === '/admin/centers') {
      if (!isAuthenticated || !isAdmin) {
        return <AdminLoginPage navigate={navigate} />;
      }
      return <ManageCentersPage navigate={navigate} />;
    }

    // Dynamic Route: /queue/:tokenId
    if (currentPath.startsWith('/queue/')) {
      const parts = currentPath.split('/');
      const tokenId = Number(parts[2]);
      if (tokenId && !isNaN(tokenId)) {
        return <QueueStatusPage tokenId={tokenId} navigate={navigate} />;
      }
    }

    // Fallback: 404 or redirect to Home
    return <HomePage navigate={navigate} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar currentPath={currentPath} navigate={navigate} />
      <main className="flex-1">
        {renderPage()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
