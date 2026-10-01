import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Camera,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Building2,
  Phone,
  Mail,
  Clock,
  Sparkles,
  AlertCircle,
  Check,
} from 'lucide-react';
import { createStaff, updateStaff, deactivateStaff } from '../../services/api';
import { getTodayDateStr } from '../../utils/dateUtils';
import type { Staff, Department } from '../../types';
import { StaffAvatar } from '../common/StaffAvatar';
import { StaffImageUploader } from './StaffImageUploader';

interface StaffManagementProps {
  staffList: Staff[];
  departments: Department[];
  onRefresh: () => void;
  onOpenFaceRegister: (staff: Staff) => void;
  onViewProfile: (staff: Staff) => void;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({
  staffList,
  departments,
  onRefresh,
  onOpenFaceRegister,
  onViewProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state - now with avatar_url
  const [formData, setFormData] = useState({
    name: '',
    employee_id: '',
    department: 'Emergency Medicine',
    designation: '',
    phone: '',
    email: '',
    shift_start: '09:00',
    shift_end: '17:00',
    weekly_off: 'Sunday',
    joining_date: getTodayDateStr(),
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    avatar_url: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      employee_id: '',
      department: departments[0]?.name || 'Emergency Medicine',
      designation: '',
      phone: '',
      email: '',
      shift_start: '09:00',
      shift_end: '17:00',
      weekly_off: 'Sunday',
      joining_date: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      avatar_url: '',
    });
    setEditingStaff(null);
    setFormError(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      employee_id: staff.employee_id,
      department: staff.department,
      designation: staff.designation,
      phone: staff.phone,
      email: staff.email,
      shift_start: staff.shift_start,
      shift_end: staff.shift_end,
      weekly_off: staff.weekly_off,
      joining_date: staff.joining_date,
      status: staff.status,
      avatar_url: staff.avatar_url || '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    // Validation
    if (!formData.name.trim() || !formData.employee_id.trim() || !formData.designation.trim() || !formData.phone.trim() || !formData.email.trim()) {
      setFormError('Please fill in all mandatory fields.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingStaff) {
        await updateStaff(editingStaff.id, formData);
        setActionNotice(`Staff profile for ${formData.name} updated successfully.`);
      } else {
        await createStaff(formData);
        setActionNotice(`New staff member ${formData.name} added successfully.`);
      }
      onRefresh();
      setIsAddModalOpen(false);
      resetForm();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Error saving staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: Staff) => {
    try {
      if (staff.status === 'ACTIVE') {
        await deactivateStaff(staff.id);
        setActionNotice(`Staff member ${staff.name} deactivated.`);
      } else {
        await updateStaff(staff.id, { status: 'ACTIVE' });
        setActionNotice(`Staff member ${staff.name} reactivated.`);
      }
      onRefresh();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice(err.message || 'Failed to update status');
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  // Filtered List
  const filteredStaff = staffList.filter((s) => {
    const matchSearch =
      searchTerm === '' ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.designation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchDept = selectedDept === 'ALL' || s.department === selectedDept;
    const matchStatus = selectedStatus === 'ALL' || s.status === selectedStatus;

    return matchSearch && matchDept && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Hospital Staff Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Clinical directory, shift schedules, custom profile photos, and biometric registration.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors shadow-sm shadow-teal-600/30 flex items-center space-x-2 shrink-0 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Action Notice Banner */}
      {actionNotice && (
        <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-teal-600 hover:text-teal-800">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Name, Employee ID, Department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Staff</option>
            <option value="INACTIVE">Inactive Staff</option>
          </select>

          <span className="text-xs text-slate-400 ml-1 whitespace-nowrap">
            Showing <strong className="text-slate-800">{filteredStaff.length}</strong> staff
          </span>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[760px]">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Shift Timing</th>
                <th className="py-3 px-4">Biometrics</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No staff members match the selected search or filters.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Staff Name & Profile Avatar (No fake default photo!) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <StaffAvatar
                          name={staff.name}
                          avatarUrl={staff.avatar_url}
                          size="sm"
                          className="shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{staff.name}</div>
                          <div className="text-[11px] text-slate-400">Off: {staff.weekly_off}</div>
                        </div>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="py-3 px-4 font-mono font-semibold text-teal-800">
                      {staff.employee_id}
                    </td>

                    {/* Department & Role */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{staff.department}</div>
                      <div className="text-[11px] text-slate-500">{staff.designation}</div>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4 text-slate-600">
                      <div>{staff.phone}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{staff.email}</div>
                    </td>

                    {/* Shift */}
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {staff.shift_start} - {staff.shift_end}
                    </td>

                    {/* Biometric Status */}
                    <td className="py-3 px-4">
                      {staff.has_face_registered ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                          <Check className="w-3 h-3" />
                          <span>Registered ✓</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold">
                          <span>Pending Biometrics</span>
                        </span>
                      )}
                    </td>

                    {/* Active/Inactive */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          staff.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {staff.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => onOpenFaceRegister(staff)}
                          title="Register or Update Face Biometrics"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onViewProfile(staff)}
                          title="View Attendance History & Profile"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(staff)}
                          title="Edit Staff Information & Photo"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(staff)}
                          title={staff.status === 'ACTIVE' ? 'Deactivate Staff' : 'Reactivate Staff'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            staff.status === 'ACTIVE'
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-500 hover:bg-emerald-50'
                          }`}
                        >
                          {staff.status === 'ACTIVE' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingStaff ? `Edit Staff Member (${editingStaff.employee_id})` : 'Add New Hospital Staff'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configure clinical credentials and upload an authentic profile image.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Profile Image Uploader (Zero Default Stock Photos!) */}
              <StaffImageUploader
                currentImageUrl={formData.avatar_url}
                staffName={formData.name || 'Staff Member'}
                onImageSelected={(url) => setFormData({ ...formData, avatar_url: url })}
                onImageRemoved={() => setFormData({ ...formData, avatar_url: '' })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Employee ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BH-1058"
                    disabled={!!editingStaff}
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Staff Nurse"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="staff@hospital.ai"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Shift Start & End */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shift Start (HH:MM)
                  </label>
                  <input
                    type="time"
                    value={formData.shift_start}
                    onChange={(e) => setFormData({ ...formData, shift_start: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shift End (HH:MM)
                  </label>
                  <input
                    type="time"
                    value={formData.shift_end}
                    onChange={(e) => setFormData({ ...formData, shift_end: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Weekly Off */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Weekly Off Day
                  </label>
                  <select
                    value={formData.weekly_off}
                    onChange={(e) => setFormData({ ...formData, weekly_off: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Staff Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-sm shadow-teal-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingStaff ? 'Save Changes' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
