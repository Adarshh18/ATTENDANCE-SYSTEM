import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Eye,
  Info,
} from 'lucide-react';
import { fetchAttendance } from '../../services/api';
import type { AttendanceRecord, Staff, Department } from '../../types';

interface AttendanceCalendarViewProps {
  staffList: Staff[];
  departments: Department[];
}

export const AttendanceCalendarView: React.FC<AttendanceCalendarViewProps> = ({
  staffList,
  departments,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Day inspection modal
  const [inspectDate, setInspectDate] = useState<string | null>(null);
  const [inspectRecords, setInspectRecords] = useState<AttendanceRecord[]>([]);

  const monthPrefix = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}`;
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(selectedYear, selectedMonth, 1).getDay();
  // Mon=0, Tue=1, ..., Sun=6
  const startingDayOffset = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const loadMonthAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetchAttendance({
        limit: 1000,
      });
      const forThisMonth = (res.records || []).filter((r: AttendanceRecord) =>
        r.attendance_date.startsWith(monthPrefix)
      );
      setMonthRecords(forThisMonth);
    } catch (err) {
      console.error('Failed to load calendar records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthAttendance();
  }, [selectedYear, selectedMonth]);

  const handleDayClick = async (dayNumber: number) => {
    const dayStr = dayNumber.toString().padStart(2, '0');
    const fullDate = `${monthPrefix}-${dayStr}`;
    setInspectDate(fullDate);

    try {
      const res = await fetchAttendance({ date: fullDate, limit: 100 });
      setInspectRecords(res.records);
    } catch (err) {
      console.error('Error fetching day details:', err);
    }
  };

  const todayDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Workforce Attendance Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual day-by-day attendance density, punctuality patterns, and shift completion.
          </p>
        </div>

        {/* Month Selector Bar */}
        <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <CalendarIcon className="w-4 h-4 text-teal-600" />
          <span className="text-xs font-bold text-slate-900 min-w-[120px] text-center">
            {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
              new Date(selectedYear, selectedMonth, 1)
            )}
          </span>
          <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-semibold">
            {daysInMonth} Days
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Ribbon & Color Legend */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Staff Member Selector */}
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
          >
            <option value="ALL">All Hospital Staff (Aggregate)</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.employee_id})
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-xs font-medium text-slate-600">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs" />
            <span>Present</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-xs" />
            <span>Late Arrival</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 shadow-xs" />
            <span>Absent</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-xs" />
            <span>Weekly Off</span>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        {/* Days of Week Headers */}
        <div className="grid grid-cols-7 gap-3 text-center">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
            <div key={day} className="text-xs font-bold text-slate-400 py-2">
              {day}
            </div>
          ))}

          {/* Blank Offset Days */}
          {Array.from({ length: startingDayOffset }).map((_, idx) => (
            <div key={`offset-${idx}`} className="h-24 sm:h-28 rounded-2xl bg-slate-50/50 border border-transparent" />
          ))}

          {/* Month Days */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayStr = day.toString().padStart(2, '0');
            const dateStr = `${monthPrefix}-${dayStr}`;
            const isToday = dateStr === todayDateStr;

            // Filter for selected staff or department
            let dayRecords = monthRecords.filter((r) => r.attendance_date === dateStr);
            if (selectedStaffId !== 'ALL') {
              dayRecords = dayRecords.filter((r) => r.staff_id === selectedStaffId);
            }
            if (selectedDept !== 'ALL') {
              dayRecords = dayRecords.filter((r) => r.department === selectedDept);
            }

            const dayDate = new Date(selectedYear, selectedMonth, day);
            const isSunday = dayDate.getDay() === 0;

            let dayStatus: 'PRESENT' | 'LATE' | 'ABSENT' | 'WEEKLY_OFF' = 'PRESENT';
            if (isSunday) {
              dayStatus = 'WEEKLY_OFF';
            } else if (dayRecords.length > 0) {
              const hasLate = dayRecords.some((r) => r.is_late);
              dayStatus = hasLate ? 'LATE' : 'PRESENT';
            } else {
              const isPast = dateStr < todayDateStr;
              dayStatus = isPast ? 'ABSENT' : 'PRESENT';
            }

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                className={`h-24 sm:h-28 p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md hover:scale-[1.02] ${
                  isToday
                    ? 'border-teal-500 bg-teal-50/20 ring-2 ring-teal-500/30'
                    : 'border-slate-200/80 bg-white hover:border-teal-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono font-bold text-xs ${
                      isToday
                        ? 'w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center'
                        : 'text-slate-800'
                    }`}
                  >
                    {day}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-1.5 py-0.2 rounded-full">
                      Today
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {/* Status Indicator Chip */}
                  <div
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center space-x-1 ${
                      dayStatus === 'PRESENT'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : dayStatus === 'LATE'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : dayStatus === 'ABSENT'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        dayStatus === 'PRESENT'
                          ? 'bg-emerald-500'
                          : dayStatus === 'LATE'
                          ? 'bg-amber-500'
                          : dayStatus === 'ABSENT'
                          ? 'bg-rose-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <span className="truncate">
                      {dayRecords.length > 0
                        ? `${dayRecords.length} Present`
                        : dayStatus === 'WEEKLY_OFF'
                        ? 'Weekly Off'
                        : dayStatus === 'ABSENT'
                        ? 'Absent'
                        : 'Scheduled'}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 truncate hidden sm:block">
                    {dayStatus === 'WEEKLY_OFF' ? 'Non-Clinical' : '09:00 - 17:00'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Inspection Detail Modal */}
      {inspectDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Attendance Log: {inspectDate}
                  </h3>
                  <div className="text-xs text-slate-500">
                    Hospital Staff Presence and Verification Roster
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectDate(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="p-5 max-h-[65vh] overflow-y-auto space-y-3">
              {inspectRecords.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No explicit individual logs found for this date.
                </div>
              ) : (
                inspectRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-teal-400 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{rec.staff_name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                        <span className="font-mono text-teal-700 font-semibold">{rec.employee_id}</span>
                        <span>•</span>
                        <span>{rec.department}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-800">
                        {rec.entry_time || '--'} → {rec.exit_time || 'Present'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Duration: <span className="font-semibold text-slate-700">{rec.duration_formatted}</span>
                      </div>
                    </div>

                    <div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'CURRENTLY_INSIDE' || rec.status === 'PRESENT' || rec.status === 'SHIFT_COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'LATE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {rec.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
