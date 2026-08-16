export type Priority = 'high' | 'medium' | 'low';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export type View = 'timeline' | 'tasks' | 'progress' | 'settings';

export interface Task {
  id: string;
  title: string;
  estimatedMinutes: number;
  priority: Priority;
  status: TaskStatus;
  createdAt: string;
  /** Minimum length of a single work session (minutes). Default: 30 */
  minSessionMinutes: number;
  /** Maximum length of a single work session (minutes). Default: 120 */
  maxSessionMinutes: number;
  /** Max sessions scheduled per day. null = unlimited. Default: null */
  maxSessionsPerDay: number | null;
  /** Minutes of work already completed (logged by marking sessions done). Default: 0 */
  completedMinutes: number;
  /** Concrete work sessions that were marked done, kept in place on the timeline. Default: [] */
  completedSessions: CompletedSession[];
}

export interface CompletedSession {
  /** Local ISO date "YYYY-MM-DD" the session was completed on */
  date: string;
  /** "HH:mm" */
  start: string;
  /** "HH:mm" */
  end: string;
  minutes: number;
}

export interface Meeting {
  id: string;
  title: string;
  /** "HH:mm" */
  start: string;
  /** "HH:mm" */
  end: string;
  /** 0 = Sunday … 6 = Saturday (used by mock data) */
  dayOfWeek: number;
  /** ISO date "YYYY-MM-DD" — present for real Outlook meetings */
  date?: string;
}

export type SlotType = 'free' | 'meeting' | 'task' | 'gap';

export interface TimeSlot {
  start: string;
  end: string;
  type: SlotType;
  task?: Task;
  meeting?: Meeting;
  /** 1-based index of this session within today's schedule for the task */
  sessionIndex?: number;
  /** Total sessions scheduled today for this task */
  sessionTotal?: number;
  /** True when this slot is an already-completed session (rendered in place, not re-planned) */
  completed?: boolean;
}

export interface UnscheduledEntry {
  task: Task;
  /** Minutes placed on today's timeline (may be 0) */
  scheduledMinutes: number;
  /** Minutes still unplaced */
  remainingMinutes: number;
}

export interface ScheduledDay {
  slots: TimeSlot[];
  unscheduled: UnscheduledEntry[];
}

export interface Settings {
  workStart: string;
  workEnd: string;
  breakMinutes: number;
}

export const DEFAULT_SETTINGS: Settings = {
  workStart: '08:00',
  workEnd: '17:00',
  breakMinutes: 10,
};

export const TASK_SESSION_DEFAULTS = {
  minSessionMinutes: 30,
  maxSessionMinutes: 120,
  maxSessionsPerDay: null as number | null,
};
