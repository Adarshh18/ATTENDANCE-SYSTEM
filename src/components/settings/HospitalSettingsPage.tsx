import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Clock,
  Shield,
  Camera,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Database,
  Building,
  KeyRound,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  X,
} from 'lucide-react';
import { fetchSettings, updateSettings, cleanStaffAndAttendanceDatabase, resetDatabase } from '../../services/api';
import type { HospitalSettings, AdminUser } from '../../types';

interface HospitalSettingsPageProps {
  onSettingsUpdated: () => void;
  admin?: AdminUser | null;
  onOpenAdminProfile?: () => void;
}

export const HospitalSettingsPage: React.FC<HospitalSettingsPageProps> = ({
  onSettingsUpdated,
  admin,
  onOpenAdminProfile,
}) => {
  const [settings, setSettings] = useState<HospitalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{ message: string; staffCount?: number; logsCount?: number } | null>(null);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings()
      .then((res) => {
        setSettings(res.settings);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSavedSuccess(false);

    try {
      await updateSettings(settings);
      setSaving(false);
      setSavedSuccess(true);
      onSettingsUpdated();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings:', err);
      setSaving(false);
    }
  };

  const handleCleanDatabase = async () => {
    setPurging(true);
    setPurgeError(null);
    try {
      const res = await cleanStaffAndAttendanceDatabase();
      setPurging(false);
      setIsConfirmModalOpen(false);
      setPurgeResult({
        message: res.message,
        staffCount: res.purgedStaffCount,
        logsCount: res.purgedAttendanceCount,
      });
      setResetSuccess(true);
      onSettingsUpdated();
    } catch (err: any) {
      setPurging(false);
      setPurgeError(err.message || 'Failed to clean database.');
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        Loading system configuration parameters...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Hospital System Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure shift thresholds, biometric confidence levels, timezone rules, and camera parameters.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved Successfully</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Administrator Account & Credentials (Name, Email & Password) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900">Administrator Account & Credentials</h2>
                <p className="text-[11px] text-slate-500">Manage administrator display name, login email, and portal password</p>
              </div>
            </div>
            {onOpenAdminProfile && (
              <button
                type="button"
                onClick={onOpenAdminProfile}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Update Name, Email & Password</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Current Admin Name</div>
              <div className="font-bold text-slate-900 text-sm">{admin?.name || 'Admin'}</div>
              <div className="text-[10px] text-slate-400">Displayed in audit logs and system records</div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Admin Login Email</div>
              <div className="font-bold text-slate-900 text-sm truncate">{admin?.email || 'admin@hospital.ai'}</div>
              <div className="text-[10px] text-slate-400">Used to sign in to the portal</div>
            </div>
          </div>
        </div>

        {/* Hospital Profile */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-teal-600" />
            <h2 className="font-bold text-sm text-slate-900">Hospital Institutional Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Name
              </label>
              <input
                type="text"
                value={settings.hospital_name}
                onChange={(e) => setSettings({ ...settings, hospital_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Code
              </label>
              <input
                type="text"
                value={settings.hospital_code}
                onChange={(e) => setSettings({ ...settings, hospital_code: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Timezone (Authoritative Timestamp Standard)
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST • UTC+05:30) [Configured Hospital Default]</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (EST • UTC-05:00)</option>
                <option value="Europe/London">Europe/London (GMT • UTC+00:00)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST • UTC+04:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT • UTC+08:00)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Attendance & Shift Rules */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-sm text-slate-900">Attendance & Shift Business Rules</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Shift Start (HH:MM)
              </label>
              <input
                type="time"
                value={settings.default_shift_start}
                onChange={(e) => setSettings({ ...settings, default_shift_start: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Shift End (HH:MM)
              </label>
              <input
                type="time"
                value={settings.default_shift_end}
                onChange={(e) => setSettings({ ...settings, default_shift_end: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Late Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={settings.grace_period_minutes}
                onChange={(e) => setSettings({ ...settings, grace_period_minutes: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-400">Arrival after 09:15 recorded as Late</span>
            </div>
          </div>
        </div>

        {/* Biometric & Computer Vision Configuration */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Camera className="w-5 h-5 text-cyan-600" />
            <h2 className="font-bold text-sm text-slate-900">Biometric & Camera Processing Engine</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recognition Similarity Threshold (0.50 - 0.95)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                max="0.95"
                value={settings.recognition_threshold}
                onChange={(e) => setSettings({ ...settings, recognition_threshold: parseFloat(e.target.value) || 0.72 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-400">
                Current: {Math.round(settings.recognition_threshold * 100)}% match required to authenticate.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Duplicate Detection Cooldown (Seconds)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={settings.cooldown_seconds}
                onChange={(e) => setSettings({ ...settings, cooldown_seconds: parseInt(e.target.value, 10) || 45 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-400">
                Prevents repeated recognition triggers within window.
              </span>
            </div>

            <div className="sm:col-span-2 pt-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.liveness_detection}
                  onChange={(e) => setSettings({ ...settings, liveness_detection: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Enable Optical Anti-Spoofing & Liveness Verification
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Inspects micro-variations and eye-blink dynamics across camera frames to deter static photos.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/30 flex items-center space-x-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Configuration</span>
          </button>
        </div>
      </form>

      {/* Database Maintenance & Clean System Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                Database Maintenance: Clean Staff & Attendance Records
              </h2>
              <p className="text-[11px] text-slate-500">
                Wipe all registered staff and punch records to start fresh, while strictly keeping admin credentials.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setPurgeError(null);
              setIsConfirmModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center space-x-2 self-start sm:self-auto cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clean Database & Start Fresh</span>
          </button>
        </div>

        {/* Protection & Purge Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Admin Protection Guarantee */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Admin Details Strictly Preserved</span>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              Your administrator credentials (<span className="font-semibold text-emerald-950 font-mono">{admin?.email || 'admin@hospital.ai'}</span> and password) are <strong>never erased or altered</strong>. You remain logged in with full administrative privileges.
            </p>
            <div className="text-[10px] text-emerald-700 font-medium pt-1">
              ✓ Admin login active • Hospital parameters preserved
            </div>
          </div>

          {/* Records That Will Be Cleaned */}
          <div className="p-4 bg-rose-50/60 border border-rose-200/70 rounded-2xl space-y-2">
            <div className="flex items-center space-x-2 text-rose-800 font-bold">
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Records Cleaned to Start Fresh</span>
            </div>
            <ul className="text-[11px] text-rose-900 space-y-1 list-disc list-inside">
              <li>All registered staff members & employee profiles</li>
              <li>All facial recognition biometric models & vectors</li>
              <li>All attendance punch logs (entries, exits, shifts)</li>
            </ul>
          </div>
        </div>

        {/* Success Notice */}
        {purgeResult && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start space-x-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-emerald-950">Database Cleaned Successfully!</div>
              <p className="text-[11px] text-emerald-800 mt-0.5">{purgeResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={() => !purging && setIsConfirmModalOpen(false)}
                disabled={purging}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Clean Staff & Attendance Database?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                This will delete all staff records, facial biometric templates, and attendance punch logs so the application can run fresh from new.
              </p>
            </div>

            {/* Reassurance Notice */}
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-900">
                <span className="font-bold">Admin credentials safe:</span> Your administrator email (<span className="font-mono font-semibold">{admin?.email || 'admin@hospital.ai'}</span>) and password will <strong>NOT</strong> be deleted.
              </div>
            </div>

            {purgeError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{purgeError}</span>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={purging}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCleanDatabase}
                disabled={purging}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {purging ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cleaning...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Clean & Start Fresh</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
