import React from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  CheckCheck,
  ShieldCheck,
} from 'lucide-react';
import type { NotificationItem } from '../../types';

interface NotificationCenterProps {
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
}) => {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Hospital Notifications & Real-Time Alerts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Biometric verification telemetry, late arrivals, shift completions, and security warnings.
          </p>
        </div>

        <button
          onClick={onMarkAllRead}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 self-start sm:self-auto shadow-2xs"
        >
          <CheckCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Mark All Read</span>
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-3">
        {notifications.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No system notifications or attendance alerts at this time.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => onMarkRead(n.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 ${
                n.read
                  ? 'bg-slate-50/50 border-slate-200/60 opacity-75'
                  : 'bg-teal-50/20 border-teal-200/80 shadow-2xs'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {n.type === 'entry' && (
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                {n.type === 'exit' && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                {n.type === 'late' && (
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
                {n.type === 'alert' && (
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                )}
                {n.type === 'system' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-900">{n.title}</span>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{n.timestamp}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
