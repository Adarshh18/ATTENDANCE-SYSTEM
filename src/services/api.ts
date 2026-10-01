import type {
  Staff,
  AttendanceRecord,
  Department,
  HospitalSettings,
  AuditLog,
  NotificationItem,
  AdminUser,
  DashboardStats,
  RecognitionResult,
} from '../types';
import { getTodayDateStr, getCurrentMonthStr } from '../utils/dateUtils';

const BASE_URL = (
  import.meta.env.VITE_API_URL || ''
).replace(/\/$/, '');

const AUTH_TOKEN_KEY = 'banaras_hospital_admin_token';

export async function loginAdmin(email: string, password: string): Promise<{ token: string; user: AdminUser }> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Authentication failed');
  }
  const data = await res.json();
  if (data.token) {
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  }
  return data;
}

export async function getCurrentAdmin(): Promise<{ user: AdminUser }> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    throw new Error('Not authenticated');
  }
  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    throw new Error('Not authenticated');
  }
  return res.json();
}

export async function logoutAdmin(): Promise<void> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => {});
}

export async function updateAdminProfile(data: {
  name?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
  avatar?: string;
}): Promise<{ success: boolean; user: AdminUser; message: string }> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const res = await fetch(`${BASE_URL}/api/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update administrator profile');
  }
  return res.json();
}

export async function fetchStaff(params?: { department?: string; status?: string; search?: string }): Promise<{ staff: Staff[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.department) query.set('department', params.department);
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);

  const res = await fetch(`${BASE_URL}/api/staff?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load staff directory');
  return res.json();
}

export async function fetchStaffById(id: string): Promise<{ staff: Staff }> {
  const res = await fetch(`${BASE_URL}/api/staff/${id}`);
  if (!res.ok) throw new Error('Failed to load staff member');
  return res.json();
}

export async function createStaff(data: Partial<Staff>): Promise<{ staff: Staff }> {
  const res = await fetch(`${BASE_URL}/api/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create staff' }));
    throw new Error(err.error || 'Failed to create staff');
  }
  return res.json();
}

export async function updateStaff(id: string, data: Partial<Staff>): Promise<{ staff: Staff }> {
  const res = await fetch(`${BASE_URL}/api/staff/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update staff' }));
    throw new Error(err.error || 'Failed to update staff');
  }
  return res.json();
}

export async function deactivateStaff(id: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/api/staff/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to deactivate staff' }));
    throw new Error(err.error || 'Failed to deactivate staff');
  }
  return res.json();
}

export async function registerStaffFace(id: string, embedding: number[], samplesCount = 4): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/api/staff/${id}/face-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embedding, samples_count: samplesCount }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Face registration failed' }));
    throw new Error(err.error || 'Face registration failed');
  }
  return res.json();
}

export async function fetchFaceProfiles(): Promise<{ profiles: Array<any> }> {
  const res = await fetch(`${BASE_URL}/api/face-profiles`);
  if (!res.ok) throw new Error('Failed to fetch biometric profiles');
  return res.json();
}

