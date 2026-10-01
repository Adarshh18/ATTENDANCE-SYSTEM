import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  initDatabase,
  getDatabase,
  saveDatabase,
  getDashboardStats,
  recordStaffEntry,
  recordStaffExit,
  correctAttendanceRecord,
  purgeStaffAndAttendanceData,
  getTodayDateStr,
  getCurrentTimeStr,
} from './server/db';
import { askHospitalAi } from './server/ai';
import type { AttendanceRecord, HospitalSettings, Staff } from './src/types';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize the database
initDatabase();

// Connected Server-Sent Events clients for real-time dashboard and live feed updates
const sseClients: Response[] = [];

export function broadcastEvent(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// In-memory active sessions map (token -> user info)
const activeSessions = new Map<string, { id: string; name: string; email: string; role: string; avatar?: string }>();

// Cooldown tracker in memory: staffId -> last recognized timestamp (ms)
const recognitionCooldownMap = new Map<string, number>();

// --- REAL-TIME SSE ENDPOINT ---
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.push(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to HospitalAI Real-Time Stream' })}\n\n`);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// --- AUTHENTICATION ENDPOINTS ---
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const db = getDatabase();

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const admin = db.admins.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());

  // Strictly verify hashed password against database
  if (!admin || admin.password_hash !== hash) {
    return res.status(401).json({ error: 'Incorrect administrator email or password.' });
  }

  const token = `token_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  const userPayload = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    avatar: admin.avatar,
  };
  activeSessions.set(token, userPayload);

  // Audit log
  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    admin_id: admin.id,
    admin_name: admin.name,
    action: 'ADMIN_LOGIN',
    entity: 'auth',
    entity_id: admin.id,
    details: `Administrator ${admin.name} successfully logged in.`,
    created_at: new Date().toISOString(),
  });
  saveDatabase();

  res.json({ success: true, token, user: userPayload });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  const token = authHeader.replace(/^Bearer\s+/, '');
  const user = activeSessions.get(token);

  if (!user) {
    return res.status(401).json({ error: 'Not authenticated or session expired.' });
  }

  // Refresh latest name and email from database in case it was updated
  const db = getDatabase();
  const currentAdmin = db.admins.find((a) => a.id === user.id) || db.admins[0];
  if (currentAdmin) {
    user.name = currentAdmin.name;
    user.email = currentAdmin.email;
    user.avatar = currentAdmin.avatar;
  }

  res.json({ user });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/, '');
    activeSessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Update Admin Name, Email, and Password
app.put('/api/auth/profile', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/, '') : null;
  const db = getDatabase();
  const admin = db.admins[0];
  if (!admin) {
    return res.status(404).json({ error: 'Administrator account not found.' });
  }

  const { name, email, current_password, new_password, avatar } = req.body;

  // If changing password, strictly verify current password
  if (new_password) {
    if (new_password.trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }
    if (!current_password) {
      return res.status(400).json({ error: 'Current password is required to set a new password.' });
    }
    const currentHash = crypto.createHash('sha256').update(current_password).digest('hex');
    if (admin.password_hash !== currentHash) {
      return res.status(400).json({ error: 'Current password is incorrect. Please enter your correct current password.' });
    }
    // Update hashed password strictly
    admin.password_hash = crypto.createHash('sha256').update(new_password).digest('hex');
  }

  if (name && name.trim()) {
    admin.name = name.trim();
  }

  if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    admin.email = cleanEmail;
  }

  if (avatar !== undefined) {
    admin.avatar = avatar;
  }

  const updatedPayload = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    avatar: admin.avatar,
  };

  if (token) {
    activeSessions.set(token, updatedPayload);
  }

  // Audit log
  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    admin_id: admin.id,
    admin_name: admin.name,
    action: 'ADMIN_PROFILE_UPDATED',
    entity: 'admin',
    entity_id: admin.id,
    details: `Administrator credentials updated: Name: "${admin.name}", Email: "${admin.email}"${new_password ? ', password successfully updated' : ''}.`,
    created_at: new Date().toISOString(),
  });

  saveDatabase();

  res.json({
    success: true,
    user: updatedPayload,
    message: 'Administrator profile and credentials updated successfully.',
  });
});

// --- STAFF MANAGEMENT ENDPOINTS ---
app.get('/api/staff', (req: Request, res: Response) => {
  const db = getDatabase();
  const { department, status, search } = req.query as {
    department?: string;
    status?: string;
    search?: string;
  };

  let list = [...db.staff];

  if (department && department !== 'ALL') {
    list = list.filter((s) => s.department.toLowerCase() === department.toLowerCase());
  }

  if (status && status !== 'ALL') {
    list = list.filter((s) => s.status === status);
  }

  if (search) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.employee_id.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.designation.toLowerCase().includes(q)
    );
  }

  res.json({ staff: list, total: list.length });
});

app.get('/api/staff/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const staff = db.staff.find((s) => s.id === req.params.id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found.' });
  }
  res.json({ staff });
});

app.post('/api/staff', (req: Request, res: Response) => {
  const db = getDatabase();
  const {
    employee_id,
    name,
    department,
    designation,
    phone,
    email,
    shift_start,
    shift_end,
    weekly_off,
    joining_date,
    status,
    avatar_url,
  } = req.body;

  if (!employee_id || !name || !department || !designation || !phone || !email) {
    return res.status(400).json({ error: 'Required fields missing: employee_id, name, department, designation, phone, email.' });
  }

  // Check unique employee_id
  const duplicate = db.staff.find((s) => s.employee_id.toUpperCase() === employee_id.toUpperCase());
  if (duplicate) {
    return res.status(400).json({ error: `Employee ID "${employee_id}" already exists.` });
  }

  const newStaff: Staff = {
    id: `staff-${Date.now()}`,
    employee_id: employee_id.toUpperCase().trim(),
    name: name.trim(),
    department: department.trim(),
    designation: designation.trim(),
    phone: phone.trim(),
    email: email.trim(),
    shift_start: shift_start || db.settings.default_shift_start,
    shift_end: shift_end || db.settings.default_shift_end,
    weekly_off: weekly_off || 'Sunday',
    joining_date: joining_date || new Date().toISOString().split('T')[0],
    status: status || 'ACTIVE',
    avatar_url: avatar_url ? avatar_url.trim() : '',
    has_face_registered: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.staff.unshift(newStaff);

  // Audit log
  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    admin_id: 'admin-1',
    admin_name: 'Admin',
    action: 'STAFF_CREATED',
    entity: 'staff',
    entity_id: newStaff.id,
    details: `Added new staff member ${newStaff.name} with ID ${newStaff.employee_id} to ${newStaff.department}`,
    created_at: new Date().toISOString(),
  });

  saveDatabase();
  broadcastEvent('staff_updated', { action: 'create', staff: newStaff });
  res.status(201).json({ success: true, staff: newStaff });
});

app.put('/api/staff/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const staff = db.staff.find((s) => s.id === req.params.id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found.' });
  }

  const {
    name,
    department,
    designation,
    phone,
    email,
    shift_start,
    shift_end,
    weekly_off,
    status,
    avatar_url,
  } = req.body;

  if (name) staff.name = name.trim();
  if (department) staff.department = department.trim();
  if (designation) staff.designation = designation.trim();
  if (phone) staff.phone = phone.trim();
  if (email) staff.email = email.trim();
  if (shift_start) staff.shift_start = shift_start;
  if (shift_end) staff.shift_end = shift_end;
  if (weekly_off) staff.weekly_off = weekly_off;
  if (status) staff.status = status;
  if (avatar_url !== undefined) staff.avatar_url = avatar_url ? avatar_url.trim() : '';
  staff.updated_at = new Date().toISOString();

  // Audit log
  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    admin_id: 'admin-1',
    admin_name: 'Admin',
    action: 'STAFF_UPDATED',
    entity: 'staff',
    entity_id: staff.id,
    details: `Updated details for staff member ${staff.name} (${staff.employee_id})`,
    created_at: new Date().toISOString(),
  });

  saveDatabase();
  broadcastEvent('staff_updated', { action: 'update', staff });
  res.json({ success: true, staff });
});

app.delete('/api/staff/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const staffIndex = db.staff.findIndex((s) => s.id === req.params.id);
  if (staffIndex === -1) {
    return res.status(404).json({ error: 'Staff member not found.' });
  }

  const staff = db.staff[staffIndex];
  // Soft delete / deactivate to preserve historical attendance integrity
  staff.status = 'INACTIVE';
  staff.updated_at = new Date().toISOString();

  // Audit log
  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    admin_id: 'admin-1',
    admin_name: 'Administrator',
    action: 'STAFF_DEACTIVATED',
    entity: 'staff',
    entity_id: staff.id,
    details: `Deactivated staff member ${staff.name} (${staff.employee_id}). Historical records retained.`,
    created_at: new Date().toISOString(),
  });

  saveDatabase();
  broadcastEvent('staff_updated', { action: 'deactivate', staff });
  res.json({ success: true, message: `Staff member ${staff.name} has been deactivated.` });
});

// --- FACE REGISTRATION & RECOGNITION PIPELINE ---
app.post('/api/staff/:id/face-profile', (req: Request, res: Response) => {
  const db = getDatabase();
  const staff = db.staff.find((s) => s.id === req.params.id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found.' });
  }

  const { embedding, samples_count } = req.body;
  if (!embedding || !Array.isArray(embedding) || embedding.length < 32) {
    return res.status(400).json({ error: 'Invalid face embedding vector provided.' });
  }

  // Normalize vector to unit length
  let sumSq = 0;
  for (const v of embedding) sumSq += v * v;
  const norm = Math.sqrt(sumSq) || 1;
  const normalizedVector = embedding.map((v) => Number((v / norm).toFixed(6)));

  const existingProfile = db.face_profiles.find((p) => p.staff_id === staff.id);
  if (existingProfile) {
    existingProfile.embedding = normalizedVector;
    existingProfile.samples_count = samples_count || 4;
    existingProfile.updated_at = new Date().toISOString();
  } else {
    db.face_profiles.push({
      id: `face-prof-${Date.now()}`,
      staff_id: staff.id,
      employee_id: staff.employee_id,
      embedding: normalizedVector,
      samples_count: samples_count || 4,
      model_version: 'v1.4-hospital-normalized-128',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  staff.has_face_registered = true;
  staff.updated_at = new Date().toISOString();

  // Audit log
  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    admin_id: 'admin-1',
    admin_name: 'Administrator',
    action: 'FACE_REGISTERED',
    entity: 'face_profiles',
    entity_id: staff.id,
    details: `Facial representation registered (${samples_count || 4} multi-angle biometric samples) for ${staff.name} (${staff.employee_id})`,
    created_at: new Date().toISOString(),
  });

  saveDatabase();
  broadcastEvent('face_registered', { staffId: staff.id, employee_id: staff.employee_id });
  res.json({ success: true, message: 'Face representation registered successfully.' });
});

// Retrieve all registered face embeddings for comparison
app.get('/api/face-profiles', (_req: Request, res: Response) => {
  const db = getDatabase();
  const profiles = db.face_profiles.map((p) => {
    const s = db.staff.find((st) => st.id === p.staff_id);
    return {
      id: p.id,
      staff_id: p.staff_id,
      employee_id: p.employee_id,
      name: s?.name || 'Unknown',
      department: s?.department || '',
      designation: s?.designation || '',
      status: s?.status || 'INACTIVE',
      avatar_url: s?.avatar_url,
      embedding: p.embedding,
    };
  }).filter((p) => p.status === 'ACTIVE');

  res.json({ profiles });
});

// Face Recognition Match & Record Attendance
app.post('/api/recognition/match', (req: Request, res: Response) => {
  const db = getDatabase();
  const { embedding, mode = 'ENTRY', device = 'AI Camera Station 01' } = req.body;

  if (!embedding || !Array.isArray(embedding)) {
    return res.status(400).json({ error: 'Biometric feature representation is required.' });
  }

  // Normalize incoming vector
  let sumSq = 0;
  for (const v of embedding) sumSq += v * v;
  const norm = Math.sqrt(sumSq) || 1;
  const queryVector = embedding.map((v) => v / norm);

  // Compare similarity against all active registered face profiles (Cosine Similarity)
  let bestScore = -1;
  let matchedProfile: any = null;

  for (const p of db.face_profiles) {
    const staff = db.staff.find((s) => s.id === p.staff_id);
    if (!staff || staff.status !== 'ACTIVE') continue;

    let dot = 0;
    const len = Math.min(queryVector.length, p.embedding.length);
    for (let i = 0; i < len; i++) {
      dot += queryVector[i] * p.embedding[i];
    }

    if (dot > bestScore) {
      bestScore = dot;
      matchedProfile = { profile: p, staff };
    }
  }

  const threshold = db.settings.recognition_threshold || 0.72;
  const confidence = Math.max(0, Math.min(1, bestScore));

  if (confidence < threshold || !matchedProfile) {
    return res.json({
      match: false,
      confidence: Number(confidence.toFixed(2)),
      action: 'LOW_CONFIDENCE',
      message: 'Recognition confidence is too low. Please look directly at the camera.',
      timestamp: new Date().toLocaleTimeString(),
    });
  }

  const { staff } = matchedProfile;

  // Anti-duplicate cooldown check (default 45s)
  const lastRecognized = recognitionCooldownMap.get(staff.id);
  const now = Date.now();
  const cooldownMs = (db.settings.cooldown_seconds || 45) * 1000;

  if (lastRecognized && now - lastRecognized < cooldownMs) {
    return res.json({
      match: true,
      staff,
      confidence: Number(confidence.toFixed(2)),
      action: 'COOLDOWN_ACTIVE',
      message: `Already recognized recently. Anti-duplicate cooldown active (${Math.ceil((cooldownMs - (now - lastRecognized)) / 1000)}s remaining).`,
      timestamp: new Date().toLocaleTimeString(),
    });
  }

  // Process Entry or Exit
  if (mode === 'EXIT') {
    const exitResult = recordStaffExit(staff.id, confidence, device);
    if (!exitResult.success) {
      return res.json({
        match: true,
        staff,
        confidence: Number(confidence.toFixed(2)),
        action: 'NO_ACTIVE_SESSION',
        message: exitResult.message,
        timestamp: new Date().toLocaleTimeString(),
      });
    }

    recognitionCooldownMap.set(staff.id, now);
    broadcastEvent('attendance_recorded', {
      action: 'EXIT_RECORDED',
      attendance: exitResult.attendance,
      stats: getDashboardStats(),
    });

    return res.json({
      match: true,
      staff,
      confidence: Number(confidence.toFixed(2)),
      action: 'EXIT_RECORDED',
      attendance: exitResult.attendance,
      message: 'Exit verified and attendance completed.',
      timestamp: new Date().toLocaleTimeString(),
    });
  } else {
    // Mode === 'ENTRY'
    const entryResult = recordStaffEntry(staff.id, confidence, device);
    if (!entryResult.success) {
      return res.json({
        match: true,
        staff,
        confidence: Number(confidence.toFixed(2)),
        action: 'ALREADY_RECORDED',
        message: entryResult.message,
        attendance: entryResult.attendance,
        timestamp: new Date().toLocaleTimeString(),
      });
    }

    recognitionCooldownMap.set(staff.id, now);
    broadcastEvent('attendance_recorded', {
      action: 'ENTRY_RECORDED',
      attendance: entryResult.attendance,
      stats: getDashboardStats(),
    });

    return res.json({
      match: true,
      staff,
      confidence: Number(confidence.toFixed(2)),
      action: 'ENTRY_RECORDED',
      attendance: entryResult.attendance,
      message: 'Face verified. Attendance entry recorded.',
      timestamp: new Date().toLocaleTimeString(),
    });
  }
});

// --- ATTENDANCE RECORDS & DASHBOARD ENDPOINTS ---
app.get('/api/attendance', (req: Request, res: Response) => {
  const db = getDatabase();
  const todayStr = getTodayDateStr(db.settings?.timezone);
  const { date = todayStr, department, status, search, limit = '100', page = '1' } = req.query as Record<string, string>;

  let records = db.attendance.filter((a) => a.attendance_date === date);

  if (department && department !== 'ALL') {
    records = records.filter((r) => r.department.toLowerCase() === department.toLowerCase());
  }

  if (status && status !== 'ALL') {
    records = records.filter((r) => r.status === status);
  }

  if (search) {
    const q = search.toLowerCase().trim();
    records = records.filter(
      (r) =>
        r.staff_name.toLowerCase().includes(q) ||
        r.employee_id.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.designation.toLowerCase().includes(q)
    );
  }

  // Sort by entry_time descending
  records.sort((a, b) => (b.entry_time || '').localeCompare(a.entry_time || ''));

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const total = records.length;
  const paginated = records.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.json({
    records: paginated,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  });
});

app.get('/api/attendance/stats', (req: Request, res: Response) => {
  const db = getDatabase();
  const { date = getTodayDateStr(db.settings?.timezone) } = req.query as { date?: string };
  const stats = getDashboardStats(date);
  res.json({ stats });
});

app.get('/api/attendance/feed', (_req: Request, res: Response) => {
  const db = getDatabase();
  const todayStr = getTodayDateStr(db.settings?.timezone);
  const todayRecords = db.attendance
    .filter((a) => a.attendance_date === todayStr && a.entry_time !== null)
    .sort((a, b) => {
      const timeA = a.exit_time || a.entry_time || '';
      const timeB = b.exit_time || b.entry_time || '';
      return timeB.localeCompare(timeA);
    })
    .slice(0, 15);

  res.json({ feed: todayRecords });
});

// Staff Attendance History & Profile
app.get('/api/staff/:id/attendance', (req: Request, res: Response) => {
  const db = getDatabase();
  const staff = db.staff.find((s) => s.id === req.params.id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found.' });
  }

  const records = db.attendance.filter((a) => a.staff_id === staff.id);
  // Calculate lifetime / month statistics
  const presentDays = records.filter((r) => r.status === 'PRESENT' || r.status === 'CURRENTLY_INSIDE' || r.status === 'SHIFT_COMPLETED').length;
  const absentDays = records.filter((r) => r.status === 'ABSENT').length;
  const lateDays = records.filter((r) => r.is_late).length;

  let totalMinutes = 0;
  for (const r of records) {
    if (r.duration_minutes > 0) totalMinutes += r.duration_minutes;
  }
  const totalHoursFormatted = `${Math.floor(totalMinutes / 60)}h ${(totalMinutes % 60).toString().padStart(2, '0')}m`;
  const avgMins = presentDays > 0 ? Math.round(totalMinutes / presentDays) : 480;
  const avgDailyFormatted = `${Math.floor(avgMins / 60)}h ${(avgMins % 60).toString().padStart(2, '0')}m`;

  res.json({
    staff,
    records,
    summary: {
      presentDays,
      absentDays,
      lateDays,
      totalHours: totalHoursFormatted,
      averageDailyHours: avgDailyFormatted,
    },
  });
});

// Manual Correction Endpoint
app.put('/api/attendance/:id', (req: Request, res: Response) => {
  const { entry_time, exit_time, notes, reason } = req.body;
  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: 'A valid reason for manual attendance correction is mandatory for audit logging.' });
  }

  const result = correctAttendanceRecord(req.params.id, {
    entry_time,
    exit_time,
    notes,
    reason: reason.trim(),
    admin_name: 'Admin',
  });

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  broadcastEvent('attendance_updated', { record: result.record, stats: getDashboardStats() });
  res.json({ success: true, message: result.message, record: result.record });
});

// Monthly Automatic Attendance Report Endpoint
app.get('/api/attendance/monthly-summary', (req: Request, res: Response) => {
  const db = getDatabase();
  const currentMonth = getTodayDateStr(db.settings?.timezone).substring(0, 7);
  const { month = currentMonth } = req.query as { month?: string };

  const activeStaff = db.staff.filter((s) => s.status === 'ACTIVE');
  const monthRecords = db.attendance.filter((a) => a.attendance_date.startsWith(month));

  const staffSummaries = activeStaff.map((staff) => {
    const sRecords = monthRecords.filter((r) => r.staff_id === staff.id);
    const present = sRecords.filter((r) => r.entry_time !== null && r.status !== 'ABSENT' && r.status !== 'WEEKLY_OFF').length;
    const absent = sRecords.filter((r) => r.status === 'ABSENT').length;
    const late = sRecords.filter((r) => r.is_late).length;
    const earlyExit = sRecords.filter((r) => r.is_early_exit).length;

    let totalMins = 0;
    for (const r of sRecords) {
      if (r.duration_minutes > 0) totalMins += r.duration_minutes;
    }

    const totalHours = `${Math.floor(totalMins / 60)}h ${(totalMins % 60).toString().padStart(2, '0')}m`;
    const avgMins = present > 0 ? Math.round(totalMins / present) : 480;
    const avgDaily = `${Math.floor(avgMins / 60)}h ${(avgMins % 60).toString().padStart(2, '0')}m`;

    return {
      staff_id: staff.id,
      employee_id: staff.employee_id,
      name: staff.name,
      department: staff.department,
      designation: staff.designation,
      working_days: 26,
      present,
      absent,
      late,
      early_exit: earlyExit,
      total_hours: totalHours,
      total_minutes: totalMins,
      average_daily_hours: avgDaily,
    };
  });

  res.json({
    month,
    workingDays: 26,
    staffCount: activeStaff.length,
    staffSummaries,
  });
});

// --- DEPARTMENTS & ANALYTICS ---
app.get('/api/departments', (_req: Request, res: Response) => {
  const db = getDatabase();
  const todayStr = getTodayDateStr(db.settings?.timezone);
  const todayRecords = db.attendance.filter((a) => a.attendance_date === todayStr);

  const departmentsWithStats = db.departments.map((d) => {
    const dStaff = db.staff.filter((s) => s.department === d.name && s.status === 'ACTIVE');
    const presentCount = todayRecords.filter(
      (a) => a.department === d.name && a.entry_time !== null && a.status !== 'ABSENT'
    ).length;
    const insideCount = todayRecords.filter(
      (a) => a.department === d.name && a.entry_time !== null && a.exit_time === null
    ).length;

    return {
      ...d,
      total_staff: dStaff.length,
      present_today: presentCount,
      currently_inside: insideCount,
      attendance_percentage: dStaff.length > 0 ? Math.round((presentCount / dStaff.length) * 100) : 0,
    };
  });

  res.json({ departments: departmentsWithStats });
});

// --- AI ASSISTANT ENDPOINT ---
app.post('/api/ai/query', async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query string is required.' });
  }

  try {
    const result = await askHospitalAi(query);
    res.json(result);
  } catch (err: any) {
    console.error('Error answering AI query:', err);
    res.status(500).json({ error: 'Failed to process AI query.', details: err.message });
  }
});

// --- AUDIT LOGS & NOTIFICATIONS ---
app.get('/api/audit-logs', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({ audit_logs: db.audit_logs.slice(0, 50) });
});

app.get('/api/notifications', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({ notifications: db.notifications.slice(0, 30) });
});

app.patch('/api/notifications/:id/read', (req: Request, res: Response) => {
  const db = getDatabase();
  const notif = db.notifications.find((n) => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    saveDatabase();
  }
  res.json({ success: true });
});

app.post('/api/notifications/mark-all-read', (_req: Request, res: Response) => {
  const db = getDatabase();
  for (const n of db.notifications) n.read = true;
  saveDatabase();
  res.json({ success: true });
});

// --- SETTINGS ENDPOINTS ---
app.get('/api/settings', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({ settings: db.settings });
});

app.put('/api/settings', (req: Request, res: Response) => {
  const db = getDatabase();
  const updates: Partial<HospitalSettings> = req.body;

  db.settings = {
    ...db.settings,
    ...updates,
  };

  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    admin_id: 'admin-1',
    admin_name: 'Administrator',
    action: 'SETTINGS_UPDATED',
    entity: 'settings',
    entity_id: 'hospital-config',
    details: 'Hospital attendance parameters and business rules updated.',
    created_at: new Date().toISOString(),
  });

  saveDatabase();
  res.json({ success: true, settings: db.settings });
});

// --- RESET / CLEAN DATABASE ENDPOINTS ---
// Clean all staff and attendance records while strictly preserving Administrator credentials
app.post('/api/database/clean-staff-records', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  let adminUser: { id?: string; name?: string } | undefined;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/, '');
    const user = activeSessions.get(token);
    if (user) adminUser = { id: user.id, name: user.name };
  }

  const result = purgeStaffAndAttendanceData(adminUser);

  // Clear in-memory recognition cooldowns
  recognitionCooldownMap.clear();

  // Broadcast real-time SSE updates
  broadcastEvent('staff_updated', { action: 'purged' });
  broadcastEvent('attendance_recorded', {
    action: 'purged',
    stats: getDashboardStats(),
  });

  res.json({
    success: true,
    message: `All staff records (${result.purgedStaffCount}) and attendance logs (${result.purgedAttendanceCount}) have been cleaned. The system is running fresh from new. Your administrator login credentials remain completely unchanged.`,
    purgedStaffCount: result.purgedStaffCount,
    purgedAttendanceCount: result.purgedAttendanceCount,
    purgedFaceProfilesCount: result.purgedFaceProfilesCount,
  });
});

app.post('/api/seed/reset', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  let adminUser: { id?: string; name?: string } | undefined;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/, '');
    const user = activeSessions.get(token);
    if (user) adminUser = { id: user.id, name: user.name };
  }

  const result = purgeStaffAndAttendanceData(adminUser);

  recognitionCooldownMap.clear();
  broadcastEvent('staff_updated', { action: 'purged' });
  broadcastEvent('attendance_recorded', {
    action: 'purged',
    stats: getDashboardStats(),
  });

  res.json({
    success: true,
    message: `Database cleaned. Purged ${result.purgedStaffCount} staff and ${result.purgedAttendanceCount} attendance logs. Administrator email and password were kept intact.`,
    purgedStaffCount: result.purgedStaffCount,
    purgedAttendanceCount: result.purgedAttendanceCount,
  });
});

// --- VITE & STATIC FILES SERVING ---
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HospitalAI backend running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting HospitalAI server:', err);
});
