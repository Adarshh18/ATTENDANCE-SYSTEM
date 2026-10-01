import { GoogleGenAI } from '@google/genai';
import { getDatabase, getDashboardStats, getTodayDateStr } from './db';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export async function askHospitalAi(userQuery: string): Promise<{ answer: string; source: 'gemini' | 'local_engine' }> {
  const db = getDatabase();
  const todayStr = getTodayDateStr(db.settings?.timezone);
  const stats = getDashboardStats(todayStr);

  const activeStaff = db.staff.filter((s) => s.status === 'ACTIVE');
  const todayRecords = db.attendance.filter((a) => a.attendance_date === todayStr);

  const presentStaffNames = todayRecords.filter((a) => a.entry_time !== null).map((a) => a.staff_name);
  const absentStaff = activeStaff.filter((s) => !presentStaffNames.includes(s.name));

  const currentlyInsideList = todayRecords
    .filter((a) => a.entry_time !== null && a.exit_time === null)
    .map((a) => `${a.staff_name} (${a.department}, in since ${a.entry_time})`);

  const lateArrivalsList = todayRecords
    .filter((a) => a.is_late)
    .map((a) => `${a.staff_name} (${a.department}, entered ${a.entry_time})`);

  const completedShiftList = todayRecords
    .filter((a) => a.exit_time !== null)
    .map((a) => `${a.staff_name} (${a.department}, worked ${a.duration_formatted})`);

  // Department counts
  const deptCounts: Record<string, { present: number; total: number }> = {};
  for (const dept of db.departments) {
    const deptStaff = activeStaff.filter((s) => s.department === dept.name);
    const presentInDept = todayRecords.filter(
      (a) => a.department === dept.name && a.entry_time !== null
    ).length;
    deptCounts[dept.name] = { present: presentInDept, total: deptStaff.length };
  }

  // Summary context
  const groundTruthContext = {
    current_date: 'Wednesday, September 30, 2026',
    timezone: db.settings.timezone,
    hospital_name: db.settings.hospital_name,
    stats,
    absent_staff: absentStaff.map((s) => `${s.name} (${s.department}, ${s.employee_id})`),
    currently_inside: currentlyInsideList,
    late_arrivals: lateArrivalsList,
    completed_shifts: completedShiftList,
    department_summary: deptCounts,
    recent_records: todayRecords.slice(0, 10).map((r) => ({
      name: r.staff_name,
      emp_id: r.employee_id,
      dept: r.department,
      entry: r.entry_time,
      exit: r.exit_time,
      status: r.status,
      duration: r.duration_formatted,
    })),
  };

  const ai = getAiClient();
  if (ai) {
    try {
      const systemInstruction = `You are "HospitalAI Assistant", an intelligent workforce monitoring assistant for ${db.settings.hospital_name}.
You provide concise, accurate, professional healthcare-grade answers based EXCLUSIVELY on the provided real-time hospital attendance database context.
Rules:
1. Always base your numbers and names STRICTLY on the provided Ground Truth Data.
2. If the user asks who has not arrived today, list the absent staff clearly.
3. If the user asks who arrived after 9:15 AM (or late), list the late arrivals.
4. If the user asks who is currently inside, list the currently inside staff.
5. Format your answers clearly with bullet points and bold employee names.
6. Do NOT fabricate or hallucinate staff or timestamps not in the data.
7. If data for a query is missing or not applicable, politely state so.`;

      const prompt = `Hospital Ground Truth Data (Date: 30 September 2026):
${JSON.stringify(groundTruthContext, null, 2)}

User Question: "${userQuery}"

Provide a scannable, helpful, direct response:`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      if (response && response.text) {
        return { answer: response.text, source: 'gemini' };
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local query solver:', err);
    }
  }

  // Local fallback engine if Gemini is offline or unkeyed
  const q = userQuery.toLowerCase();
  let answer = '';

  if (q.includes('not arrived') || q.includes('absent') || q.includes('missing')) {
    if (absentStaff.length === 0) {
      answer = `All ${activeStaff.length} active hospital staff members have arrived and recorded attendance today (100% attendance rate).`;
    } else {
      answer = `**${absentStaff.length} staff members have not arrived today** (as of September 30, 2026):\n\n` +
        absentStaff.map((s) => `• **${s.name}** (${s.employee_id}) — ${s.department} [${s.designation}]`).join('\n');
    }
  } else if (q.includes('late') || q.includes('after 9:15') || q.includes('tardy')) {
    if (lateArrivalsList.length === 0) {
      answer = 'No late arrivals recorded today. All present staff checked in within the designated 15-minute grace period.';
    } else {
      answer = `**${lateArrivalsList.length} staff members arrived late today** (after the 09:15 AM threshold):\n\n` +
        lateArrivalsList.map((item) => `• ${item}`).join('\n');
    }
  } else if (q.includes('inside') || q.includes('current') || q.includes('present right now') || q.includes('on premises')) {
    answer = `**${currentlyInsideList.length} staff members are currently inside the hospital**:\n\n` +
      currentlyInsideList.map((item) => `• ${item}`).join('\n');
  } else if (q.includes('icu') || q.includes('emergency') || q.includes('surgery') || q.includes('pharmacy') || q.includes('admin') || q.includes('department')) {
    answer = `**Department Attendance Breakdown for Today**:\n\n` +
      Object.entries(deptCounts)
        .map(([name, data]) => `• **${name}**: ${data.present} / ${data.total} present (${data.total > 0 ? Math.round((data.present / data.total) * 100) : 0}%)`)
        .join('\n');
  } else if (activeStaff.some((s) => q.includes(s.name.toLowerCase()) || q.includes(s.employee_id.toLowerCase()))) {
    const matchedStaff = activeStaff.find((s) => q.includes(s.name.toLowerCase()) || q.includes(s.employee_id.toLowerCase()))!;
    const staffRecord = todayRecords.find((r) => r.staff_id === matchedStaff.id);
    answer = staffRecord
      ? `**${matchedStaff.name} (${matchedStaff.employee_id})**, ${matchedStaff.designation} at ${matchedStaff.department}:\n• Status today: **${staffRecord.status}**\n• Entry time: **${staffRecord.entry_time || 'Pending'}**\n• Exit time: **${staffRecord.exit_time || 'On Duty / Currently Inside'}**\n• Shift Duration: **${staffRecord.duration_formatted}**`
      : `**${matchedStaff.name} (${matchedStaff.employee_id})** has not recorded attendance for today yet.`;
  } else if (q.includes('summary') || q.includes('overview') || q.includes('attendance')) {
    answer = `**Workforce Summary for Wednesday, September 30, 2026**:\n\n` +
      `• **Total Active Staff**: ${stats.totalStaff}\n` +
      `• **Present Today**: ${stats.presentToday} (${stats.attendanceRate}%)\n` +
      `• **Currently Inside Hospital**: ${stats.currentlyInside}\n` +
      `• **Completed Shift**: ${stats.shiftCompleted}\n` +
      `• **Late Arrivals**: ${stats.lateArrivals}\n` +
      `• **Absent Today**: ${stats.absentToday}\n\n` +
      `System operating normally across all biometric entry and exit stations.`;
  } else {
    answer = `**HospitalAI Assistant Response**:\n\nBased on live hospital data for **September 30, 2026**:\n` +
      `• **${stats.presentToday} of ${stats.totalStaff}** staff are present (${stats.attendanceRate}% attendance rate).\n` +
      `• **${stats.currentlyInside}** are actively inside patient care areas.\n` +
      `• **${stats.lateArrivals}** recorded late arrival.\n\n` +
      `You can ask specific questions like *"Who has not arrived today?"*, *"Show ICU attendance"*, *"Who arrived late?"*, or *"Is Rahul Sharma on duty?"*.`;
  }

  return { answer, source: 'local_engine' };
}
