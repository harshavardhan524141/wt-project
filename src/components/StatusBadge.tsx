import React from 'react';
import { TokenStatus } from '../types/index.ts';
import { Clock, CheckCircle2, AlertCircle, XCircle, Volume2 } from 'lucide-react';

interface StatusBadgeProps {
  status: TokenStatus;
  desk?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, desk, className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs gap-1.5 py-0.5 px-2',
    md: 'text-xs font-semibold gap-1.5 py-1 px-2.5',
    lg: 'text-sm font-bold gap-2 py-1.5 px-3.5',
  };

  switch (status) {
    case 'now_serving':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses[size]} ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Now Serving {desk ? `· ${desk}` : ''}</span>
        </span>
      );

    case 'waiting':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 ${sizeClasses[size]} ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Waiting in Line</span>
        </span>
      );

    case 'served':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses[size]} ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Served & Completed</span>
        </span>
      );

    case 'skipped':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses[size]} ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Skipped</span>
        </span>
      );

    case 'cancelled':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses[size]} ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-500" />
          <span>Cancelled</span>
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center rounded-md bg-slate-100 text-slate-700 ${sizeClasses[size]} ${className}`}>
          {status}
        </span>
      );
  }
};
