import React, { useState, useEffect, useCallback } from 'react';
import { AttendanceKiosk } from './components/kiosk/AttendanceKiosk';
import { Header } from './components/layout/Header';
import { Sidebar, type NavTab } from './components/layout/Sidebar';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { AIRecognitionCenter } from './components/camera/AIRecognitionCenter';
import { StaffManagement } from './components/staff/StaffManagement';
import { AttendanceTable } from './components/attendance/AttendanceTable';
import { AttendanceCalendarView } from './components/calendar/AttendanceCalendarView';
import { DepartmentAnalytics } from './components/analytics/DepartmentAnalytics';
import { ReportGeneration } from './components/reports/ReportGeneration';
import { HospitalAiAssistant } from './components/assistant/HospitalAiAssistant';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { HospitalSettingsPage } from './components/settings/HospitalSettingsPage';
import { FaceRegistrationModal } from './components/staff/FaceRegistrationModal';
import { StaffProfileModal } from './components/staff/StaffProfileModal';
import { AdminLoginModal } from './components/auth/AdminLoginModal';
import { AdminProfileModal } from './components/auth/AdminProfileModal';
import {
  getCurrentAdmin,
  logoutAdmin,
  fetchStaff,
  fetchDepartments,
  fetchDashboardStats,
  fetchLiveFeed,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  fetchSettings,
} from './services/api';
import type {
  AdminUser,
  Staff,
  Department,
  DashboardStats,
  AttendanceRecord,
  NotificationItem,
  HospitalSettings,
} from './types';

type ViewMode = 'kiosk' | 'admin_login' | 'admin_panel';

