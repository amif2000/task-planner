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
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function toISODate(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
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

const MEETING_PREFIX = '[Task Planner]';

function readOutlookMeetings(rangeStart, rangeEnd) {
  const winax = require('winax');

  // This will launch Outlook silently if it isn't already running
  const outlook = new winax.Object('Outlook.Application');
  const ns = outlook.GetNamespace('MAPI');
  const calFolder = ns.GetDefaultFolder(9); // 9 = olFolderCalendar

  const items = calFolder.Items;
  // For recurrence expansion, the required order is:
  //   1. Sort by [Start]
  //   2. Set IncludeRecurrences = true
  //   3. Restrict to a date range
  items.Sort('[Start]');
  items.IncludeRecurrences = true;

  const start = new Date(rangeStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setHours(23, 59, 59, 0);

  const filter =
    `[Start] >= '${toOutlookFilter(start)}' AND [Start] <= '${toOutlookFilter(end)}'`;

  const restricted = items.Restrict(filter);

  const meetings = [];
  // With recurring items expanded, iterate via GetFirst/GetNext (index access
  // is unreliable for recurrences).
  let i = 0;
  let item = restricted.GetFirst();
  while (item) {
    i++;
    try {
      const subject = String(item.Subject || '');

      // Skip all-day events
      if (!item.AllDayEvent) {
        // Skip Task Planner meetings — synced from tasks, would double-block time
        if (!subject.startsWith(MEETING_PREFIX)) {
          const startDt = new Date(item.Start.toString());
          const endDt = new Date(item.End.toString());

          meetings.push({
            id: `outlook-${startDt.getTime()}-${i}`,
            title: subject,
            start: toHHMM(startDt),
            end: toHHMM(endDt),
            date: toISODate(startDt),
            dayOfWeek: startDt.getUTCDay(),
          });
        }
      }
    } catch {
      // Skip unreadable items (some recurring exceptions throw)
    }
    item = restricted.GetNext();
  }

  return meetings;
}

/**
 * Delete all meetings with the Task Planner prefix
 */
function deleteTaskPlannerMeetings(dates) {
  const dateFilter = Array.isArray(dates) && dates.length > 0 ? new Set(dates) : null;
  const winax = require('winax');
  const outlook = new winax.Object('Outlook.Application');
  const ns = outlook.GetNamespace('MAPI');
  const calFolder = ns.GetDefaultFolder(9); // 9 = olFolderCalendar

  const items = calFolder.Items;
  items.Sort('[Start]');

  try {
    const toDelete = [];

    // Iterate through all items and find Task Planner meetings
    const count = items.Count;
    for (let i = 1; i <= count; i++) {
      try {
        const item = items.Item(i);
        const subject = String(item.Subject || '');
        if (subject.startsWith(MEETING_PREFIX)) {
          // When a date filter is supplied, only delete meetings on those dates
          if (dateFilter) {
            const startDate = toISODate(new Date(item.Start.toString()));
            if (!dateFilter.has(startDate)) continue;
          }
          toDelete.push(item);
        }
      } catch {
        // Skip unreadable items
      }
    }

    // Delete in reverse order (delete collected items, which already have refs)
    let deleted = 0;
    for (let i = toDelete.length - 1; i >= 0; i--) {
      try {
        toDelete[i].Delete();
        deleted++;
      } catch {
        // Skip items that can't be deleted
      }
    }

    console.log(`[${new Date().toLocaleTimeString()}] Deleted ${deleted} Task Planner meetings`);
    return deleted;
  } catch (err) {
    console.error('Failed to delete Task Planner meetings:', err.message);
    throw err;
  }
}

// Map task priority → Outlook color category name + OlCategoryColor value
// OlCategoryColor: Peach=3 (light red), Yellow=4, Green=5 (light green)
const PRIORITY_CATEGORIES = {
  high: { name: 'Task Planner - High', color: 3 },   // Peach (light red)
  medium: { name: 'Task Planner - Medium', color: 4 }, // Yellow
  low: { name: 'Task Planner - Low', color: 5 },     // Green (light green)
};

/**
 * Ensure a color category exists in Outlook's master category list
 * with the correct color. Updates the color if it exists but differs.
 */
function ensureCategory(ns, name, color) {
  try {
    const categories = ns.Categories;
    const count = categories.Count;
    for (let i = 1; i <= count; i++) {
      const cat = categories.Item(i);
      if (String(cat.Name) === name) {
        // Update color if it doesn't match
        if (Number(cat.Color) !== color) {
          cat.Color = color;
        }
        return;
      }
    }
    // Add it with the specified color
    categories.Add(name, color);
  } catch (err) {
    console.error(`Could not ensure category "${name}":`, err.message);
  }
}

/**
 * Create a new meeting in Outlook
 * @param {string} title - Meeting title
 * @param {string} date - ISO date "YYYY-MM-DD"
 * @param {string} startTime - "HH:mm"
 * @param {string} endTime - "HH:mm"
 * @param {string} priority - Task priority (high/medium/low) for color
 * @returns {object} Created meeting info
 */
function createOutlookMeeting(title, date, startTime, endTime, priority) {
  const winax = require('winax');
  const outlook = new winax.Object('Outlook.Application');
  const ns = outlook.GetNamespace('MAPI');
  const calFolder = ns.GetDefaultFolder(9); // 9 = olFolderCalendar

  try {
    const meeting = calFolder.Items.Add(1); // 1 = olAppointmentItem

    // Parse date and time
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // winax passes the Date's UTC components to Outlook as the wall-clock time.
    // So Date.UTC(y,m,d,8,0) → getUTCHours()===8 → Outlook shows 08:00.
    // No timezone offset adjustment needed.
    const startUtcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    const endUtcDate = new Date(Date.UTC(year, month - 1, day, endHour, endMinute, 0));

    console.log(`[${new Date().toLocaleTimeString()}] Creating meeting: "${title}" on ${date} ${startTime}-${endTime}`);

    meeting.Subject = `${MEETING_PREFIX} ${title}`;
    meeting.Start = startUtcDate;
    meeting.End = endUtcDate;
    meeting.BusyStatus = 0; // 0 = olFree

    // Assign a color category matching the GUI priority color
    const cat = PRIORITY_CATEGORIES[priority];
    if (cat) {
      ensureCategory(ns, cat.name, cat.color);
      meeting.Categories = cat.name;
    }

    meeting.Save();

    console.log(`[${new Date().toLocaleTimeString()}] Created: "${title}" on ${date} ${startTime}-${endTime} (${priority || 'no'} priority)`);
    return {
      title: meeting.Subject,
      date,
      start: startTime,
      end: endTime,
    };
  } catch (err) {
    console.error('Failed to create meeting:', err.message);
    throw err;
  }
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
app.use(express.json());
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

/**
 * POST /api/meetings/sync
 * Clear all Task Planner meetings and create new ones from provided tasks
 *
 * Body: {
 *   meetings: [
 *     { title: "string", date: "YYYY-MM-DD", start: "HH:mm", end: "HH:mm" },
 *     ...
 *   ]
 * }
 */
app.post('/api/meetings/sync', (req, res) => {
  try {
    const { meetings, dates } = req.body || {};

    if (!Array.isArray(meetings)) {
      return res.status(400).json({ error: 'Body must contain "meetings" array' });
    }

    // Delete existing Task Planner meetings. When "dates" is provided, only
    // meetings on those days are removed (so a single-day sync leaves other
    // days untouched). Omit "dates" to clear all Task Planner meetings.
    const deletedCount = deleteTaskPlannerMeetings(Array.isArray(dates) ? dates : undefined);

    // Create new meetings
    const created = [];
    const failed = [];

    for (const m of meetings) {
      const { title, date, start, end, priority } = m;
      if (!title || !date || !start || !end) {
        failed.push({ meeting: m, reason: 'Missing title, date, start, or end' });
        continue;
      }

      try {
        const result = createOutlookMeeting(title, date, start, end, priority);
        created.push(result);
      } catch (err) {
        failed.push({ meeting: m, reason: err.message });
      }
    }

    res.json({
      deleted: deletedCount,
      created: created.length,
      failed: failed.length,
      meetings: created,
      errors: failed,
    });
  } catch (err) {
    console.error('Sync failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\nOutlook companion listening on http://localhost:${PORT}`);
  console.log('React app will automatically connect to this server.\n');
});
