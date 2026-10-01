import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  Staff,
  FaceProfile,
  AttendanceRecord,
  Department,
  HospitalSettings,
  AuditLog,
  NotificationItem,
  AdminUser,
  DashboardStats,
} from '../src/types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'hospital_db.json');

interface DatabaseSchema {
  admins: (AdminUser & { password_hash: string })[];
  departments: Department[];
  staff: Staff[];
  face_profiles: FaceProfile[];
  attendance: AttendanceRecord[];
  audit_logs: AuditLog[];
  notifications: NotificationItem[];
  settings: HospitalSettings;
}

// In-memory cache synced with disk
let db: DatabaseSchema | null = null;

const DEFAULT_SETTINGS: HospitalSettings = {
  hospital_name: 'BANARAS HOSPITAL',
  hospital_code: 'BH-AI',
  tagline: 'Intelligent Staff Attendance & Workforce Monitoring',
  timezone: 'Asia/Kolkata',
  default_shift_start: '09:00',
  default_shift_end: '17:00',
  grace_period_minutes: 15,
  recognition_threshold: 0.72,
  cooldown_seconds: 45,
  camera_resolution: '1280x720',
  liveness_detection: true,
  working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

// Generate deterministic normalized embedding for seed staff (128-d unit vector)
function generateSeedEmbedding(seedStr: string): number[] {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const vec: number[] = [];
  let sumSq = 0;
  for (let i = 0; i < 128; i++) {
    // Pseudo-random deterministic component
    const val = Math.sin(hash + i * 1.6180339887) * Math.cos(i * 0.314159);
    vec.push(val);
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  return vec.map((v) => Number((v / norm).toFixed(6)));
}

function calculateDuration(entryTimeStr: string, exitTimeStr: string): { minutes: number; formatted: string } {
  const [eH, eM, eS = 0] = entryTimeStr.split(':').map(Number);
  const [xH, xM, xS = 0] = exitTimeStr.split(':').map(Number);
  let totalMinutes = (xH * 60 + xM) - (eH * 60 + eM);
  if (totalMinutes < 0) totalMinutes = 0;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return {
    minutes: totalMinutes,
    formatted: `${hours}h ${mins.toString().padStart(2, '0')}m`,
  };
}

function getSeedData(): DatabaseSchema {
  const departments: Department[] = [
    { id: 'dept-1', name: 'Emergency Medicine', code: 'EMR', description: '24/7 Trauma and Acute Care Unit' },
    { id: 'dept-2', name: 'Intensive Care Unit (ICU)', code: 'ICU', description: 'Critical Care & Life Support' },
    { id: 'dept-3', name: 'Cardiology & Surgery', code: 'CDS', description: 'Cardiovascular Intervention & Operative Care' },
    { id: 'dept-4', name: 'Pharmacy Services', code: 'PHM', description: 'Inpatient and Outpatient Dispensing' },
    { id: 'dept-5', name: 'Pediatrics & Neonatal', code: 'PED', description: 'Infant, Child and Adolescent Care' },
    { id: 'dept-6', name: 'Radiology & Imaging', code: 'RAD', description: 'CT, MRI, Digital X-Ray and Sonography' },
    { id: 'dept-7', name: 'Pathology & Diagnostics', code: 'PTH', description: 'Biochemistry and Microbiology Labs' },
    { id: 'dept-8', name: 'Hospital Administration', code: 'ADM', description: 'Operations, Billing and Clinical HR' },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: `audit-${Date.now()}`,
      admin_id: 'admin-1',
      admin_name: 'Admin',
      action: 'SYSTEM_INITIALIZATION',
      entity: 'HospitalAI Core',
      entity_id: 'SYS-001',
      details: 'Hospital attendance biometric monitoring system initialized with Asia/Kolkata timezone. Clean staff directory ready for registration.',
      created_at: new Date().toISOString(),
    },
  ];

  return {
    admins: [
      {
        id: 'admin-1',
        name: 'Admin',
        email: 'admin@hospital.ai',
        role: 'Super Administrator',
        avatar: '',
        password_hash: crypto.createHash('sha256').update('Admin@123').digest('hex'),
      },
    ],
    departments,
    staff: [],
    face_profiles: [],
    attendance: [],
    audit_logs: auditLogs,
    notifications: [],
    settings: DEFAULT_SETTINGS,
  };
}

export function initDatabase(): DatabaseSchema {
  if (db) return db;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(content);
      return db!;
    }
  } catch (err) {
    console.warn('Failed to load existing DB file, seeding clean database:', err);
  }

  db = getSeedData();
  saveDatabase();
  return db;
}