export function App() {
  // Default view is the staff Attendance Kiosk (face recognition only)
  const [viewMode, setViewMode] = useState<ViewMode>('kiosk');

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Active view tab inside Admin Panel
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [cameraMode, setCameraMode] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Shared application state
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [liveFeed, setLiveFeed] = useState<AttendanceRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<HospitalSettings | null>(null);

  // Modal states
  const [faceRegisterStaff, setFaceRegisterStaff] = useState<Staff | null>(null);
  const [profileStaffId, setProfileStaffId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Load primary data
  const loadInitialData = useCallback(async () => {
    try {
      const [staffRes, deptRes, statsRes, feedRes, notifRes, settingsRes] = await Promise.all([
        fetchStaff(),
        fetchDepartments(),
        fetchDashboardStats(),
        fetchLiveFeed(),
        fetchNotifications(),
        fetchSettings(),
      ]);

      setStaffList(staffRes.staff);
      setDepartments(deptRes.departments);
      setStats(statsRes.stats);
      setLiveFeed(feedRes.feed);
      setNotifications(notifRes.notifications);
      setSettings(settingsRes.settings);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // Check existing auth session
    getCurrentAdmin()
      .then((res) => {
        setAdmin(res.user);
        setIsAuthenticated(true);
      })
      .catch(() => {
        setIsAuthenticated(false);
      });

    // Real-Time Server-Sent Events (SSE) Listener
    let eventSource: EventSource | null = null;
    try {
      const apiBaseUrl = (
  import.meta.env.VITE_API_URL || ''
).replace(/\/$/, '');

eventSource = new EventSource(`${apiBaseUrl}/api/events`);
      eventSource.addEventListener('attendance_recorded', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.stats) setStats(data.stats);
          fetchLiveFeed().then((res) => setLiveFeed(res.feed));
          fetchNotifications().then((res) => setNotifications(res.notifications));
        } catch {}
      });

      eventSource.addEventListener('staff_updated', () => {
        fetchStaff().then((res) => setStaffList(res.staff));
      });

      eventSource.addEventListener('face_registered', () => {
        fetchStaff().then((res) => setStaffList(res.staff));
      });
    } catch (err) {
      console.warn('SSE not initialized, relying on polling:', err);
    }

    // Periodic sync
    const interval = setInterval(() => {
      fetchDashboardStats().then((res) => setStats(res.stats)).catch(() => {});
      fetchLiveFeed().then((res) => setLiveFeed(res.feed)).catch(() => {});
      fetchNotifications().then((res) => setNotifications(res.notifications)).catch(() => {});
    }, 15000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [loadInitialData]);

  const handleOpenRecognition = (mode: 'ENTRY' | 'EXIT' = 'ENTRY') => {
    setCameraMode(mode);
    setCurrentTab('camera');
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } catch {}
    setIsAuthenticated(false);
    setAdmin(null);
    setViewMode('kiosk');
  };

  const handleLoginSuccess = (user: AdminUser) => {
    setAdmin(user);
    setIsAuthenticated(true);
    setViewMode('admin_panel');
    setCurrentTab('dashboard');
    loadInitialData();
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {}
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  // 1. DEFAULT HOME PANEL: Face Recognition Kiosk Only
  if (viewMode === 'kiosk') {
    return (
      <AttendanceKiosk
        onOpenAdminLogin={() => {
          if (isAuthenticated && admin) {
            setViewMode('admin_panel');
          } else {
            setViewMode('admin_login');
          }
        }}
        timezone={settings?.timezone || 'Asia/Kolkata'}
        onAttendanceRecorded={loadInitialData}
      />
    );
  }

  // 2. ADMIN AUTHENTICATION SCREEN
  if (viewMode === 'admin_login') {
    return (
      <AdminLoginModal
        onLoginSuccess={handleLoginSuccess}
        onCancel={() => setViewMode('kiosk')}
      />
    );
  }

  // 3. SECURE ADMIN PORTAL (Only accessible by authenticated hospital administrator)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Application Header */}
      <Header
        admin={admin}
        notifications={notifications}
        onOpenRecognition={handleOpenRecognition}
        onLogout={handleLogout}
        onOpenNotifications={() => setCurrentTab('notifications')}
        onMarkNotificationRead={handleMarkNotificationRead}
        onExitToKiosk={() => setViewMode('kiosk')}
        onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onOpenAdminProfile={() => setIsProfileModalOpen(true)}
        timezone={settings?.timezone || 'Asia/Kolkata'}
      />

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setIsMobileSidebarOpen(false);
          }}
          admin={admin}
          onLogout={handleLogout}
          onExitToKiosk={() => setViewMode('kiosk')}
          onOpenAdminProfile={() => setIsProfileModalOpen(true)}
          unreadCount={notifications.filter((n) => !n.read).length}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Dynamic Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {currentTab === 'dashboard' && (
            <DashboardOverview
              stats={stats}
              liveFeed={liveFeed}
              onOpenRecognition={handleOpenRecognition}
              onOpenAssistant={() => setCurrentTab('assistant')}
              onViewStaffProfile={(staffId) => setProfileStaffId(staffId)}
              onViewAllRecords={() => setCurrentTab('attendance')}
            />
          )}

          {currentTab === 'camera' && (
            <AIRecognitionCenter
              initialMode={cameraMode}
              registeredStaff={staffList}
              onAttendanceUpdated={loadInitialData}
            />
          )}

          {currentTab === 'staff' && (
            <StaffManagement
              staffList={staffList}
              departments={departments}
              onRefresh={loadInitialData}
              onOpenFaceRegister={(staff) => setFaceRegisterStaff(staff)}
              onViewProfile={(staff) => setProfileStaffId(staff.id)}
            />
          )}

          {currentTab === 'attendance' && (
            <AttendanceTable
              departments={departments}
              onAttendanceChanged={loadInitialData}
            />
          )}

          {currentTab === 'calendar' && (
            <AttendanceCalendarView
              staffList={staffList}
              departments={departments}
            />
          )}

          {currentTab === 'analytics' && <DepartmentAnalytics />}

          {currentTab === 'reports' && <ReportGeneration departments={departments} />}

          {currentTab === 'assistant' && <HospitalAiAssistant />}

          {currentTab === 'notifications' && (
            <NotificationCenter
              notifications={notifications}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
            />
          )}

          {currentTab === 'settings' && (
            <HospitalSettingsPage
              onSettingsUpdated={loadInitialData}
              admin={admin}
              onOpenAdminProfile={() => setIsProfileModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Admin Profile & Password Update Modal */}
      <AdminProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        admin={admin}
        onProfileUpdated={(updatedUser) => {
          setAdmin(updatedUser);
          loadInitialData();
        }}
      />

      {/* Staff Biometric Face Registration Modal */}
      {faceRegisterStaff && (
        <FaceRegistrationModal
          staff={faceRegisterStaff}
          isOpen={!!faceRegisterStaff}
          onClose={() => setFaceRegisterStaff(null)}
          onSuccess={loadInitialData}
        />
      )}

      {/* Staff Detailed Profile Modal */}
      {profileStaffId && (
        <StaffProfileModal
          staffId={profileStaffId}
          isOpen={!!profileStaffId}
          onClose={() => setProfileStaffId(null)}
          onOpenFaceRegister={(staff) => {
            setProfileStaffId(null);
            setFaceRegisterStaff(staff);
          }}
        />
      )}
    </div>
  );
}

export default App;
