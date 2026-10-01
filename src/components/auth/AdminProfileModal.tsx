import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { updateAdminProfile } from '../../services/api';
import type { AdminUser } from '../../types';

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin: AdminUser | null;
  onProfileUpdated: (updatedUser: AdminUser) => void;
}

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({
  isOpen,
  onClose,
  admin,
  onProfileUpdated,
}) => {
  const [name, setName] = useState(admin?.name || 'Admin');
  const [email, setEmail] = useState(admin?.email || 'admin@hospital.ai');

  // Password fields
  const [changePassword, setChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && admin) {
      setName(admin.name);
      setEmail(admin.email);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePassword(false);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, admin]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setError('Admin name cannot be empty.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid official email address.');
      return;
    }

    if (changePassword) {
      if (!currentPassword) {
        setError('Please enter your current password to authorize changing password.');
        return;
      }
      if (!newPassword) {
        setError('Please enter a new password.');
        return;
      }
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New password and confirm password do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload: {
        name: string;
        email: string;
        current_password?: string;
        new_password?: string;
      } = {
        name: name.trim(),
        email: email.trim(),
      };

      if (changePassword && newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const res = await updateAdminProfile(payload);
      onProfileUpdated(res.user);
      setSuccessMessage('Administrator profile & credentials updated successfully!');
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePassword(false);

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'Failed to update administrator profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 leading-tight">
                Admin Account & Credentials
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Update administrator name, login email, and portal password.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Admin Name Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Administrator Display Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Admin or Dr. Name"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Shown across the BANARAS HOSPITAL portal header, audit logs, and reports.
            </p>
          </div>

          {/* Admin Email Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Administrator Login Email *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@hospital.ai"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Used to authenticate into the clinical administration portal.
            </p>
          </div>

          {/* Password Section Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">Change Admin Password</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={changePassword}
                  onChange={(e) => setChangePassword(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            {changePassword && (
              <div className="mt-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-150">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Current Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Password (Min 6 characters) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new strong password"
                      className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-sm shadow-teal-600/30 flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{loading ? 'Saving...' : 'Save Admin Details'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