export function getDatabase(): DatabaseSchema {
  if (!db) {
    return initDatabase();
  }
  return db;
}

export function saveDatabase(): void {
  if (!db) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

// Helper functions for dynamic local Date & Time (Asia/Kolkata default)
export function getTodayDateStr(timeZone = 'Asia/Kolkata'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

export function getCurrentTimeStr(timeZone = 'Asia/Kolkata'): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());
  } catch {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  }
}

// Attendance Queries & Transactions
export function getDashboardStats(dateStr?: string): DashboardStats {
  const currentDb = getDatabase();
  const targetDate = dateStr || getTodayDateStr(currentDb.settings?.timezone || 'Asia/Kolkata');
  const activeStaff = currentDb.staff.filter((s) => s.status === 'ACTIVE');
  const totalStaff = activeStaff.length;

  const todayRecords = currentDb.attendance.filter(
    (a) => a.attendance_date === targetDate && a.entry_time !== null && a.status !== 'WEEKLY_OFF' && a.status !== 'ABSENT'
  );

  const presentToday = todayRecords.length;
  const absentToday = Math.max(0, totalStaff - presentToday);
  const currentlyInside = currentDb.attendance.filter(
    (a) => a.attendance_date === targetDate && a.entry_time !== null && a.exit_time === null
  ).length;
  const shiftCompleted = currentDb.attendance.filter(
    (a) => a.attendance_date === targetDate && a.exit_time !== null
  ).length;
  const lateArrivals = currentDb.attendance.filter(
    (a) => a.attendance_date === targetDate && a.is_late
  ).length;

  const attendanceRate = totalStaff > 0 ? Math.round((presentToday / totalStaff) * 100) : 0;

  let totalMinutes = 0;
  let count = 0;
  for (const r of currentDb.attendance.filter((a) => a.attendance_date === targetDate && a.duration_minutes > 0)) {
    totalMinutes += r.duration_minutes;
    count++;
  }
  const avgMins = count > 0 ? Math.round(totalMinutes / count) : 480;
  const avgHours = `${Math.floor(avgMins / 60)}h ${(avgMins % 60).toString().padStart(2, '0')}m`;

  return {
    totalStaff,
    presentToday,
    absentToday,
    currentlyInside,
    shiftCompleted,
    lateArrivals,
    attendanceRate,
    averageWorkingHours: avgHours,
  };
}

