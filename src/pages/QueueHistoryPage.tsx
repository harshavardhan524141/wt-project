import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { QueueToken } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import {
  History,
  Search,
  Filter,
  Calendar,
  Ticket,
  Clock,
  ArrowRight,
  RefreshCw,
  Building2
} from 'lucide-react';

interface QueueHistoryPageProps {
  navigate: (path: string) => void;
}

export const QueueHistoryPage: React.FC<QueueHistoryPageProps> = ({ navigate }) => {
  const [history, setHistory] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ history: QueueToken[] }>('/queue/my-history');
      setHistory(res.history || []);
    } catch (e) {
      console.error('Failed to load queue history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const statuses = ['All', 'waiting', 'now_serving', 'served', 'skipped', 'cancelled'];

  const filteredHistory = history.filter((item) => {
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesStatus;

    const matchesSearch =
      item.token_number.toLowerCase().includes(query) ||
      (item.service_name && item.service_name.toLowerCase().includes(query)) ||
      (item.center_name && item.center_name.toLowerCase().includes(query));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                Personal Activity
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                Queue Token History
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Comprehensive record of all past and active service tokens requested under your account.
              </p>
            </div>

            <button
              onClick={fetchHistory}
              disabled={loading}
              className="self-start md:self-auto px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh History</span>
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by token (e.g. DL-101) or service..."
                className="w-full text-sm pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 text-slate-900 bg-white placeholder:text-slate-400 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {statuses.map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap capitalize ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* History Table Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400 animate-pulse">
              Loading queue records...
            </div>
          ) : filteredHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Token Number</th>
                    <th className="py-3.5 px-4">Service Details</th>
                    <th className="py-3.5 px-4">Center & Desk</th>
                    <th className="py-3.5 px-4">Joined Timestamp</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Pass View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-blue-900 tabular-nums">
                        {item.token_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{item.service_name}</div>
                        {item.notes && <div className="text-[11px] text-slate-400 mt-0.5">{item.notes}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-700">{item.center_name}</div>
                        {item.counter_desk && (
                          <div className="text-[11px] text-slate-400 font-mono">{item.counter_desk}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {new Date(item.joined_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                        {new Date(item.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.status} desk={item.counter_desk} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => navigate(`/queue/${item.id}`)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          View Pass
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No matching tickets in history</p>
              <p className="text-xs text-slate-400 mt-1">
                Your completed, skipped, or cancelled queue tokens will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
