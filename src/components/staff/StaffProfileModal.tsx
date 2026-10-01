import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Briefcase,
  Shield,
  FileText,
  User,
} from 'lucide-react';
import { fetchStaffAttendanceHistory } from '../../services/api';
import type { Staff, AttendanceRecord } from '../../types';
import { StaffAvatar } from '../common/StaffAvatar';

interface StaffProfileModalProps {
  staffId: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenFaceRegister?: (staff: Staff) => void;
}

export const StaffProfileModal: React.FC<StaffProfileModalProps> = ({
  staffId,
  isOpen,
  onClose,
  onOpenFaceRegister,
}) => {
  const [data, setData] = useState<{
    staff: Staff;
    records: AttendanceRecord[];
    summary: {
      presentDays: number;
      absentDays: number;
      lateDays: number;
      totalHours: string;
      averageDailyHours: string;
    };
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  useEffect(() => {
    if (!isOpen || !staffId) return;
    setLoading(true);
    fetchStaffAttendanceHistory(staffId)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load staff profile:', err);
        setLoading(false);
      });
  }, [isOpen, staffId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-base text-slate-900">Hospital Staff Attendance Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading || !data ? (
            <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
              Loading employee workforce record...
            </div>
          ) : (
            <>
              {/* Profile Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-teal-50 to-slate-50 border border-teal-100">
                <div className="flex items-center space-x-4">
                  <StaffAvatar
                    name={data.staff.name}
                    avatarUrl={data.staff.avatar_url}
                    size="lg"
                    className="w-16 h-16 rounded-2xl ring-2 ring-teal-500/30 shadow-md shrink-0"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="font-bold text-lg text-slate-900">{data.staff.name}</h2>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          data.staff.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {data.staff.status}
                      </span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-teal-700 mt-0.5">
                      Employee ID: {data.staff.employee_id}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center space-x-3 mt-1">
                      <span>{data.staff.department}</span>
                      <span>•</span>
                      <span>{data.staff.designation}</span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-xs text-slate-500">
                    Shift: <span className="font-mono font-semibold text-slate-800">{data.staff.shift_start} - {data.staff.shift_end}</span>
                  </div>
                  {onOpenFaceRegister && (
                    <button
                      onClick={() => onOpenFaceRegister(data.staff)}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
                    >
                      {data.staff.has_face_registered ? 'Update Face Model' : 'Register Face'}
                    </button>
                  )}
                </div>
              </div>

              {/* Statistics Cards (Matches Section 13) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-xs">
                  <div className="text-[11px] font-medium text-slate-500">Present Days</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">{data.summary.presentDays}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Verified</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-xs">
                  <div className="text-[11px] font-medium text-slate-500">Absent Days</div>
                  <div className="text-xl font-bold text-rose-600 mt-1">{data.summary.absentDays}</div>
                  <div className="text-[10px] text-rose-500 font-semibold mt-0.5">September</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-xs">
                  <div className="text-[11px] font-medium text-slate-500">Late Arrivals</div>
                  <div className="text-xl font-bold text-amber-600 mt-1">{data.summary.lateDays}</div>
                  <div className="text-[10px] text-amber-600 font-semibold mt-0.5">&gt; 15m Grace</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-xs">
                  <div className="text-[11px] font-medium text-slate-500">Total Hours</div>
                  <div className="text-xl font-bold text-teal-700 mt-1">{data.summary.totalHours}</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Worked</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-xs col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-medium text-slate-500">Avg Daily Hours</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">{data.summary.averageDailyHours}</div>
                  <div className="text-[10px] text-teal-600 font-semibold mt-0.5">Per Shift</div>
                </div>
              </div>

              {/* Tabs: Monthly Mini Calendar vs Complete History */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      activeTab === 'overview'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date())} Calendar
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      activeTab === 'history'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Chronological Log ({data.records.length})
                  </button>
                </div>

                {activeTab === 'overview' ? (
                  /* Mini Month Grid for Current Month */
                  <div className="space-y-2">
                    <div className="grid grid-cols-7 gap-1.5 text-center">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <div key={day} className="text-[11px] font-bold text-slate-400 py-1">
                          {day}
                        </div>
                      ))}

                      {/* Blank Offset Days */}
                      {(() => {
                        const now = new Date();
                        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
                        const offset = firstDay === 0 ? 6 : firstDay - 1;
                        return Array.from({ length: offset }).map((_, i) => (
                          <div key={`offset-${i}`} className="p-2" />
                        ));
                      })()}

                      {(() => {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = now.getMonth();
                        const monthPrefix = `${year}-${(month + 1).toString().padStart(2, '0')}`;
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const todayFormatted = new Intl.DateTimeFormat('en-CA', {
                          timeZone: 'Asia/Kolkata',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        }).format(now);

                        return Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                          const dateStr = `${monthPrefix}-${day.toString().padStart(2, '0')}`;
                          const record = data.records.find((r) => r.attendance_date === dateStr);
                          const isToday = dateStr === todayFormatted;

                          let bgClass = 'bg-slate-100 text-slate-400';
                          let dotColor = 'bg-slate-300';
                          let statusText = 'No record';

                          if (record) {
                            if (record.status === 'WEEKLY_OFF') {
                              bgClass = 'bg-blue-50 text-blue-700 border border-blue-200';
                              dotColor = 'bg-blue-500';
                              statusText = 'Weekly Off';
                            } else if (record.status === 'ABSENT') {
                              bgClass = 'bg-rose-50 text-rose-700 border border-rose-200';
                              dotColor = 'bg-rose-500';
                              statusText = 'Absent';
                            } else if (record.is_late) {
                              bgClass = 'bg-amber-50 text-amber-700 border border-amber-200';
                              dotColor = 'bg-amber-500';
                              statusText = `Late (${record.entry_time})`;
                            } else {
                              bgClass = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
                              dotColor = 'bg-emerald-500';
                              statusText = `Present (${record.duration_formatted})`;
                            }
                          }

                          return (
                            <div
                              key={day}
                              title={`${dateStr}: ${statusText}`}
                              className={`p-2 rounded-xl text-center text-xs font-semibold transition-all relative ${bgClass} ${
                                isToday ? 'ring-2 ring-teal-500' : ''
                              }`}
                            >
                              <span className="leading-none">{day}</span>
                              <div className="flex justify-center mt-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    <div className="flex items-center justify-center space-x-4 pt-3 text-[11px] text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Present</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>Late</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span>Absent</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span>Weekly Off</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Chronological Records Table */
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Entry</th>
                          <th className="py-2.5 px-3">Exit</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.records.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 font-medium text-slate-900">{r.attendance_date}</td>
                            <td className="py-2 px-3 font-mono">{r.entry_time || '--'}</td>
                            <td className="py-2 px-3 font-mono">{r.exit_time || '--'}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{r.duration_formatted}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  r.status === 'PRESENT' || r.status === 'SHIFT_COMPLETED' || r.status === 'CURRENTLY_INSIDE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : r.status === 'LATE'
                                    ? 'bg-amber-100 text-amber-800'
                                    : r.status === 'WEEKLY_OFF'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {r.entry_confidence ? `${Math.round(r.entry_confidence * 100)}%` : '--'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
