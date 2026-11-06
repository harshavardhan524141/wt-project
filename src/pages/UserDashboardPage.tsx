import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { QueueToken, ServiceCenter, Service } from '../types/index.ts';
import { DigitalTicket } from '../components/DigitalTicket.tsx';
import { JoinQueueModal } from '../components/JoinQueueModal.tsx';
import { playChime } from '../lib/sound.ts';
import {
  Ticket,
  Clock,
  Building2,
  Calendar,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Bell
} from 'lucide-react';

interface UserDashboardProps {
  navigate: (path: string) => void;
}

export const UserDashboardPage: React.FC<UserDashboardProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [activeTokens, setActiveTokens] = useState<QueueToken[]>([]);
  const [recentHistory, setRecentHistory] = useState<QueueToken[]>([]);
  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [nowServingAlert, setNowServingAlert] = useState<string | null>(null);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [activeRes, historyRes, centersRes] = await Promise.all([
        api.get<{ tokens: QueueToken[] }>('/queue/my-active'),
        api.get<{ history: QueueToken[] }>('/queue/my-history'),
        api.get<{ centers: ServiceCenter[] }>('/centers'),
      ]);

      const prevActive = activeTokens;
      const newActive = activeRes.tokens || [];

      // Check if any token just transitioned to now_serving
      newActive.forEach((token) => {
        if (token.status === 'now_serving') {
          const wasNotServing = prevActive.find((p) => p.id === token.id && p.status !== 'now_serving');
          if (wasNotServing) {
            playChime();
            setNowServingAlert(`Your token ${token.token_number} is NOW SERVING at ${token.counter_desk || 'the desk'}!`);
          }
        }
      });

      setActiveTokens(newActive);
      setRecentHistory(historyRes.history?.slice(0, 5) || []);
      setCenters(centersRes.centers || []);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-poll active tokens every 5 seconds for live queue updates
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleCancelToken = async (tokenId: number) => {
    if (!confirm('Are you sure you want to cancel this waiting token?')) return;
    try {
      await api.post(`/queue/cancel/${tokenId}`);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel token.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Welcome Header */}
      <div className="bg-white border-b border-slate-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
              <span>Customer Portal</span>
              <span>·</span>
              <span className="text-slate-400">Live Queue Monitor</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {user?.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {user?.email} {user?.phone ? `· ${user.phone}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchDashboardData()}
              disabled={refreshing}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>

            <button
              onClick={() => navigate('/services')}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Join a Service</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Banner Alert if called to counter */}
        {nowServingAlert && (
          <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-emerald-200 animate-pulse" />
              <div className="font-bold text-sm">{nowServingAlert}</div>
            </div>
            <button
              onClick={() => setNowServingAlert(null)}
              className="text-xs font-semibold bg-emerald-700 px-3 py-1 rounded-lg hover:bg-emerald-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active Tickets Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Your Active Queue Tickets</h2>
              <span className="text-xs bg-blue-100 text-blue-800 font-mono font-bold px-2 py-0.5 rounded-full">
                {activeTokens.length}
              </span>
            </div>
            <span className="text-xs text-slate-400">Updates live every 5s</span>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center animate-pulse">
              <p className="text-slate-400 text-sm">Loading active queue tokens...</p>
            </div>
          ) : activeTokens.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeTokens.map((token) => (
                <DigitalTicket
                  key={token.id}
                  token={token}
                  onCancel={handleCancelToken}
                  onViewDetails={(id) => navigate(`/queue/${id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-2xs">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Ticket className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No active queue tokens</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You are not currently waiting in any line. Choose a service center below to join a queue digitally.
              </p>
              <button
                onClick={() => navigate('/services')}
                className="mt-4 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
              >
                Browse Available Queues
              </button>
            </div>
          )}
        </div>

        {/* Quick Service Centers Browser */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Available Service Centers</h2>
              <p className="text-xs text-slate-500">Pick a location to request a ticket</p>
            </div>
            <button
              onClick={() => navigate('/services')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              See all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {centers.map((center) => (
              <div
                key={center.id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-blue-700">{center.category}</span>
                    <span className="font-mono text-slate-400">{center.code}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{center.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-3">{center.address}</p>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    {center.services?.slice(0, 2).map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg">
                        <span className="font-medium text-slate-700 truncate max-w-[170px]">{s.name}</span>
                        <button
                          onClick={() => setSelectedService(s)}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] px-2 py-0.5 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    <strong className="text-slate-800 font-mono">{center.total_waiting}</strong> waiting
                  </span>
                  <button
                    onClick={() => navigate('/services')}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    All Services →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Queue Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Queue Activity</h2>
            <button
              onClick={() => navigate('/history')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Full History
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            {recentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Token</th>
                      <th className="py-3 px-4">Service</th>
                      <th className="py-3 px-4">Center</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-900">
                          {item.token_number}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">{item.service_name}</td>
                        <td className="py-3 px-4 text-slate-500">{item.center_name}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {new Date(item.joined_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                          {new Date(item.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              item.status === 'served'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.status === 'waiting'
                                ? 'bg-blue-50 text-blue-700'
                                : item.status === 'now_serving'
                                ? 'bg-emerald-100 text-emerald-900'
                                : item.status === 'cancelled'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => navigate(`/queue/${item.id}`)}
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                No previous queue activity recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Join Queue Modal */}
      {selectedService && (
        <JoinQueueModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onSuccess={(tokenId) => {
            setSelectedService(null);
            fetchDashboardData();
            navigate(`/queue/${tokenId}`);
          }}
          onRequireLogin={() => {
            setSelectedService(null);
            navigate('/login');
          }}
        />
      )}
    </div>
  );
};
