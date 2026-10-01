import React from 'react';
import {
  LayoutDashboard,
  Camera,
  Users,
  CalendarCheck,
  CalendarDays,
  BarChart3,
  FileSpreadsheet,
  Bot,
  Bell,
  Settings,
  LogOut,
  ShieldCheck,
  Shield,
  X,
} from 'lucide-react';
import type { AdminUser } from '../../types';

export type NavTab =
  | 'dashboard'
  | 'camera'
  | 'staff'
  | 'attendance'
  | 'calendar'
  | 'analytics'
  | 'reports'
  | 'assistant'
  | 'notifications'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  admin: AdminUser | null;
  onLogout: () => void;
  onExitToKiosk?: () => void;
  onOpenAdminProfile?: () => void;
  unreadCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  admin,
  onLogout,
  onExitToKiosk,
  onOpenAdminProfile,
  unreadCount = 0,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: string | number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'camera', label: 'AI Recognition', icon: <Camera className="w-5 h-5 text-teal-600" />, badge: 'LIVE' },
    { id: 'staff', label: 'Staff Management', icon: <Users className="w-5 h-5" /> },
    { id: 'attendance', label: 'Attendance Records', icon: <CalendarCheck className="w-5 h-5" /> },
    { id: 'calendar', label: 'Workforce Calendar', icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'analytics', label: 'Department Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'reports', label: 'Reports & Export', icon: <FileSpreadsheet className="w-5 h-5" /> },
    { id: 'assistant', label: 'HospitalAI Assistant', icon: <Bot className="w-5 h-5 text-indigo-600" />, badge: 'AI' },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" />, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: 'settings', label: 'Hospital Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const handleItemClick = (id: NavTab) => {
    onSelectTab(id);
    onCloseMobile?.();
  };

  const content = (
    <div className="flex flex-col h-full justify-between select-none">
      <div className="p-4 space-y-4 sm:space-y-5 overflow-y-auto">
        {/* Mobile Header with close button */}
        <div className="flex items-center justify-between lg:hidden pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <span className="font-extrabold text-sm text-slate-900">BANARAS HOSPITAL</span>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* System Branding Sub-badge */}
        <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-semibold text-slate-800">Biometric Security</span>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            Active
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`${isActive ? 'text-white' : 'text-slate-500'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : item.badge === 'LIVE'
                        ? 'bg-teal-100 text-teal-800 animate-pulse'
                        : item.badge === 'AI'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Lock & Return to Staff Kiosk Button */}
        {onExitToKiosk && (
          <div className="pt-2">
            <button
              onClick={() => {
                onCloseMobile?.();
                onExitToKiosk();
              }}
              className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-teal-600 text-white font-bold text-xs transition-all shadow-xs"
            >
              <Camera className="w-4 h-4 text-teal-400" />
              <span>Lock to Staff Kiosk</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Administrator Info & Logout */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 shrink-0">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <button
            type="button"
            onClick={() => {
              if (onOpenAdminProfile) {
                onCloseMobile?.();
                onOpenAdminProfile();
              }
            }}
            title="Update Administrator Name, Email & Password"
            className="flex items-center space-x-2.5 text-left p-1 -ml-1 rounded-xl hover:bg-slate-100/80 transition-colors group cursor-pointer"
          >
            {admin?.avatar ? (
              <img
                src={admin.avatar}
                alt={admin?.name || 'Admin'}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-teal-700 text-white flex items-center justify-center font-bold text-xs ring-1 ring-slate-300">
                <Shield className="w-4 h-4" />
              </div>
            )}
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[110px] group-hover:text-teal-700 transition-colors">
                {admin?.name || 'Admin'}
              </div>
              <div className="text-[10px] text-teal-700 font-semibold">{admin?.role || 'Super Admin'}</div>
            </div>
          </button>
          <button
            onClick={() => {
              onCloseMobile?.();
              onLogout();
            }}
            title="Sign Out"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="text-[10px] text-center text-slate-400 font-mono">
          HospitalAI v2.4 • Node & CV
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col justify-between shrink-0 shadow-xs">
        {content}
      </aside>

      {/* Mobile Drawer (Visible when isMobileOpen is true) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <aside className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};
