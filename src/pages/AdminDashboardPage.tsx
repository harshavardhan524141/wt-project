import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { AdminStats, ServiceStat, QueueToken, Service, ServiceCenter } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { playChime } from '../lib/sound.ts';
import {
  Shield,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  Volume2,
  ArrowRight,
  Settings,
  RefreshCw,
  Building2,
  Lock,
  UserCheck,
  Mail,
  GraduationCap,
  Landmark
} from 'lucide-react';

interface AdminDashboardPageProps {
  navigate: (path: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    waiting_count: 0,
    serving_count: 0,
    served_count: 0,
    skipped_count: 0,
    cancelled_count: 0,
    total_tokens: 0,
  });
  const [services, setServices] = useState<Service[]>([]);
  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  // Live service queue data
  const [waitingTokens, setWaitingTokens] = useState<QueueToken[]>([]);
  const [servingTokens, setServingTokens] = useState<QueueToken[]>([]);
  const [completedTokens, setCompletedTokens] = useState<QueueToken[]>([]);

  const [counterDesk, setCounterDesk] = useState('Counter 1 (Accounts)');
  const [loading, setLoading] = useState(true);
  const [callingNext, setCallingNext] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchOverview = async (silent = false) => {
    try {
      const [overviewRes, servicesRes, centersRes] = await Promise.all([
        api.get<{ stats: AdminStats }>('/queue/admin/overview'),
        api.get<{ services: Service[] }>('/services?includeInactive=true'),
        api.get<{ centers: ServiceCenter[] }>('/centers?includeInactive=true'),
      ]);

      setStats(overviewRes.stats);
      setServices(servicesRes.services);
      setCenters(centersRes.centers);

      if (!selectedServiceId && servicesRes.services.length > 0) {
        setSelectedServiceId(servicesRes.services[0].id);
      }
    } catch (e) {
      console.error('Error fetching admin overview:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchServiceQueue = async (serviceId: number) => {
    try {
      const res = await api.get<{
        waiting: QueueToken[];
        serving: QueueToken[];
        completed: QueueToken[];
      }>(`/queue/admin/service/${serviceId}`);

      setWaitingTokens(res.waiting || []);
      setServingTokens(res.serving || []);
      setCompletedTokens(res.completed || []);
    } catch (e) {
      console.error('Error loading service queue:', e);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (selectedServiceId) {
      fetchServiceQueue(selectedServiceId);
      const interval = setInterval(() => {
        fetchServiceQueue(selectedServiceId);
        fetchOverview(true);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedServiceId]);

  const handleCallNext = async () => {
    if (!selectedServiceId) return;
    setCallingNext(true);
    setFeedbackMessage(null);

    try {
      const res = await api.post<{ token: QueueToken }>('/queue/admin/call-next', {
        service_id: selectedServiceId,
        counter_desk: counterDesk,
      });

      playChime();
      setFeedbackMessage(`Token ${res.token.token_number} called to ${counterDesk}`);
      fetchServiceQueue(selectedServiceId);
      fetchOverview(true);
    } catch (err: any) {
      alert(err.message || 'No waiting customers in this queue.');
    } finally {
      setCallingNext(false);
    }
  };

  const handleMarkServed = async (tokenId: number) => {
    setActionLoading(tokenId);
    try {
      await api.post(`/queue/admin/serve/${tokenId}`, {
        notes: `Served at ${counterDesk}`,
      });
      setFeedbackMessage(`Token marked as served.`);
      if (selectedServiceId) fetchServiceQueue(selectedServiceId);
      fetchOverview(true);
    } catch (err: any) {
      alert(err.message || 'Failed to update token.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSkip = async (tokenId: number) => {
    const reason = prompt('Reason for skipping token (e.g. No-show, customer not present):');
    if (reason === null) return;

    setActionLoading(tokenId);
    try {
      await api.post(`/queue/admin/skip/${tokenId}`, { reason });
      setFeedbackMessage(`Token marked as skipped.`);
      if (selectedServiceId) fetchServiceQueue(selectedServiceId);
      fetchOverview(true);
    } catch (err: any) {
      alert(err.message || 'Failed to skip token.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecall = async (tokenId: number) => {
    setActionLoading(tokenId);
    try {
      await api.post(`/queue/admin/recall/${tokenId}`, { counter_desk: counterDesk });
      playChime();
      setFeedbackMessage(`Re-announced token to ${counterDesk}`);
      if (selectedServiceId) fetchServiceQueue(selectedServiceId);
    } catch (err: any) {
      alert(err.message || 'Failed to recall token.');
    } finally {
      setActionLoading(null);
    }
  };

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const activeNowServingToken = servingTokens.length > 0 ? servingTokens[0] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Top Admin Security Header */}
      <div className="bg-slate-900 border-b border-slate-800 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                  SECURE ADMIN PORTAL
                </span>
                <span className="text-xs text-slate-400">Authorized Staff Operator</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                Staff Queue Dispatcher & Calling Console
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/services')}
              className="px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
            >
              Switch to Customer View
            </button>
            <button
              onClick={() => navigate('/admin/centers')}
              className="px-3.5 py-2 text-xs font-bold text-blue-300 bg-blue-950/80 hover:bg-blue-900 rounded-xl border border-blue-800 transition-colors flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configure Centers</span>
            </button>
            <button
              onClick={() => {
                if (selectedServiceId) fetchServiceQueue(selectedServiceId);
                fetchOverview(true);
              }}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl border border-slate-700"
              title="Refresh Queue"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* KPI Metric Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Waiting in Line</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-mono font-extrabold text-blue-400 tabular-nums">
              {stats.waiting_count}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Active across all colleges & banks</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Now Serving</span>
              <Volume2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-mono font-extrabold text-emerald-400 tabular-nums">
              {stats.serving_count}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Active at counter desks</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Served Today</span>
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-mono font-extrabold text-white tabular-nums">
              {stats.served_count}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Completed tokens</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Skipped</span>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-mono font-extrabold text-amber-400 tabular-nums">
              {stats.skipped_count}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Unattended / No-shows</span>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="p-3 bg-blue-950 border border-blue-800 text-blue-200 rounded-xl text-xs font-semibold flex items-center justify-between">
            <span>{feedbackMessage}</span>
            <button onClick={() => setFeedbackMessage(null)} className="text-blue-400 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Live Operator Console */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase text-blue-400 font-bold">Active Queue Desk</span>
              <h2 className="text-lg font-bold text-white mt-0.5">
                {selectedService ? `${selectedService.center_name} — ${selectedService.name}` : 'Select Service'}
              </h2>
            </div>

            {/* Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Select Service Counter</label>
                <select
                  value={selectedServiceId || ''}
                  onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.prefix}] {s.center_name} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Your Counter / Desk</label>
                <input
                  type="text"
                  value={counterDesk}
                  onChange={(e) => setCounterDesk(e.target.value)}
                  placeholder="e.g. Counter 1"
                  className="w-36 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Currently Serving Display */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
                    <span>NOW AT {counterDesk.toUpperCase()}</span>
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  </div>

                  {activeNowServingToken ? (
                    <div>
                      <div className="text-5xl sm:text-6xl font-mono font-black text-white tracking-tight tabular-nums">
                        {activeNowServingToken.token_number}
                      </div>
                      <div className="text-base font-bold text-blue-300 mt-2">
                        {activeNowServingToken.user_name}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                        <span>{activeNowServingToken.user_phone || activeNowServingToken.user_email}</span>
                        {activeNowServingToken.notes && (
                          <span className="text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            Purpose: "{activeNowServingToken.notes}"
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <span className="text-3xl font-mono font-bold text-slate-600">NO ACTIVE TOKEN</span>
                      <p className="text-xs text-slate-400 mt-1">
                        Desk is available. Click "Call Next Customer" to pull from waiting queue.
                      </p>
                    </div>
                  )}
                </div>

                {/* Operator Actions */}
                <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center gap-3">
                  {activeNowServingToken ? (
                    <>
                      <button
                        onClick={() => handleMarkServed(activeNowServingToken.id)}
                        disabled={actionLoading === activeNowServingToken.id}
                        className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark as Served
                      </button>

                      <button
                        onClick={() => handleRecall(activeNowServingToken.id)}
                        disabled={actionLoading === activeNowServingToken.id}
                        className="py-2.5 px-4 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <Volume2 className="w-4 h-4 text-blue-400" />
                        Recall
                      </button>

                      <button
                        onClick={() => handleSkip(activeNowServingToken.id)}
                        disabled={actionLoading === activeNowServingToken.id}
                        className="py-2.5 px-4 text-xs font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900 border border-amber-800 rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <AlertCircle className="w-4 h-4" />
                        Skip (No Show)
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleCallNext}
                      disabled={callingNext || waitingTokens.length === 0}
                      className="w-full py-3 px-6 text-sm font-bold text-slate-950 bg-white hover:bg-slate-100 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      <Volume2 className="w-4 h-4 text-slate-900" />
                      {callingNext ? 'Calling Next...' : 'Call Next Customer'}
                    </button>
                  )}
                </div>
              </div>

              {/* Queue Statistics Card */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide block">
                    Queue Load for Selected Service
                  </span>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Waiting in Line:</span>
                      <span className="text-2xl font-mono font-bold text-white tabular-nums">
                        {waitingTokens.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Est. Remaining:</span>
                      <span className="text-2xl font-mono font-bold text-slate-300 tabular-nums">
                        ~{waitingTokens.length * (selectedService?.avg_service_time_mins || 8)}m
                      </span>
                    </div>
                  </div>
                </div>

                {activeNowServingToken && (
                  <button
                    onClick={handleCallNext}
                    disabled={callingNext || waitingTokens.length === 0}
                    className="w-full py-3 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Volume2 className="w-4 h-4" />
                    Call Another Customer To Counter ({waitingTokens.length} waiting)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Waiting Customers Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Waiting Customer Tokens</h3>
              <span className="text-xs bg-blue-950 text-blue-300 font-mono font-bold px-2 py-0.5 rounded-full border border-blue-800">
                {waitingTokens.length}
              </span>
            </div>
            <span className="text-xs text-slate-500">Ordered by arrival time</span>
          </div>

          {waitingTokens.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Pos</th>
                    <th className="py-3 px-4">Token</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Contact & Verification</th>
                    <th className="py-3 px-4">Purpose / Notes</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {waitingTokens.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">#{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-400 text-sm">{t.token_number}</td>
                      <td className="py-3 px-4 font-semibold text-white">{t.user_name}</td>
                      <td className="py-3 px-4 text-slate-400">
                        <div>{t.user_phone || t.user_email}</div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          {t.verification_method || 'Verified Customer'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-[180px] truncate">
                        {t.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={handleCallNext}
                          className="px-3 py-1 text-xs font-bold text-slate-900 bg-white hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Call
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              No customers currently waiting in this service queue.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
