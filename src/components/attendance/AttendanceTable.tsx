import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Search,
  Filter,
  Edit3,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Info,
  Building2,
} from 'lucide-react';
import { fetchAttendance, manuallyCorrectAttendance } from '../../services/api';
import { getTodayDateStr } from '../../utils/dateUtils';
import type { AttendanceRecord, Department } from '../../types';

interface AttendanceTableProps {
  departments: Department[];
  onAttendanceChanged: () => void;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  departments,
  onAttendanceChanged,
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters - Defaults to today's active date (e.g. 2026-10-01)
  const [date, setDate] = useState(getTodayDateStr());
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Manual Correction Modal State
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [correctionEntry, setCorrectionEntry] = useState('');
  const [correctionExit, setCorrectionExit] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAttendance({
        date,
        department: selectedDept !== 'ALL' ? selectedDept : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        search: searchTerm || undefined,
        page,
        limit: 15,
      });
      setRecords(res.records);
      setTotalRecords(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Error fetching attendance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date, selectedDept, selectedStatus, searchTerm, page]);

  const handleOpenCorrection = (record: AttendanceRecord) => {
    setCorrectingRecord(record);
    setCorrectionEntry(record.entry_time || '09:00:00');
    setCorrectionExit(record.exit_time || '17:00:00');
    setCorrectionNotes(record.notes || '');
    setCorrectionReason('');
    setCorrectionError(null);
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord) return;

    if (!correctionReason.trim() || correctionReason.trim().length < 5) {
      setCorrectionError('A descriptive audit reason is mandatory for clinical attendance modification.');
      return;
    }

    setIsSubmittingCorrection(true);
    try {
      await manuallyCorrectAttendance(correctingRecord.id, {
        entry_time: correctionEntry,
        exit_time: correctionExit,
        notes: correctionNotes,
        reason: correctionReason,
      });

      setCorrectingRecord(null);
      loadData();
      onAttendanceChanged();
    } catch (err: any) {
      setCorrectionError(err.message || 'Failed to modify record');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Attendance Records Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative hospital presence logs with timestamp validation and audit history.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-600">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff, ID, department..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Department */}
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="CURRENTLY_INSIDE">Currently Inside</option>
            <option value="SHIFT_COMPLETED">Shift Completed</option>
            <option value="LATE">Late Arrival</option>
            <option value="ABSENT">Absent</option>
            <option value="WEEKLY_OFF">Weekly Off</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Entry Time</th>
                <th className="py-3 px-4">Exit Time</th>
                <th className="py-3 px-4">Worked Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Punctuality</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Loading attendance ledger...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No attendance records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">{r.attendance_date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{r.staff_name}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-teal-800">{r.employee_id}</td>
                    <td className="py-3 px-4 text-slate-600">{r.department}</td>
                    <td className="py-3 px-4 font-mono text-slate-900">
                      {r.entry_time ? (
                        <div className="flex items-center space-x-1">
                          <span>{r.entry_time}</span>
                          {r.entry_confidence && (
                            <span className="text-[10px] text-teal-600 font-normal">
                              ({Math.round(r.entry_confidence * 100)}%)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-900">
                      {r.exit_time || <span className="text-slate-300">--</span>}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {r.duration_formatted}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'CURRENTLY_INSIDE'
                            ? 'bg-cyan-100 text-cyan-800 border border-cyan-200 animate-pulse'
                            : r.status === 'SHIFT_COMPLETED' || r.status === 'PRESENT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'LATE'
                            ? 'bg-amber-100 text-amber-800'
                            : r.status === 'WEEKLY_OFF'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {r.is_late ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                          Late Arrival
                        </span>
                      ) : r.entry_time ? (
                        <span className="text-emerald-600 font-medium">On Time</span>
                      ) : (
                        <span className="text-slate-300">--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenCorrection(r)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition-colors flex items-center space-x-1 text-[11px] font-semibold ml-auto"
                        title="Manual Correction with Audit Log"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Correct</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Total <strong className="text-slate-900">{totalRecords}</strong> records
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-800">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Correction Modal (Section 44) */}
      {correctingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-base text-slate-900">Manual Attendance Correction</h3>
                <div className="text-xs text-slate-500">
                  {correctingRecord.staff_name} • {correctingRecord.employee_id}
                </div>
              </div>
              <button
                onClick={() => setCorrectingRecord(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCorrection} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Regulatory Compliance: All manual corrections are permanently recorded in the Hospital Audit Log with administrator identity and reason.
                </span>
              </div>

              {correctionError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {correctionError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attendance Date
                </label>
                <input
                  type="text"
                  disabled
                  value={correctingRecord.attendance_date}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Entry Time (HH:mm:ss)
                  </label>
                  <input
                    type="text"
                    value={correctionEntry}
                    onChange={(e) => setCorrectionEntry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Exit Time (HH:mm:ss)
                  </label>
                  <input
                    type="text"
                    value={correctionExit}
                    onChange={(e) => setCorrectionExit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Audit Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Forgot to scan at exit station after emergency shift"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrative Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Internal reference notes..."
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCorrectingRecord(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorrection}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-sm shadow-teal-600/30"
                >
                  {isSubmittingCorrection ? 'Logging Correction...' : 'SAVE CORRECTION'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
