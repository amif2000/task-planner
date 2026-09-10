import type { Meeting } from '../types';
import { mockMeetings } from './mockMeetings';

const COMPANION_URL = 'http://localhost:3001';
const RECHECK_INTERVAL_MS = 60_000; // re-probe companion availability every minute
const STARTUP_RETRY_COUNT = 10;
const STARTUP_RETRY_DELAY_MS = 500;

export type MeetingSource = 'outlook' | 'mock';

let _available: boolean | null = null;
let _lastCheck = 0;
let _source: MeetingSource = 'mock';
let _outlookLoaded = false;

// date string → meetings (populated after refreshMeetings())
const _cache = new Map<string, Meeting[]>();

function dateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: string };
    return body.error ?? `Meetings request failed: ${response.status}`;
  } catch {
    return `Meetings request failed: ${response.status}`;
  }
}

async function checkCompanion(): Promise<boolean> {
  const now = Date.now();
  if (_available !== null && now - _lastCheck < RECHECK_INTERVAL_MS) return _available;

  const attempts = _available === null ? STARTUP_RETRY_COUNT : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(`${COMPANION_URL}/api/health`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        _available = true;
        _lastCheck = Date.now();
        return true;
      }
    } catch {
      // The companion process may still be starting.
    }
    if (attempt < attempts - 1) await delay(STARTUP_RETRY_DELAY_MS);
  }

  _available = false;
  _lastCheck = Date.now();
  return false;
}

function populateMockCache(centreDate: Date, daysAhead: number) {
  const cursor = new Date(centreDate);
  cursor.setDate(cursor.getDate() - 1);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(centreDate);
  end.setDate(end.getDate() + daysAhead);
  end.setHours(23, 59, 59, 999);

  while (cursor <= end) {
    const key = dateToISO(cursor);
    if (!_cache.has(key)) {
      _cache.set(key, mockMeetings.filter((m) => m.dayOfWeek === cursor.getDay()));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
}

/**
 * Fetch meetings from the companion (or fall back to mock).
 * Call this on app load and when the selected date changes significantly.
 * Returns the data source used.
 */
export async function refreshMeetings(
  centreDate: Date,
  daysAhead = 14,
  force = false,
): Promise<MeetingSource> {
  const available = await checkCompanion();

  if (available) {
    try {
      // Future schedules cascade unfinished work from today, so their meeting
      // cache must include today as well as the selected date.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDay = new Date(centreDate);
      selectedDay.setHours(0, 0, 0, 0);
      const start = new Date(Math.min(today.getTime(), selectedDay.getTime()));
      start.setDate(start.getDate() - 1);
      const end = new Date(centreDate);
      end.setDate(end.getDate() + daysAhead);

      const url =
        `${COMPANION_URL}/api/meetings` +
        `?start=${dateToISO(start)}&end=${dateToISO(end)}`;

      if (force) {
        const refreshResponse = await fetch(`${COMPANION_URL}/api/refresh`, { method: 'POST' });
        if (!refreshResponse.ok && refreshResponse.status !== 202) {
          throw new Error(await readError(refreshResponse));
        }
      }

      // Outlook COM startup can take an unpredictable amount of time on first load.
      // Poll companion readiness without triggering additional COM instances.
      let res = await fetch(url);
      while (res.status === 202) {
        await delay(500);
        res = await fetch(url);
      }
      if (!res.ok) throw new Error(await readError(res));
      const meetings: Meeting[] = await res.json();

      // Clear stale Outlook entries in this range and repopulate
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      while (cursor <= end) {
        _cache.set(dateToISO(cursor), []);
        cursor.setDate(cursor.getDate() + 1);
      }
      for (const m of meetings) {
        if (!m.date) continue;
        _cache.get(m.date)!.push(m);
      }

      _source = 'outlook';
      _outlookLoaded = true;
      return 'outlook';
    } catch (error) {
      // Companion may be busy refreshing Outlook COM data.
      // Keep previously loaded data, but never start scheduling from a cold cache.
      if (_outlookLoaded) {
        _source = 'outlook';
        return 'outlook';
      }
      throw error;
    }
  }

  populateMockCache(centreDate, daysAhead);
  _source = 'mock';
  return 'mock';
}

/** Synchronous lookup used by the scheduler — call refreshMeetings() first */
export function getCachedMeetingsForDate(date: Date): Meeting[] {
  const key = dateToISO(date);
  if (_cache.has(key)) return _cache.get(key)!;
  // If Outlook source is active, missing key means "no meetings for this date".
  if (_source === 'outlook') return [];
  // Emergency fallback for mock mode if cache is cold.
  return mockMeetings.filter((m) => m.dayOfWeek === date.getDay());
}

export function getMeetingSource(): MeetingSource {
  return _source;
}
