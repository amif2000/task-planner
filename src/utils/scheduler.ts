import type { Meeting, Task, TimeSlot, ScheduledDay, Settings, UnscheduledEntry } from '../types';
import { toMinutes, toTimeString } from './timeUtils';

/** Merge overlapping/adjacent meetings and sort by start time */
function normalizeMeetings(meetings: Meeting[]): Meeting[] {
  if (meetings.length === 0) return [];
  const sorted = [...meetings].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const merged: Meeting[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const curr = sorted[i];
    if (toMinutes(curr.start) <= toMinutes(last.end)) {
      if (toMinutes(curr.end) > toMinutes(last.end)) {
        merged[merged.length - 1] = { ...last, end: curr.end };
      }
    } else {
      merged.push(curr);
    }
  }
  return merged;
}

/** Local ISO date "YYYY-MM-DD" (no UTC shift) */
function localISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Sum of completed minutes for a task (from concrete sessions, falling back to legacy counter) */
function totalCompletedMinutes(task: Task): number {
  const sessions = task.completedSessions;
  if (sessions && sessions.length > 0) {
    return sessions.reduce((sum, s) => sum + s.minutes, 0);
  }
  return task.completedMinutes ?? 0;
}

/** Compute free intervals within [workStart, workEnd] given busy intervals */
function computeFreeIntervals(
  busy: Array<{ start: number; end: number }>,
  workStartMins: number,
  workEndMins: number,
): Array<{ start: number; end: number }> {
  const sorted = busy
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const b of sorted) {
    const last = merged[merged.length - 1];
    if (last && b.start <= last.end) {
      last.end = Math.max(last.end, b.end);
    } else {
      merged.push({ ...b });
    }
  }
  const free: Array<{ start: number; end: number }> = [];
  let cur = workStartMins;
  for (const b of merged) {
    const s = Math.max(b.start, workStartMins);
    const e = Math.min(b.end, workEndMins);
    if (s > cur) free.push({ start: cur, end: s });
    cur = Math.max(cur, e);
  }
  if (cur < workEndMins) free.push({ start: cur, end: workEndMins });
  return free;
}

export function buildSchedule(
  tasks: Task[],
  meetings: Meeting[],
  settings: Settings,
  date?: Date,
): ScheduledDay {
  const { workStart, workEnd, breakMinutes } = settings;
  const workStartMins = toMinutes(workStart);
  const workEndMins = toMinutes(workEnd);

  const normalized = normalizeMeetings(meetings);

  // Build meeting slots for display
  const meetingSlots: TimeSlot[] = normalized.map((m) => ({
    start: m.start,
    end: m.end,
    type: 'meeting',
    meeting: m,
  }));

  // Completed sessions for THIS date render in place and occupy their time
  const dateStr = date ? localISODate(date) : null;
  const completedSlots: TimeSlot[] = [];
  if (dateStr) {
    for (const task of tasks) {
      for (const cs of task.completedSessions ?? []) {
        if (cs.date !== dateStr) continue;
        completedSlots.push({
          start: cs.start,
          end: cs.end,
          type: 'task',
          task,
          completed: true,
        });
      }
    }
  }

  // Free intervals must avoid both meetings and already-completed sessions
  const busy = [
    ...normalized.map((m) => ({ start: toMinutes(m.start), end: toMinutes(m.end) })),
    ...completedSlots.map((s) => ({ start: toMinutes(s.start), end: toMinutes(s.end) })),
  ];
  const freeIntervals = computeFreeIntervals(busy, workStartMins, workEndMins);

  // Sort tasks: high → medium → low, then by creation date
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const activeTasks = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) =>
      priorityOrder[a.priority] !== priorityOrder[b.priority]
        ? priorityOrder[a.priority] - priorityOrder[b.priority]
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  // Phase 1: schedule sessions for each task, collecting raw slots
  interface RawTaskSlot {
    taskId: string;
    start: number;
    end: number;
    sessionIndex: number; // 1-based, within this task's pass
  }

  const rawTaskSlots: RawTaskSlot[] = [];
  const unscheduled: UnscheduledEntry[] = [];

  for (const task of activeTasks) {
    const { minSessionMinutes, maxSessionMinutes, maxSessionsPerDay } = task;
    const pool = Math.max(0, task.estimatedMinutes - totalCompletedMinutes(task));
    let remaining = pool;
    let sessionsPlaced = 0;

    for (let i = 0; i < freeIntervals.length; i++) {
      if (remaining <= 0) break;
      if (maxSessionsPerDay !== null && sessionsPlaced >= maxSessionsPerDay) break;

      const interval = freeIntervals[i];

      // Keep placing sessions in this interval until it's too small or task is done
      while (remaining > 0) {
        if (maxSessionsPerDay !== null && sessionsPlaced >= maxSessionsPerDay) break;

        const available = interval.end - interval.start;
        if (available < minSessionMinutes) break; // interval exhausted — move to next

        const sessionSize = Math.min(remaining, maxSessionMinutes, available);
        if (sessionSize < minSessionMinutes) break;

        // Ensure the session doesn't extend past workEnd
        const sessionEnd = interval.start + sessionSize;
        if (sessionEnd > workEndMins) break;

        sessionsPlaced++;
        rawTaskSlots.push({
          taskId: task.id,
          start: interval.start,
          end: sessionEnd,
          sessionIndex: sessionsPlaced,
        });

        interval.start = sessionEnd + breakMinutes;
        remaining -= sessionSize;
      }
    }

    const scheduledMinutes = pool - remaining;
    if (remaining > 0) {
      unscheduled.push({ task, scheduledMinutes, remainingMinutes: remaining });
    }
  }

  // Phase 2: compute sessionTotal per task and build final TimeSlot array
  const sessionCountByTask: Record<string, number> = {};
  for (const s of rawTaskSlots) {
    sessionCountByTask[s.taskId] = (sessionCountByTask[s.taskId] ?? 0) + 1;
  }

  const taskById = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const taskSlots: TimeSlot[] = rawTaskSlots.map((s) => ({
    start: toTimeString(s.start),
    end: toTimeString(s.end),
    type: 'task',
    task: taskById[s.taskId],
    sessionIndex: s.sessionIndex,
    sessionTotal: sessionCountByTask[s.taskId],
  }));

  const allSlots: TimeSlot[] = [...meetingSlots, ...completedSlots, ...taskSlots].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start),
  );

  return { slots: allSlots, unscheduled };
}

