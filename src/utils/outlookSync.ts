import type { TimeSlot, Task, Settings } from '../types';
import { buildSchedule } from './scheduler';
import { getCachedMeetingsForDate } from '../data/meetings';

interface OutlookMeeting {
  title: string;
  date: string;
  start: string;
  end: string;
  priority: string;
}

/**
 * Format a Date as ISO string YYYY-MM-DD using LOCAL time, not UTC
 */
export function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert scheduled task slots into Outlook meeting format
 * Filters only task slots (not meetings) so we can sync them to Outlook
 */
export function extractTaskMeetings(slots: TimeSlot[], date: string): OutlookMeeting[] {
  return slots
    .filter((slot) => slot.type === 'task' && slot.task && !slot.completed)
    .map((slot) => ({
      title: slot.task!.title,
      date,
      start: slot.start,
      end: slot.end,
      priority: slot.task!.priority,
    }));
}

/**
 * Calculate how many days are needed to schedule all active tasks
 * Returns array of dates from today onwards (skipping Fri/Sat weekends)
 */
export function calculateDaysNeeded(tasks: Task[], settings: Settings): Date[] {
  const activeTasks = tasks.filter((t) => t.status !== 'done');
  if (activeTasks.length === 0) return [];

  const dates: Date[] = [];
  let remainingTasks = activeTasks.map((t) => ({ ...t, estimatedMinutes: t.estimatedMinutes }));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // Skip weekends from the start (Fri=5, Sat=6)
  while (cursor.getDay() === 5 || cursor.getDay() === 6) {
    cursor.setDate(cursor.getDate() + 1);
  }

  // Simulate scheduling day by day until all tasks are allocated
  for (let dayCount = 0; dayCount < 365; dayCount++) {
    // Schedule this single day directly (no internal cascading)
    const daySchedule = buildSchedule(remainingTasks, getCachedMeetingsForDate(cursor), settings, cursor);

    dates.push(new Date(cursor));

    // Update remaining tasks based on what was scheduled today
    remainingTasks = daySchedule.unscheduled.map(({ task, remainingMinutes }) => ({
      ...task,
      estimatedMinutes: remainingMinutes,
      completedMinutes: 0,
      completedSessions: [],
    }));

    // Stop if all tasks are fully scheduled
    if (remainingTasks.length === 0) break;

    cursor.setDate(cursor.getDate() + 1);

    // Skip weekends
    while (cursor.getDay() === 5 || cursor.getDay() === 6) {
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return dates;
}

/**
 * Sync task sessions across all days until all tasks are allocated
 * - Deletes all existing "[Task Planner]" meetings
 * - Creates meetings for each task session on every day needed
 * - Meetings are marked as "Free" so others can schedule over them
 */
export async function syncAllTasksToOutlook(
  tasks: Task[],
  settings: Settings,
): Promise<any> {
  const daysNeeded = calculateDaysNeeded(tasks, settings);

  console.log(`[syncAllTasksToOutlook] Days needed: ${daysNeeded.length}`, daysNeeded.map(d => d.toISOString().split('T')[0]));

  // No active tasks: still clear any existing Task Planner meetings from Outlook
  if (daysNeeded.length === 0) {
    return postMeetingsSync([]);
  }

  const allMeetings: OutlookMeeting[] = [];
  const activeTasks = tasks.filter((t) => t.status !== 'done');
  let remainingTasks = [...activeTasks];

  console.log(`[syncAllTasksToOutlook] Active tasks: ${remainingTasks.length}`, remainingTasks.map(t => `${t.title} (${t.estimatedMinutes}m)`));

  // Simulate scheduling for each day and collect meetings
  for (const date of daysNeeded) {
    const dateStr = toLocalISODate(date);
    const daySchedule = buildSchedule(remainingTasks, getCachedMeetingsForDate(date), settings, date);

    console.log(`[syncAllTasksToOutlook] Day ${dateStr}: ${daySchedule.slots.filter(s => s.type === 'task').length} task slots, ${daySchedule.unscheduled.length} unscheduled`);

    // Extract meetings from today's schedule
    const dayMeetings = extractTaskMeetings(daySchedule.slots, dateStr);
    console.log(`[syncAllTasksToOutlook] Day ${dateStr}: extracted ${dayMeetings.length} meetings`);
    allMeetings.push(...dayMeetings);

    // Update remaining tasks for next day
    remainingTasks = daySchedule.unscheduled.map(({ task, remainingMinutes }) => ({
      ...task,
      estimatedMinutes: remainingMinutes,
      completedMinutes: 0,
      completedSessions: [],
    }));

    console.log(`[syncAllTasksToOutlook] Day ${dateStr}: ${remainingTasks.length} tasks remaining`);

    if (remainingTasks.length === 0) break;
  }

  console.log(`[syncAllTasksToOutlook] Total meetings to sync: ${allMeetings.length}`, allMeetings.map(m => `${m.title} on ${m.date}`));

  return postMeetingsSync(allMeetings);
}

/**
 * POST a set of meetings to the companion sync endpoint.
 * The companion deletes ALL existing "[Task Planner]" meetings first, then
 * creates the provided ones — so an empty array simply clears them.
 */
async function postMeetingsSync(meetings: OutlookMeeting[], dates?: string[]): Promise<any> {
  try {
    const response = await fetch('http://localhost:3001/api/meetings/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dates ? { meetings, dates } : { meetings }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Sync failed with status ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    if (err instanceof Error && err.message.includes('Failed to fetch')) {
      throw new Error('Outlook companion server is not running. Start it with: npm start (in companion directory)');
    }
    throw err;
  }
}

/**
 * Sync task sessions to Outlook as meetings (single day)
 * - Deletes all existing "[Task Planner]" meetings
 * - Creates new meetings for all provided task slots
 * - Meetings are marked as "Free" so others can schedule over them
 */
export async function syncTasksToOutlook(slots: TimeSlot[], date: string): Promise<any> {
  const meetings = extractTaskMeetings(slots, date);
  // Scope deletion to just this day so other days' meetings are preserved
  return postMeetingsSync(meetings, [date]);
}
