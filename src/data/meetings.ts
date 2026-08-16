import type { Meeting } from '../types';
import { mockMeetings } from './mockMeetings';

const COMPANION_URL = 'http://localhost:3001';
const RECHECK_INTERVAL_MS = 60_000; // re-probe companion availability every minute

export type MeetingSource = 'outlook' | 'mock';

let _available: boolean | null = null;
let _lastCheck = 0;
let _source: MeetingSource = 'mock';

// date string → meetings (populated after refreshMeetings())
const _cache = new Map<string, Meeting[]>();

function dateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function checkCompanion(): Promise<boolean> {
  const now = Date.now();
  if (_available !== null && now - _lastCheck < RECHECK_INTERVAL_MS) return _available;
  try {
    const res = await fetch(`${COMPANION_URL}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    _available = res.ok;
  } catch {
    _available = false;
  }
  _lastCheck = Date.now();
  return _available;
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
): Promise<MeetingSource> {
  const available = await checkCompanion();

  if (available) {
    try {
      const start = new Date(centreDate);
      start.setDate(start.getDate() - 1);
      const end = new Date(centreDate);
      end.setDate(end.getDate() + daysAhead);

      const url =
        `${COMPANION_URL}/api/meetings` +
        `?start=${dateToISO(start)}&end=${dateToISO(end)}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`Meetings request failed: ${res.status}`);
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
      return 'outlook';
    } catch {
      // Companion may be busy refreshing Outlook COM data.
      // Keep current cache/source instead of flipping back to mock data.
      _source = 'outlook';
      return 'outlook';
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
