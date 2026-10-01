/**
 * Date and Time utilities for BANARAS HOSPITAL
 * Default operational timezone: Asia/Kolkata (IST)
 */

export function getTodayDateStr(timeZone = 'Asia/Kolkata'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()); // Formats as YYYY-MM-DD
  } catch {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

export function getCurrentMonthStr(timeZone = 'Asia/Kolkata'): string {
  const today = getTodayDateStr(timeZone);
  return today.substring(0, 7); // e.g. "2026-10"
}

export function getFormattedDateLabel(dateStr?: string, timeZone = 'Asia/Kolkata'): string {
  const d = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr || '';
  }
}
