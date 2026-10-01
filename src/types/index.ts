export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'EARLY_EXIT'
  | 'CURRENTLY_INSIDE'
  | 'SHIFT_COMPLETED'
  | 'ABSENT'
  | 'WEEKLY_OFF'
  | 'HOLIDAY';

export type StaffStatus = 'ACTIVE' | 'INACTIVE';

export interface Staff {
  id: string;
  employee_id: string; // e.g. "BH-1042"
  name: string;
  department: string;
  designation: string;
  phone: string;
  email: string;
  shift_start: string; // e.g. "09:00"
  shift_end: string; // e.g. "17:00"
  weekly_off: string; // e.g. "Sunday"
  joining_date: string; // e.g. "2024-03-15"
  status: StaffStatus;
  avatar_url?: string;
  has_face_registered?: boolean;
  created_at: string;
  updated_at: string;
}

export interface FaceProfile {
  id: string;
  staff_id: string;
  employee_id: string;
  embedding: number[]; // 128-dimensional normalized feature vector
  samples_count: number;
  model_version: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  staff_id: string;
  employee_id: string;
  staff_name: string;
  department: string;
  designation: string;
  attendance_date: string; // "YYYY-MM-DD" e.g. "2026-09-30"
  entry_time: string | null; // "HH:mm:ss" e.g. "09:02:17"
  exit_time: string | null; // "HH:mm:ss" e.g. "17:11:04"
  duration_minutes: number; // calculated minutes worked
  duration_formatted: string; // e.g. "8h 09m"
  status: AttendanceStatus;
  is_late: boolean;
  is_early_exit: boolean;
  entry_confidence: number | null; // e.g. 0.94
  exit_confidence: number | null; // e.g. 0.91
  entry_device: string;
  exit_device: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  head_of_department?: string;
  total_staff?: number;
}

export interface HospitalSettings {
  hospital_name: string;
  hospital_code: string;
  tagline: string;
  timezone: string; // "Asia/Kolkata"
  default_shift_start: string; // "09:00"
  default_shift_end: string; // "17:00"
  grace_period_minutes: number; // 15
  recognition_threshold: number; // 0.72
  cooldown_seconds: number; // 45
  camera_resolution: string; // "1280x720"
  liveness_detection: boolean; // true
  working_days: string[];
}

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  type: 'entry' | 'exit' | 'late' | 'alert' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  staff_id?: string;
  employee_id?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Administrator' | 'Chief Medical Officer' | 'HR Director';
  avatar?: string;
}

export interface DashboardStats {
  totalStaff: number;
  presentToday: number;
  absentToday: number;
  currentlyInside: number;
  shiftCompleted: number;
  lateArrivals: number;
  attendanceRate: number;
  averageWorkingHours: string;
}

export interface RecognitionResult {
  match: boolean;
  staff?: Staff;
  confidence: number;
  action?: 'ENTRY_RECORDED' | 'EXIT_RECORDED' | 'ALREADY_RECORDED' | 'NO_ACTIVE_SESSION' | 'LOW_CONFIDENCE' | 'COOLDOWN_ACTIVE';
  attendance?: AttendanceRecord;
  message: string;
  timestamp: string;
}
