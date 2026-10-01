import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
} from 'lucide-react';
import { fetchMonthlySummary, fetchDepartments } from '../../services/api';
import { getCurrentMonthStr } from '../../utils/dateUtils';
import type { Department } from '../../types';

interface ReportGenerationProps {
  departments: Department[];
}

export const ReportGeneration: React.FC<ReportGenerationProps> = ({ departments }) => {
  const [reportType, setReportType] = useState<'MONTHLY' | 'WEEKLY' | 'DAILY'>('MONTHLY');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await fetchMonthlySummary(selectedMonth);
      setSummaryData(data);
    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedMonth]);

  const filteredStaff = summaryData?.staffSummaries?.filter((s: any) => {
    return selectedDept === 'ALL' || s.department === selectedDept;
  }) || [];

  // Export to CSV
  const handleExportCsv = () => {
    if (!summaryData) return;
    const headers = [
      'Employee ID',
      'Name',
      'Department',
      'Designation',
      'Working Days',
      'Present Days',
      'Absent Days',
      'Late Arrivals',
      'Early Exits',
      'Total Working Hours',
      'Average Daily Hours',
    ];

    const rows = filteredStaff.map((s: any) => [
      s.employee_id,
      `"${s.name}"`,
      `"${s.department}"`,
      `"${s.designation}"`,
      s.working_days,
      s.present,
      s.absent,
      s.late,
      s.early_exit,
      `"${s.total_hours}"`,
      `"${s.average_daily_hours}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HospitalAI_Attendance_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel / TSV format
  const handleExportExcel = () => {
    if (!summaryData) return;
    const headers = [
      'Employee ID',
      'Name',
      'Department',
      'Designation',
      'Working Days',
      'Present Days',
      'Absent Days',
      'Late Arrivals',
      'Total Hours',
      'Average Daily Hours',
    ];

    const rows = filteredStaff.map((s: any) => [
      s.employee_id,
      s.name,
      s.department,
      s.designation,
      s.working_days,
      s.present,
      s.absent,
      s.late,
      s.total_hours,
      s.average_daily_hours,
    ]);

    const tsvContent = 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent([headers.join('\t'), ...rows.map((r: any) => r.join('\t'))].join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', tsvContent);
    link.setAttribute('download', `HospitalAI_Staff_Attendance_${selectedMonth}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Workforce Attendance Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated monthly clinical attendance reconciliation and regulatory audits.
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Filter Parameters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Report Scope */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setReportType('MONTHLY')}
              className={`px-3 py-1 rounded-lg ${reportType === 'MONTHLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              Monthly Summary
            </button>
            <button
              onClick={() => setReportType('WEEKLY')}
              className={`px-3 py-1 rounded-lg ${reportType === 'WEEKLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setReportType('DAILY')}
              className={`px-3 py-1 rounded-lg ${reportType === 'DAILY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              Daily
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-600">Period:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800"
            />
          </div>
        </div>

        <div>
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
      </div>

      {/* Printable Report Paper Layout */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Hospital Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200">
          <div>
            <div className="text-xs font-bold text-teal-600 uppercase tracking-widest">
              BANARAS HOSPITAL
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Monthly Clinical Workforce Attendance Summary
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Period: September 2026 (1 Sep - 30 Sep 2026) • 26 Standard Working Days
            </p>
          </div>
          <div className="mt-3 sm:mt-0 text-left sm:text-right text-xs text-slate-500">
            <div>Generated: <span className="font-mono font-medium text-slate-800">30 Sep 2026</span></div>
            <div>Timezone: <span className="font-medium text-slate-800">Asia/Kolkata</span></div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Automated Biometric Ledger</div>
          </div>
        </div>

        {/* Data Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Working Days</th>
                <th className="py-3 px-4 text-center">Present</th>
                <th className="py-3 px-4 text-center">Absent</th>
                <th className="py-3 px-4 text-center">Late</th>
                <th className="py-3 px-4">Total Hours</th>
                <th className="py-3 px-4">Avg Daily Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Generating report computations...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No staff records found for this period.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff: any) => (
                  <tr key={staff.staff_id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{staff.name}</div>
                      <div className="text-[11px] text-slate-400">{staff.designation}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-teal-800">
                      {staff.employee_id}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{staff.department}</td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">{staff.working_days}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                      {staff.present}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">
                      {staff.absent}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-amber-600">
                      {staff.late}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {staff.total_hours}
                    </td>
                    <td className="py-3 px-4 font-mono text-teal-700 font-medium">
                      {staff.average_daily_hours}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Audit Sign-Off */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Certified accurate by HospitalAI Biometric Workforce Engine.
          </div>
          <div className="flex items-center space-x-6 text-[11px]">
            <div>Chief Medical Officer _________________</div>
            <div>HR Director _________________</div>
          </div>
        </div>
      </div>
    </div>
  );
};
