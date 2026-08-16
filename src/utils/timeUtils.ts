/** Convert "HH:mm" to total minutes since midnight */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Convert total minutes since midnight to "HH:mm" */
export function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Format "HH:mm" to "9:00 AM" style */
export function formatTime(time: string): string {
  const mins = toMinutes(time);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h < 12 ? 'AM' : 'PM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Format duration in minutes to "1h 30m" style */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Return array of "HH:mm" hour marks between start and end (inclusive of start) */
export function getHourMarks(start: string, end: string): string[] {
  const startMins = toMinutes(start);
  const endMins = toMinutes(end);
  const marks: string[] = [];
  // Round up to next full hour
  const firstHour = Math.ceil(startMins / 60) * 60;
  for (let m = firstHour; m <= endMins; m += 60) {
    marks.push(toTimeString(m));
  }
  return marks;
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Compute the percentage position of a time within a range */
export function timeToPercent(time: string, rangeStart: string, rangeEnd: string): number {
  const t = toMinutes(time);
  const s = toMinutes(rangeStart);
  const e = toMinutes(rangeEnd);
  return clamp(((t - s) / (e - s)) * 100, 0, 100);
}

/** Compute the percentage height of a duration within a range */
export function durationToPercent(durationMinutes: number, rangeStart: string, rangeEnd: string): number {
  const rangeMinutes = toMinutes(rangeEnd) - toMinutes(rangeStart);
  return clamp((durationMinutes / rangeMinutes) * 100, 0, 100);
}