// Record Entry
export function recordStaffEntry(
  staffId: string,
  confidence: number,
  device = 'Entry Camera 01 (Main Gate)'
): { success: boolean; message: string; attendance?: AttendanceRecord; staff?: Staff } {
  const currentDb = getDatabase();
  const staff = currentDb.staff.find((s) => s.id === staffId);
  if (!staff) {
    return { success: false, message: 'Staff member not found.' };
  }
  if (staff.status !== 'ACTIVE') {
    return { success: false, message: `Staff member ${staff.name} is currently inactive.` };
  }

  const tz = currentDb.settings?.timezone || 'Asia/Kolkata';
  const todayStr = getTodayDateStr(tz);
  const timeStr = getCurrentTimeStr(tz);

  // Check existing attendance for today
  const existing = currentDb.attendance.find(
    (a) => a.staff_id === staffId && a.attendance_date === todayStr
  );

  if (existing) {
    if (existing.entry_time && !existing.exit_time) {
      return {
        success: false,
        message: `${staff.name} is already checked in at ${existing.entry_time}. Currently inside.`,
        attendance: existing,
        staff,
      };
    }
    if (existing.exit_time) {
      return {
        success: false,
        message: `Shift already completed for today (${existing.duration_formatted} worked).`,
        attendance: existing,
        staff,
      };
    }
  }

  // Calculate late status based on settings
  const shiftStart = staff.shift_start || currentDb.settings.default_shift_start;
  const [sH, sM] = shiftStart.split(':').map(Number);
  const graceMinutes = currentDb.settings.grace_period_minutes;
  const limitTotalMinutes = sH * 60 + sM + graceMinutes;

  const [currH, currM] = timeStr.split(':').map(Number);
  const currentTotalMinutes = currH * 60 + currM;
  const isLate = currentTotalMinutes > limitTotalMinutes;

  const newRecord: AttendanceRecord = {
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    staff_id: staff.id,
    employee_id: staff.employee_id,
    staff_name: staff.name,
    department: staff.department,
    designation: staff.designation,
    attendance_date: todayStr,
    entry_time: timeStr,
    exit_time: null,
    duration_minutes: 0,
    duration_formatted: 'In Progress',
    status: isLate ? 'LATE' : 'CURRENTLY_INSIDE',
    is_late: isLate,
    is_early_exit: false,
    entry_confidence: Number(confidence.toFixed(2)),
    exit_confidence: null,
    entry_device: device,
    exit_device: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  currentDb.attendance.unshift(newRecord);

  // Add notification
  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    type: isLate ? 'late' : 'entry',
    title: isLate ? 'Late Entry Recorded' : 'Entry Recorded',
    message: `${staff.name} (${staff.employee_id}) verified at ${device} (${timeStr})${isLate ? ' - LATE' : ''}`,
    timestamp: timeStr,
    read: false,
    staff_id: staff.id,
    employee_id: staff.employee_id,
  };
  currentDb.notifications.unshift(notif);

  // Audit log
  currentDb.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    admin_id: 'system',
    admin_name: 'AI Camera Automation',
    action: 'ATTENDANCE_ENTRY',
    entity: 'attendance',
    entity_id: newRecord.id,
    details: `Biometric attendance entry recorded for ${staff.name} (${staff.employee_id}) with confidence ${confidence.toFixed(2)}`,
    created_at: new Date().toISOString(),
  });

  saveDatabase();
  return { success: true, message: 'Entry recorded successfully.', attendance: newRecord, staff };
}

// Record Exit
export function recordStaffExit(
  staffId: string,
  confidence: number,
  device = 'Exit Camera 01 (Main Gate)'
): { success: boolean; message: string; attendance?: AttendanceRecord; staff?: Staff } {
  const currentDb = getDatabase();
  const staff = currentDb.staff.find((s) => s.id === staffId);
  if (!staff) {
    return { success: false, message: 'Staff member not found.' };
  }

  const tz = currentDb.settings?.timezone || 'Asia/Kolkata';
  const todayStr = getTodayDateStr(tz);
  const timeStr = getCurrentTimeStr(tz);

  const existing = currentDb.attendance.find(
    (a) => a.staff_id === staffId && a.attendance_date === todayStr && a.entry_time !== null
  );

  if (!existing || existing.exit_time) {
    return {
      success: false,
      message: 'NO ACTIVE ATTENDANCE SESSION. Please contact the administrator.',
      staff,
    };
  }

  const duration = calculateDuration(existing.entry_time!, timeStr);
  const shiftEnd = staff.shift_end || currentDb.settings.default_shift_end;
  const [endH, endM] = shiftEnd.split(':').map(Number);
  const [currH, currM] = timeStr.split(':').map(Number);
  const isEarly = currH * 60 + currM < endH * 60 + endM;

  existing.exit_time = timeStr;
  existing.duration_minutes = duration.minutes;
  existing.duration_formatted = duration.formatted;
  existing.status = 'SHIFT_COMPLETED';
  existing.is_early_exit = isEarly;
  existing.exit_confidence = Number(confidence.toFixed(2));
  existing.exit_device = device;
  existing.updated_at = new Date().toISOString();

  // Notification
  currentDb.notifications.unshift({
    id: `notif-${Date.now()}`,
    type: 'exit',
    title: 'Exit Verified & Shift Completed',
    message: `${staff.name} (${staff.employee_id}) exit recorded. Worked ${duration.formatted}.`,
    timestamp: timeStr,
    read: false,
    staff_id: staff.id,
    employee_id: staff.employee_id,
  });

  // Audit log
  currentDb.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    admin_id: 'system',
    admin_name: 'AI Camera Automation',
    action: 'ATTENDANCE_EXIT',
    entity: 'attendance',
    entity_id: existing.id,
    details: `Biometric exit recorded for ${staff.name} (${staff.employee_id}). Worked: ${duration.formatted}`,
    created_at: new Date().toISOString(),
  });

  saveDatabase();
  return { success: true, message: 'Exit recorded successfully.', attendance: existing, staff };
}

