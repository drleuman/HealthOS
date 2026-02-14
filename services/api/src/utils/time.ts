export function parseTimeToDate(hhmm: string): Date {
  // Store as 1970-01-01THH:MM:00Z (naive)
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) throw new Error('Invalid time format, expected HH:MM');
  const [_, hh, mm] = m;
  return new Date(`1970-01-01T${hh}:${mm}:00Z`);
}

export function isAfter(time: Date, hh: number, mm: number): boolean {
  const t = time.getUTCHours() * 60 + time.getUTCMinutes();
  return t > (hh * 60 + mm);
}
