import React from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Bot,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import type { DashboardStats, AttendanceRecord, Staff } from '../../types';

interface DashboardOverviewProps {
  stats: DashboardStats | null;
  liveFeed: AttendanceRecord[];
  onOpenRecognition: (mode: 'ENTRY' | 'EXIT') => void;
  onOpenAssistant: () => void;
  onViewStaffProfile: (staffId: string) => void;
  onViewAllRecords: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  liveFeed,
  onOpenRecognition,
  onOpenAssistant,
  onViewStaffProfile,
  onViewAllRecords,
}) => {
  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner (Section 35) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center space-x-2 text-xs font-semibold text-teal-400">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
              </span>
              <span>LIVE ● System Operational • Biometric Recognition Gateway</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Good Morning, Admin
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Wednesday, September 30, 2026 • Hospital workforce presence, triage staffing, and live facial attendance terminal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onOpenRecognition('ENTRY')}
              className="px-5 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-teal-500/30 flex items-center space-x-2 shrink-0"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Entry Camera</span>
            </button>

            <button
              onClick={() => onOpenRecognition('EXIT')}
              className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/20 flex items-center space-x-2 shrink-0"
            >
              <Camera className="w-4 h-4 text-indigo-400" />
              <span>Exit Station</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 6 Live Metric Cards (Section 7) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* TOTAL STAFF */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Staff</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats ? stats.totalStaff : 0}
          </div>
          <div className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full inline-block">
            {stats && stats.totalStaff > 0 ? `${stats.totalStaff} Registered` : 'Awaiting Staff'}
          </div>
        </div>

        {/* PRESENT TODAY */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Present Today</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
            {stats ? stats.presentToday : 0}
          </div>
          <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
            {stats && stats.totalStaff > 0 ? `${stats.attendanceRate}% Attendance` : '0% Attendance'}
          </div>
        </div>

        {/* ABSENT TODAY */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Absent Today</span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight">
            {stats ? stats.absentToday : 0}
          </div>
          <div className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full inline-block">
            Duty Off / On Leave
          </div>
        </div>

        {/* CURRENTLY INSIDE */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Currently Inside</span>
            <Building2 className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-cyan-600 tracking-tight">
            {stats ? stats.currentlyInside : 0}
          </div>
          <div className="text-[10px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full inline-block">
            Active in Hospital
          </div>
        </div>

        {/* SHIFT COMPLETED */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Shift Completed</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 tracking-tight">
            {stats ? stats.shiftCompleted : 0}
          </div>
          <div className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full inline-block">
            Exit Verified
          </div>
        </div>

        {/* LATE ARRIVALS */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Late Arrivals</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight">
            {stats ? stats.lateArrivals : 0}
          </div>
          <div className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block">
            &gt; 09:15 AM
          </div>
        </div>
      </div>

      {/* Middle Grid: AI Attendance Insight Card (Section 50) & Quick Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* AI Insight Card (Section 50) */}
        <div className="lg:col-span-4 bg-gradient-to-br from-indigo-900 via-slate-900 to-teal-950 rounded-3xl p-6 text-white shadow-md border border-indigo-800/50 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Attendance Insight</span>
              </div>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                Live Analysis
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {stats && stats.totalStaff > 0 ? (
                <>
                  Today, <strong className="text-white">{stats.presentToday} of {stats.totalStaff}</strong> registered staff members have recorded attendance.
                  <br /><br />
                  <strong className="text-amber-300">{stats.lateArrivals} late arrivals</strong> and <strong className="text-cyan-300">{stats.currentlyInside} active staff</strong> inside clinical units.
                </>
              ) : (
                <>
                  No clinical staff registered in the database yet. Navigate to <strong className="text-teal-300">Staff Management</strong> to add hospital personnel and register biometric facial profiles.
                </>
              )}
            </p>
          </div>

          <button
            onClick={onOpenAssistant}
            className="w-full py-2.5 px-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-2 shadow-sm shadow-indigo-500/30"
          >
            <Bot className="w-4 h-4" />
            <span>Ask HospitalAI Assistant</span>
          </button>
        </div>

        {/* Live Attendance Activity Feed (Section 8) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <Activity className="w-5 h-5 text-teal-600" />
              <h2 className="font-bold text-sm text-slate-900">Live Attendance Activity Feed</h2>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                Real-Time Stream
              </span>
            </div>

            <button
              onClick={onViewAllRecords}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center space-x-1"
            >
              <span>View All Logs</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Activity Feed Items (Matches Section 8 example: Rahul Sharma, Priya Singh, Amit Kumar, Neha Gupta) */}
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {liveFeed.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Awaiting morning attendance clock-ins...
              </div>
            ) : (
              liveFeed.map((item) => {
                const isExit = item.exit_time !== null;
                const isLate = item.is_late;

                return (
                  <div
                    key={item.id}
                    onClick={() => onViewStaffProfile(item.staff_id)}
                    className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-teal-50/30 hover:border-teal-200/80 transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="font-mono text-xs font-bold text-slate-500 w-16">
                        {item.exit_time || item.entry_time || '09:02:17'}
                      </div>

                      <div className="mt-0.5">
                        {isLate ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className={`w-4 h-4 ${isExit ? 'text-indigo-500' : 'text-emerald-500'}`} />
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-xs text-slate-900 group-hover:text-teal-700 transition-colors">
                          {item.staff_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.department} • <span className="font-mono">{item.employee_id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isLate
                            ? 'bg-amber-100 text-amber-800'
                            : isExit
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isLate
                          ? 'Late arrival'
                          : isExit
                          ? `Shift completed (${item.duration_formatted})`
                          : 'Entry recorded'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
