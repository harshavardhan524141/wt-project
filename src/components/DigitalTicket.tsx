import React from 'react';
import { QueueToken } from '../types/index.ts';
import { StatusBadge } from './StatusBadge.tsx';
import { Building2, Clock, Users, MapPin, Printer, ArrowRight, XCircle } from 'lucide-react';

interface DigitalTicketProps {
  token: QueueToken;
  onCancel?: (tokenId: number) => void;
  onViewDetails?: (tokenId: number) => void;
  compact?: boolean;
}

export const DigitalTicket: React.FC<DigitalTicketProps> = ({
  token,
  onCancel,
  onViewDetails,
  compact = false,
}) => {
  const isNowServing = token.status === 'now_serving';
  const isWaiting = token.status === 'waiting';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`relative bg-white border ${isNowServing ? 'border-emerald-300 ring-2 ring-emerald-400/30' : 'border-slate-200'} rounded-2xl shadow-sm overflow-hidden transition-all`}>
      {/* Top Banner */}
      <div className={`px-5 py-3 ${isNowServing ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono tracking-wider uppercase opacity-90">Digital Queue Pass</span>
          <span className="opacity-40">/</span>
          <span className="text-xs font-medium text-slate-200 truncate max-w-[180px] sm:max-w-none">
            {token.center_name || 'Service Center'}
          </span>
        </div>
        <StatusBadge status={token.status} desk={token.counter_desk} size="sm" />
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-dashed border-slate-200">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              {token.service_name}
            </div>
            {/* Monospace Tabular Token Number */}
            <div className="text-4xl sm:text-5xl font-mono font-extrabold tracking-tight text-blue-950 tabular-nums">
              {token.token_number}
            </div>
            <div className="text-xs text-slate-700 font-bold mt-1.5 flex items-center gap-2">
              <span>{token.customer_name || token.user_name || 'Verified Customer'}</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-normal">
                {token.verification_method || 'Mobile/Gmail Verified'}
              </span>
            </div>
            {token.notes && (
              <div className="text-[11px] text-slate-500 italic mt-0.5">
                Purpose: {token.notes}
              </div>
            )}
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate max-w-[280px]">{token.center_address || 'Main Desk Area'}</span>
            </div>
          </div>

          {/* Real-time Queue Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 min-w-[220px]">
            {isWaiting && (
              <>
                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs text-blue-700 font-medium mb-0.5">
                    <Users className="w-3.5 h-3.5" />
                    Queue Position
                  </div>
                  <div className="text-2xl font-mono font-bold text-blue-950 tabular-nums">
                    #{token.position ?? 1}
                  </div>
                  <div className="text-[11px] text-blue-600">
                    {token.waiting_ahead === 0 ? 'You are next!' : `${token.waiting_ahead} ahead of you`}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mb-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    Est. Wait Time
                  </div>
                  <div className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                    ~{Math.max(2, token.estimated_wait_mins)} <span className="text-sm font-normal text-slate-500">min</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Live updated</div>
                </div>
              </>
            )}

            {isNowServing && (
              <div className="col-span-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                  Proceed to Service Desk
                </div>
                <div className="text-2xl font-bold text-emerald-950 mt-0.5">
                  {token.counter_desk || 'Counter 1'}
                </div>
                <div className="text-xs text-emerald-700 mt-1">
                  Please show this digital token screen to the agent.
                </div>
              </div>
            )}

            {!isWaiting && !isNowServing && (
              <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Status:</span> {token.status.toUpperCase()}
                {token.completed_at && (
                  <div className="text-slate-500 mt-0.5">
                    Completed at {new Date(token.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Serving Snapshot for this service */}
        {token.currently_serving && isWaiting && (
          <div className="mt-4 px-3.5 py-2.5 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between text-xs text-slate-700">
            <span className="text-slate-500">Now Serving for this service:</span>
            <span className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200">
              {token.currently_serving} {token.currently_serving_counter ? `· ${token.currently_serving_counter}` : ''}
            </span>
          </div>
        )}

        {/* Barcode Strip Decoration */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">
              ID-{token.id} · SEQ-{token.sequence_number} · {new Date(token.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!compact && (
              <button
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 p-1 rounded transition-colors text-xs"
                title="Print Ticket"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            )}

            {isWaiting && onCancel && (
              <button
                onClick={() => onCancel(token.id)}
                className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 text-xs font-semibold px-2 py-1 rounded hover:bg-rose-50 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel Token
              </button>
            )}

            {onViewDetails && (
              <button
                onClick={() => onViewDetails(token.id)}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold px-2.5 py-1 rounded hover:bg-blue-50 transition-colors"
              >
                Full Status
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
