import React, { useState, useEffect } from 'react';
import {
  Clock,
  Bell,
  Camera,
  LogOut,
  Hospital,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Info,
  Menu,
  Shield,
  User,
} from 'lucide-react';
import type { AdminUser, NotificationItem } from '../../types';

interface HeaderProps {
  admin: AdminUser | null;
  notifications: NotificationItem[];
  onOpenRecognition: (mode?: 'ENTRY' | 'EXIT') => void;
  onLogout: () => void;
  onOpenNotifications: () => void;
  onMarkNotificationRead: (id: string) => void;
  onExitToKiosk?: () => void;
  onToggleMobileMenu?: () => void;
  onOpenAdminProfile?: () => void;
  timezone?: string;
}

export const Header: React.FC<HeaderProps> = ({
  admin,
  notifications,
  onOpenRecognition,
  onLogout,
  onOpenNotifications,
  onMarkNotificationRead,
  onExitToKiosk,
  onToggleMobileMenu,
  onOpenAdminProfile,
  timezone = 'Asia/Kolkata',
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  // Live second-by-second Clock in configured timezone (Asia/Kolkata)
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        const dateFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });

        setCurrentTime(timeFormatter.format(now));
        setCurrentDate(dateFormatter.format(now));
      } catch {
        const now = new Date();
        setCurrentTime(now.toLocaleTimeString());
        setCurrentDate(now.toLocaleDateString());
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-3 sm:px-6 lg:px-8 py-2.5 transition-all">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Hamburger menu on mobile + Hospital Brand */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 shrink-0">
              <Hospital className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">BANARAS HOSPITAL</span>
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 hidden xs:inline-block">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block leading-none mt-0.5">Clinical Attendance & Workforce Portal</p>
            </div>
          </div>
        </div>

        {/* Center: Real-Time Authoritative Clock */}
        <div className="flex items-center bg-slate-100/90 border border-slate-200/90 rounded-2xl px-2.5 sm:px-3.5 py-1.5 shadow-xs">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white flex items-center justify-center text-teal-600 shadow-xs shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse text-teal-600" />
            </div>
            <div className="text-left">
              <div className="font-mono text-xs sm:text-sm font-bold tracking-tight text-slate-900 leading-tight">
                {currentTime || '09:02:17 AM'}
              </div>
              <div className="text-[9px] sm:text-[10px] font-medium text-slate-500 leading-none hidden sm:block">
                {currentDate || '30 Sep 2026'} • IST
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Station Launcher, Notifications, Admin Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          {/* Quick Exit to Kiosk Button */}
          {onExitToKiosk && (
            <button
              onClick={onExitToKiosk}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center space-x-1.5"
              title="Lock Admin Panel & Return to Staff Attendance Kiosk"
            >
              <Camera className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Staff Kiosk</span>
            </button>
          )}

          {/* Notifications Popover */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-72 sm:w-96 rounded-2xl bg-white shadow-xl border border-slate-200/80 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-semibold text-sm text-slate-800">Live Activity Feed</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowNotifDropdown(false);
                      onOpenNotifications();
                    }}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    View All
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">No activity alerts recorded yet.</div>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => onMarkNotificationRead(n.id)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                          n.read
                            ? 'bg-slate-50/50 border-slate-100 text-slate-600'
                            : 'bg-teal-50/40 border-teal-100/80 text-slate-800'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          {n.type === 'entry' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                          {n.type === 'exit' && <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />}
                          {n.type === 'late' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                          {n.type === 'alert' && <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-slate-900 truncate">{n.title}</span>
                              <span className="text-[10px] text-slate-400 ml-2 shrink-0">{n.timestamp}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Admin Profile */}
          <div className="relative">
            <button
              onClick={() => setShowAdminMenu(!showAdminMenu)}
              className="flex items-center space-x-2 p-1 sm:pl-1.5 sm:pr-2.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
            >
              {admin?.avatar ? (
                <img
                  src={admin.avatar}
                  alt={admin?.name || 'Admin'}
                  className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-800 to-teal-700 text-white flex items-center justify-center font-bold text-xs ring-1 ring-slate-300">
                  <Shield className="w-4 h-4" />
                </div>
              )}
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {admin?.name || 'Admin'}
                </div>
                <div className="text-[10px] font-medium text-teal-600 leading-none">
                  {admin?.role || 'Super Admin'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {showAdminMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200/80 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">{admin?.name || 'Admin'}</div>
                  <div className="text-[11px] text-slate-500 truncate">{admin?.email || 'admin@hospital.ai'}</div>
                </div>
                <div className="pt-1 space-y-1">
                  {onOpenAdminProfile && (
                    <button
                      onClick={() => {
                        setShowAdminMenu(false);
                        onOpenAdminProfile();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <User className="w-4 h-4 text-teal-600" />
                      <span>Admin Profile & Password</span>
                    </button>
                  )}
                  {onExitToKiosk && (
                    <button
                      onClick={() => {
                        setShowAdminMenu(false);
                        onExitToKiosk();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <Camera className="w-4 h-4 text-teal-600" />
                      <span>Lock to Staff Kiosk</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowAdminMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
