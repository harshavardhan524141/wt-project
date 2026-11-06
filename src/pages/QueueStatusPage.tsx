import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api.ts';
import { QueueToken } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { playChime } from '../lib/sound.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Ticket,
  Clock,
  Users,
  Building2,
  MapPin,
  Phone,
  Printer,
  XCircle,
  Volume2,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface QueueStatusPageProps {
  tokenId: number;
  navigate: (path: string) => void;
}

export const QueueStatusPage: React.FC<QueueStatusPageProps> = ({ tokenId, navigate }) => {
  const { user } = useAuth();
  const [token, setToken] = useState<QueueToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const prevStatusRef = useRef<string | null>(null);

  const fetchTokenStatus = async (silent = false) => {
    try {
      const res = await api.get<{ token: QueueToken }>(`/queue/status/${tokenId}`);
      const currentToken = res.token;

      // Audio notification if called
      if (prevStatusRef.current && prevStatusRef.current !== 'now_serving' && currentToken.status === 'now_serving') {
        playChime();
      }
      prevStatusRef.current = currentToken.status;

      setToken(currentToken);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Unable to retrieve queue status.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenStatus();

    // Poll live status every 4 seconds
    const interval = setInterval(() => {
      fetchTokenStatus(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [tokenId]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your place in this queue?')) return;
    setCancelling(true);
    try {
      await api.post(`/queue/cancel/${tokenId}`);
      await fetchTokenStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel token.');
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-sm w-full text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">Connecting to Queue Engine...</p>
          <p className="text-xs text-slate-400 mt-1">Retrieving live token telemetry</p>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Token Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">{error || 'This token could not be located in the database.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isNowServing = token.status === 'now_serving';
  const isWaiting = token.status === 'waiting';
  const isOwner = user && (user.id === token.user_id || user.role === 'admin');

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Live synced {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <button
              onClick={() => playChime()}
              className="text-xs font-medium text-slate-600 hover:text-blue-600 p-1.5 rounded-lg border border-slate-200 flex items-center gap-1"
              title="Test chime sound"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Test Sound</span>
            </button>
            <button
              onClick={handlePrint}
              className="text-xs font-medium text-slate-600 hover:text-blue-600 p-1.5 rounded-lg border border-slate-200 flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Print Pass</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Urgent Callout if Now Serving */}
        {isNowServing && (
          <div className="bg-emerald-600 text-white rounded-2xl p-6 shadow-xl border-2 border-emerald-400 animate-pulse flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Volume2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-100">
                  ATTENTION · YOUR TURN
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
                  Please proceed to {token.counter_desk || 'Counter Desk'}
                </h2>
                <p className="text-xs text-emerald-100 mt-1">
                  The service agent is waiting for token #{token.token_number}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Central Ticket Display */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 sm:px-8 py-5 border-b border-slate-100 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono text-blue-300 uppercase tracking-wider">
                Official Digital Queue Pass
              </div>
              <h1 className="text-lg font-bold text-white mt-0.5">{token.center_name}</h1>
              <p className="text-xs text-slate-400">{token.center_address}</p>
            </div>
            <div>
              <StatusBadge status={token.status} desk={token.counter_desk} size="lg" />
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-8">
            {/* Massive Token Number & Service Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-dashed border-slate-200">
              <div className="text-center sm:text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  {token.service_name}
                </span>
                <div className="text-5xl sm:text-7xl font-mono font-black text-blue-950 tracking-tight tabular-nums">
                  {token.token_number}
                </div>
                <div className="text-xs text-slate-500 mt-2 font-mono">
                  Assigned to: <strong className="text-slate-800">{token.user_name}</strong> · Joined at{' '}
                  {new Date(token.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Status Specific Metrics */}
              {isWaiting && (
                <div className="grid grid-cols-2 gap-4 w-full sm:w-auto min-w-[280px]">
                  <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 text-center">
                    <span className="text-xs text-blue-700 font-semibold uppercase block">Line Position</span>
                    <span className="text-4xl font-mono font-black text-blue-950 tabular-nums">
                      #{token.position ?? 1}
                    </span>
                    <span className="text-[11px] text-blue-600 block mt-1">
                      {token.waiting_ahead === 0 ? 'Next in line!' : `${token.waiting_ahead} waiting ahead`}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                    <span className="text-xs text-slate-600 font-semibold uppercase block">Estimated Wait</span>
                    <span className="text-4xl font-mono font-black text-slate-900 tabular-nums">
                      ~{Math.max(2, token.estimated_wait_mins)}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-1">minutes approx</span>
                  </div>
                </div>
              )}

              {isNowServing && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 text-center w-full sm:w-auto min-w-[280px]">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                    Called to Station
                  </span>
                  <div className="text-3xl font-extrabold text-emerald-950 mt-1">
                    {token.counter_desk || 'Front Desk'}
                  </div>
                  <span className="text-xs text-emerald-700 mt-1 block">
                    Active since {token.called_at ? new Date(token.called_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                  </span>
                </div>
              )}

              {!isWaiting && !isNowServing && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center min-w-[240px]">
                  <span className="text-xs text-slate-500 font-semibold uppercase block">Final Status</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1 uppercase">
                    {token.status}
                  </div>
                  {token.completed_at && (
                    <span className="text-xs text-slate-500 mt-1 block">
                      Resolved {new Date(token.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Currently Serving Counter Info */}
            {isWaiting && token.currently_serving && (
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-slate-600">Currently being served at counter:</span>
                  <span className="font-mono font-bold text-blue-900 text-sm">
                    {token.currently_serving} {token.currently_serving_counter ? `(${token.currently_serving_counter})` : ''}
                  </span>
                </div>
                <span className="text-slate-400">
                  Total waiting for this service: {token.total_waiting_in_service}
                </span>
              </div>
            )}

            {/* Queue Progression Audit Logs */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Token Audit & Progression Log
              </h3>
              <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-100">
                {token.logs && token.logs.length > 0 ? (
                  token.logs.map((log) => (
                    <div key={log.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <div>
                          <span className="font-semibold text-slate-800">{log.note || `Status shifted to ${log.new_status}`}</span>
                          {log.changed_by_name && (
                            <span className="text-slate-400 ml-1.5">by {log.changed_by_name}</span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-slate-400">Initial ticket generated.</div>
                )}
              </div>
            </div>

            {/* User Cancellation Option */}
            {isWaiting && isOwner && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">No longer able to wait?</span>
                  <span className="text-[11px] text-slate-400">You can cancel your token to free up the queue.</span>
                </div>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="px-4 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  {cancelling ? 'Cancelling...' : 'Cancel Token'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