export async function matchFaceBiometrics(embedding: number[], mode: 'ENTRY' | 'EXIT', device = 'AI Camera Station 01'): Promise<RecognitionResult> {
  const res = await fetch(`${BASE_URL}/api/recognition/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embedding, mode, device }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Recognition matching failed' }));
    throw new Error(err.error || 'Recognition matching failed');
  }
  return res.json();
}

export async function fetchAttendance(params?: {
  date?: string;
  department?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ records: AttendanceRecord[]; total: number; page: number; totalPages: number }> {
  const query = new URLSearchParams();
  if (params?.date) query.set('date', params.date);
  if (params?.department) query.set('department', params.department);
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await fetch(`${BASE_URL}/api/attendance?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load attendance records');
  return res.json();
}

export async function fetchDashboardStats(date = getTodayDateStr()): Promise<{ stats: DashboardStats }> {
  const res = await fetch(`${BASE_URL}/api/attendance/stats?date=${date}`);
  if (!res.ok) throw new Error('Failed to fetch dashboard statistics');
  return res.json();
}

export async function fetchLiveFeed(): Promise<{ feed: AttendanceRecord[] }> {
  const res = await fetch(`${BASE_URL}/api/attendance/feed`);
  if (!res.ok) throw new Error('Failed to fetch live feed');
  return res.json();
}

export async function fetchStaffAttendanceHistory(id: string): Promise<{
  staff: Staff;
  records: AttendanceRecord[];
  summary: {
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalHours: string;
    averageDailyHours: string;
  };
}> {
  const res = await fetch(`${BASE_URL}/api/staff/${id}/attendance`);
  if (!res.ok) throw new Error('Failed to fetch staff attendance history');
  return res.json();
}

export async function manuallyCorrectAttendance(
  recordId: string,
  data: { entry_time?: string; exit_time?: string; notes?: string; reason: string }
): Promise<{ record: AttendanceRecord; message: string }> {
  const res = await fetch(`${BASE_URL}/api/attendance/${recordId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Correction failed' }));
    throw new Error(err.error || 'Correction failed');
  }
  return res.json();
}

export async function fetchMonthlySummary(month = getCurrentMonthStr()): Promise<{
  month: string;
  workingDays: number;
  staffCount: number;
  staffSummaries: Array<{
    staff_id: string;
    employee_id: string;
    name: string;
    department: string;
    designation: string;
    working_days: number;
    present: number;
    absent: number;
    late: number;
    early_exit: number;
    total_hours: string;
    average_daily_hours: string;
  }>;
}> {
  const res = await fetch(`${BASE_URL}/api/attendance/monthly-summary?month=${month}`);
  if (!res.ok) throw new Error('Failed to load monthly summary');
  return res.json();
}

export async function fetchDepartments(): Promise<{ departments: Department[] }> {
  const res = await fetch(`${BASE_URL}/api/departments`);
  if (!res.ok) throw new Error('Failed to load departments');
  return res.json();
}

export async function queryHospitalAi(query: string): Promise<{ answer: string; source: 'gemini' | 'local_engine' }> {
  const res = await fetch(`${BASE_URL}/api/ai/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'AI Assistant failed' }));
    throw new Error(err.error || 'AI Assistant failed');
  }
  return res.json();
}

export async function fetchSettings(): Promise<{ settings: HospitalSettings }> {
  const res = await fetch(`${BASE_URL}/api/settings`);
  if (!res.ok) throw new Error('Failed to load settings');
  return res.json();
}

export async function updateSettings(settings: Partial<HospitalSettings>): Promise<{ settings: HospitalSettings }> {
  const res = await fetch(`${BASE_URL}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function fetchAuditLogs(): Promise<{ audit_logs: AuditLog[] }> {
  const res = await fetch(`${BASE_URL}/api/audit-logs`);
  if (!res.ok) throw new Error('Failed to load audit logs');
  return res.json();
}

export async function fetchNotifications(): Promise<{ notifications: NotificationItem[] }> {
  const res = await fetch(`${BASE_URL}/api/notifications`);
  if (!res.ok) throw new Error('Failed to load notifications');
  return res.json();
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await fetch(`${BASE_URL}/api/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await fetch(`${BASE_URL}/api/notifications/mark-all-read`, { method: 'POST' });
}

export async function cleanStaffAndAttendanceDatabase(): Promise<{
  success: boolean;
  message: string;
  purgedStaffCount: number;
  purgedAttendanceCount: number;
  purgedFaceProfilesCount: number;
}> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const res = await fetch(`${BASE_URL}/api/database/clean-staff-records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to clean database');
  }
  return res.json();
}

export async function resetDatabase(): Promise<void> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  await fetch(`${BASE_URL}/api/seed/reset`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
