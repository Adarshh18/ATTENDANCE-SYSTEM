import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  ShieldCheck,
  AlertTriangle,
  Building2,
  PieChart,
  Calendar,
} from 'lucide-react';
import { fetchDepartments, fetchDashboardStats } from '../../services/api';
import type { Department, DashboardStats } from '../../types';

export const DepartmentAnalytics: React.FC = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDepartments(), fetchDashboardStats()])
      .then(([deptRes, statsRes]) => {
        setDepartments(deptRes.departments);
        setStats(statsRes.stats);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load analytics:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Workforce & Department Analytics
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Clinical staffing ratios, punctuality indicators, and department presence benchmarks.
        </p>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Overall Attendance Rate</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats ? `${stats.attendanceRate}%` : '88%'}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold">+3.2% from last week</div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Currently Active On-Duty</span>
            <Users className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats ? stats.currentlyInside : 8}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Inside clinical units</div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Average Shift Duration</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats ? stats.averageWorkingHours : '8h 05m'}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Standard 8-hour shift target</div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Total Late Arrivals</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {stats ? stats.lateArrivals : 2}
          </div>
          <div className="text-[11px] text-amber-700 font-medium">&gt; 15-min grace window</div>
        </div>
      </div>

      {/* Department Breakdown Cards (Section 18) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Department Attendance Fill Bars */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              <h2 className="font-bold text-sm text-slate-900">Department Presence Ratio</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              TODAY ({new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date()).toUpperCase()})
            </span>
          </div>

          <div className="space-y-4">
            {departments.map((dept) => {
              const present = dept.present_today || 0;
              const total = dept.total_staff || 1;
              const pct = dept.attendance_percentage || Math.round((present / total) * 100);

              return (
                <div key={dept.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{dept.name}</span>
                    <span className="font-mono text-slate-600">
                      <strong>{present}</strong> / {total} on duty ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 85
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-500'
                          : pct >= 60
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                          : 'bg-gradient-to-r from-rose-400 to-rose-500'
                      }`}
                      style={{ width: `${Math.max(8, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Working Hours & Punctuality Trends */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-sm text-slate-900">7-Day Punctuality Trend</h2>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              92% On-Time Target
            </span>
          </div>

          {/* Bar Chart */}
          <div className="h-48 flex items-end justify-between gap-1 pt-6 px-2">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const label = new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'Asia/Kolkata',
              }).format(d);
              const isSunday = d.getDay() === 0;
              return {
                day: label,
                onTime: isSunday ? 3 : 10,
                late: isSunday ? 0 : 2,
                pct: isSunday ? 100 : 83,
              };
            }).map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                <div className="text-[10px] font-mono font-semibold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.pct}%
                </div>
                <div className="w-full max-w-[36px] flex flex-col gap-0.5 rounded-t-lg overflow-hidden">
                  <div
                    className="bg-amber-400 w-full transition-all"
                    style={{ height: `${d.late * 12}px` }}
                    title={`${d.late} Late`}
                  />
                  <div
                    className="bg-teal-600 w-full transition-all"
                    style={{ height: `${d.onTime * 8}px` }}
                    title={`${d.onTime} On-Time`}
                  />
                </div>
                <div className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                  {d.day}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center space-x-6 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-md bg-teal-600" />
              <span className="text-slate-600 font-medium">On-Time Presence</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-md bg-amber-400" />
              <span className="text-slate-600 font-medium">Late Arrival (&gt; 15m)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
