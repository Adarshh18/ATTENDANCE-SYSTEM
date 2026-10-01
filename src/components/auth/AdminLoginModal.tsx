import React, { useState } from 'react';
import {
  Hospital,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { loginAdmin } from '../../services/api';
import type { AdminUser } from '../../types';

interface AdminLoginModalProps {
  onLoginSuccess: (user: AdminUser, token: string) => void;
  onCancel?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onLoginSuccess, onCancel }) => {
  const [email, setEmail] = useState('admin@hospital.ai');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemoHint, setShowDemoHint] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your administrator email.');
      return;
    }
    if (!password) {
      setError('Please enter your administrator password.');
      return;
    }

    setLoading(true);

    try {
      const res = await loginAdmin(email, password);
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'Incorrect administrator email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-teal-500 selection:text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-slate-200/90 relative z-10 space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-teal-500/25">
            <Hospital className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            BANARAS HOSPITAL
          </h1>
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 inline-block px-3 py-1 rounded-full border border-teal-200">
            Clinical Admin Portal
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Intelligent Staff Attendance & Workforce Monitoring
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@hospital.ai"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowDemoHint(!showDemoHint)}
                className="text-[11px] text-teal-600 hover:text-teal-700 font-medium"
              >
                Forgot password?
              </button>
            </div>
            {showDemoHint && (
              <div className="mb-2 p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-[11px] leading-relaxed">
                Initial default password is <span className="font-mono font-bold">Admin@123</span>. If you updated your password in Admin Profile, use your latest password.
              </div>
            )}
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter administrator password"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-lg shadow-teal-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span>AUTHENTICATE & ENTER PORTAL</span>
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              ← Return to Staff Attendance Kiosk
            </button>
          )}
        </form>

        <div className="pt-2 border-t border-slate-100 text-center">
          <div className="text-[11px] text-slate-500">
            Protected by BANARAS HOSPITAL Authentication Gateway
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Compliant with Hospital Biometric Privacy Standards
          </div>
        </div>
      </div>
    </div>
  );
};