function toMidnight(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Return the schedule for a specific date, carrying overflow forward from
 * today so tasks are not duplicated across days.
 *
 * - Past dates  → empty schedule (nothing to plan)
 * - Today       → schedule all active tasks normally
 * - Future date → simulate each day from today, carry unfinished work forward
 */
export function getScheduleForDate(
  allTasks: Task[],
  targetDate: Date,
  settings: Settings,
  getMeetingsFn: (date: Date) => Meeting[],
): ScheduledDay {
  const today = toMidnight(new Date());
  const target = toMidnight(targetDate);

  if (target < today) {
    return { slots: [], unscheduled: [] };
  }

  if (target.getTime() === today.getTime()) {
    return buildSchedule(allTasks, getMeetingsFn(targetDate), settings, targetDate);
  }

  // Future: cascade day by day from today, carrying remaining work forward
  let carryTasks: Task[] = allTasks.filter((t) => t.status !== 'done');

  const cursor = new Date(today);
  while (toMidnight(cursor) < target) {
    const daySchedule = buildSchedule(carryTasks, getMeetingsFn(cursor), settings, cursor);

    // Build a set of task IDs that were fully placed (no remaining minutes)
    const unscheduledIds = new Set(daySchedule.unscheduled.map((u) => u.task.id));
    const scheduledAnyIds = new Set(
      daySchedule.slots.filter((s) => s.type === 'task' && s.task).map((s) => s.task!.id),
    );
    const fullyDoneIds = new Set(
      [...scheduledAnyIds].filter((id) => !unscheduledIds.has(id)),
    );

    carryTasks = [
      // Partially placed: carry forward with only the remaining minutes
      ...daySchedule.unscheduled.map(({ task, remainingMinutes }) => ({
        ...task,
        estimatedMinutes: remainingMinutes,
        completedMinutes: 0,
        completedSessions: [],
      })),
      // Never placed at all (e.g. minSession too large for any free slot that day)
      ...carryTasks.filter(
        (t) => !fullyDoneIds.has(t.id) && !unscheduledIds.has(t.id) && !scheduledAnyIds.has(t.id),
      ),
    ];

    cursor.setDate(cursor.getDate() + 1);
  }

  return buildSchedule(carryTasks, getMeetingsFn(targetDate), settings, targetDate);
}