// Manual Correction
export function correctAttendanceRecord(
  recordId: string,
  updates: {
    entry_time?: string;
    exit_time?: string;
    notes?: string;
    reason: string;
    admin_name: string;
  }
): { success: boolean; message: string; record?: AttendanceRecord } {
  const currentDb = getDatabase();
  const record = currentDb.attendance.find((a) => a.id === recordId);
  if (!record) {
    return { success: false, message: 'Attendance record not found.' };
  }

  if (updates.entry_time !== undefined) {
    record.entry_time = updates.entry_time || null;
  }
  if (updates.exit_time !== undefined) {
    record.exit_time = updates.exit_time || null;
  }

  if (record.entry_time && record.exit_time) {
    const dur = calculateDuration(record.entry_time, record.exit_time);
    record.duration_minutes = dur.minutes;
    record.duration_formatted = dur.formatted;
    record.status = 'SHIFT_COMPLETED';
  } else if (record.entry_time) {
    record.status = record.is_late ? 'LATE' : 'CURRENTLY_INSIDE';
    record.duration_formatted = 'In Progress';
  }

  record.notes = updates.notes || record.notes;
  record.updated_at = new Date().toISOString();

  // Audit log entry (MANDATORY for manual correction)
  currentDb.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    admin_id: 'admin-1',
    admin_name: updates.admin_name || 'Administrator',
    action: 'MANUAL_ATTENDANCE_CORRECTION',
    entity: 'attendance',
    entity_id: record.id,
    details: `Manually corrected attendance for ${record.staff_name} (${record.employee_id}) on ${record.attendance_date}. Reason: ${updates.reason}`,
    metadata: {
      previous_entry: record.entry_time,
      previous_exit: record.exit_time,
      reason: updates.reason,
    },
    created_at: new Date().toISOString(),
  });

  saveDatabase();
  return { success: true, message: 'Attendance record updated successfully.', record };
}

// Clean / Purge all staff and attendance records while strictly preserving Administrator credentials
export function purgeStaffAndAttendanceData(adminUser?: { id?: string; name?: string }): {
  purgedStaffCount: number;
  purgedAttendanceCount: number;
  purgedFaceProfilesCount: number;
} {
  const currentDb = getDatabase();
  const staffCount = currentDb.staff.length;
  const attendanceCount = currentDb.attendance.length;
  const faceProfilesCount = currentDb.face_profiles.length;

  // Preserve administrator accounts & credentials exactly as they are
  const activeAdmins = currentDb.admins && currentDb.admins.length > 0 ? currentDb.admins : [];

  // Reset staff and attendance records to start clean
  currentDb.staff = [];
  currentDb.face_profiles = [];
  currentDb.attendance = [];

  // Re-initialize clean notifications
  currentDb.notifications = [
    {
      id: `notif-${Date.now()}`,
      title: 'Database Reset & Staff Purge Complete',
      message: `Staff directory and attendance records were successfully purged (${staffCount} staff, ${attendanceCount} logs). Administrator credentials remain intact. The system is running fresh from new.`,
      type: 'system',
      read: false,
      timestamp: new Date().toISOString(),
    },
  ];

  // Record audit log
  currentDb.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    admin_id: adminUser?.id || activeAdmins[0]?.id || 'admin-1',
    admin_name: adminUser?.name || activeAdmins[0]?.name || 'Administrator',
    action: 'DATABASE_STAFF_PURGED',
    entity: 'system',
    entity_id: 'SYSTEM_RESET',
    details: `Cleaned database: Purged ${staffCount} staff records, ${faceProfilesCount} biometric profiles, and ${attendanceCount} attendance logs. Administrator email and password were kept intact.`,
    created_at: new Date().toISOString(),
  });

  saveDatabase();

  return {
    purgedStaffCount: staffCount,
    purgedAttendanceCount: attendanceCount,
    purgedFaceProfilesCount: faceProfilesCount,
  };
}
