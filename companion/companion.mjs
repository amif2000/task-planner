/**
 * Task Planner — Outlook Companion Server
 *
 * Reads the local Outlook calendar via COM automation and serves meetings
 * as JSON on http://localhost:3001. The React app fetches from here and
 * falls back to mock data if this server is not running.
 *
 * Requirements: Windows + Microsoft Outlook (desktop app) installed.
 * First run:  npm install   (requires node-gyp / VS Build Tools for winax)
 * Start:      npm start
 */

import { createRequire } from 'module';
import express from 'express';
import cors from 'cors';

const require = createRequire(import.meta.url);

const PORT = 3001;

// ── helpers ──────────────────────────────────────────────────────────────────

function pad(n) {
  return String(n).padStart(2, '0');
}

function toHHMM(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Format a Date for Outlook's Restrict() filter: "M/D/YYYY H:MM AM/PM" */
function toOutlookFilter(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const y = date.getFullYear();
  const h = date.getHours();
  const min = date.getMinutes();
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${m}/${d}/${y} ${h12}:${pad(min)} ${ampm}`;
}

// ── Outlook COM reader ────────────────────────────────────────────────────────

function readOutlookMeetings(rangeStart, rangeEnd) {
  const winax = require('winax');

  // This will launch Outlook silently if it isn't already running
  const outlook = new winax.Object('Outlook.Application');
  const ns = outlook.GetNamespace('MAPI');
  const calFolder = ns.GetDefaultFolder(9); // 9 = olFolderCalendar

  const items = calFolder.Items;
  // Recurrence expansion via COM can block for a long time on some corp calendars.
  // Keep this false for responsiveness.
  items.IncludeRecurrences = false;
  items.Sort('[Start]');

  const start = new Date(rangeStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setHours(23, 59, 59, 0);

  const filter =
    `[Start] >= '${toOutlookFilter(start)}' AND [Start] <= '${toOutlookFilter(end)}'`;

  const restricted = items.Restrict(filter);
  const count = restricted.Count;

  const meetings = [];
  for (let i = 1; i <= count; i++) {
    try {
      const item = restricted.Item(i);
      const startDt = new Date(item.Start.toString());
      const endDt = new Date(item.End.toString());

      // Skip all-day events (Start == midnight, duration >= 1 day)
      if (item.AllDayEvent) continue;

      meetings.push({
        id: `outlook-${startDt.getTime()}-${i}`,
        title: String(item.Subject || 'Meeting'),
        start: toHHMM(startDt),
        end: toHHMM(endDt),
        date: toISODate(startDt),
        dayOfWeek: startDt.getDay(),
      });
    } catch {
      // Skip unreadable items (some recurring exceptions throw)
    }
  }

  return meetings;
}

// ── Cache (avoids hammering COM on every request) ─────────────────────────────

let cachedMeetings = [];
let lastFetchedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let refreshInProgress = false;

function refreshCache() {
  if (refreshInProgress) return;
  refreshInProgress = true;
  const start = new Date();
  start.setDate(start.getDate() - 1); // yesterday for safety
  const end = new Date();
  end.setDate(end.getDate() + 14); // two weeks ahead

  try {
    cachedMeetings = readOutlookMeetings(start, end);
    lastFetchedAt = Date.now();
    console.log(
      `[${new Date().toLocaleTimeString()}] Refreshed: ${cachedMeetings.length} meetings cached`,
    );
  } catch (err) {
    console.error('Failed to refresh Outlook cache:', err.message);
  } finally {
    refreshInProgress = false;
  }
}

function getMeetings() {
  const now = Date.now();
  if (now - lastFetchedAt >= CACHE_TTL_MS && !refreshInProgress) {
    // Return quickly; refresh in background to avoid frontend timeouts.
    setImmediate(refreshCache);
  }
  return cachedMeetings;
}

// ── Express server ────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173'] }));
app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

/** Health check — used by the React app to detect if this server is running */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', source: 'outlook-companion' });
});

/**
 * GET /api/meetings
 *   ?date=YYYY-MM-DD          → meetings for a single day
 *   ?start=YYYY-MM-DD&end=YYYY-MM-DD  → meetings in a date range
 *   (no params)               → all cached meetings (next 14 days)
 */
app.get('/api/meetings', (req, res) => {
  try {
    const all = getMeetings();
    const { date, start, end } = req.query;

    let result = all;
    if (date) {
      result = all.filter((m) => m.date === date);
    } else if (start && end) {
      result = all.filter((m) => m.date >= start && m.date <= end);
    }

    res.json(result);
  } catch (err) {
    console.error('Failed to read Outlook:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/** Force a cache refresh */
app.post('/api/refresh', (_req, res) => {
  try {
    refreshCache();
    res.json({ refreshed: true, count: cachedMeetings.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\nOutlook companion listening on http://localhost:${PORT}`);
  console.log('React app will automatically connect to this server.\n');
});
