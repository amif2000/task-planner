import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Task, Priority, TaskStatus } from '../types';
import { TASK_SESSION_DEFAULTS } from '../types';
import { SEED_TASKS } from '../data/seedTasks';

interface TaskStore {
  tasks: Task[];
  addTask: (
    title: string,
    estimatedMinutes: number,
    priority: Priority,
    sessionOpts?: {
      minSessionMinutes?: number;
      maxSessionMinutes?: number;
      maxSessionsPerDay?: number | null;
    },
  ) => void;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
  deleteTask: (id: string) => void;
  cycleStatus: (id: string) => void;
  clearDone: () => void;
  loadSeedTasks: () => void;
  /** Mark a concrete session done — deducts its minutes and keeps it in place on the timeline */
  completeSession: (id: string, session: { date: string; start: string; end: string; minutes: number }) => void;
  /** Undo a completed session (identified by date + start time) */
  uncompleteSession: (id: string, date: string, start: string) => void;
  /** Reset logged progress back to zero and status to todo */
  resetProgress: (id: string) => void;
}

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  'todo': 'in-progress',
  'in-progress': 'done',
  'done': 'todo',
};

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [],

      addTask: (title, estimatedMinutes, priority, sessionOpts = {}) =>
        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              id: uuidv4(),
              title,
              estimatedMinutes,
              priority,
              status: 'todo',
              createdAt: new Date().toISOString(),
              minSessionMinutes: sessionOpts.minSessionMinutes ?? TASK_SESSION_DEFAULTS.minSessionMinutes,
              maxSessionMinutes: sessionOpts.maxSessionMinutes ?? TASK_SESSION_DEFAULTS.maxSessionMinutes,
              maxSessionsPerDay: sessionOpts.maxSessionsPerDay !== undefined
                ? sessionOpts.maxSessionsPerDay
                : TASK_SESSION_DEFAULTS.maxSessionsPerDay,
              completedMinutes: 0,
              completedSessions: [],
            },
          ],
        })),

      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTask: (id) =>
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

      cycleStatus: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, status: STATUS_CYCLE[t.status] } : t,
          ),
        })),

      clearDone: () =>
        set((state) => ({ tasks: state.tasks.filter((t) => t.status !== 'done') })),

      completeSession: (id, session) =>
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;
            const existing = t.completedSessions ?? [];
            // Avoid duplicates for the same date+start
            if (existing.some((s) => s.date === session.date && s.start === session.start)) {
              return t;
            }
            const sessions = [...existing, session];
            const completedMinutes = Math.min(
              t.estimatedMinutes,
              sessions.reduce((sum, s) => sum + s.minutes, 0),
            );
            const status: TaskStatus = completedMinutes >= t.estimatedMinutes ? 'done' : 'in-progress';
            return { ...t, completedSessions: sessions, completedMinutes, status };
          }),
        })),

      uncompleteSession: (id, date, start) =>
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;
            const sessions = (t.completedSessions ?? []).filter(
              (s) => !(s.date === date && s.start === start),
            );
            const completedMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
            const status: TaskStatus = completedMinutes <= 0 ? 'todo' : 'in-progress';
            return { ...t, completedSessions: sessions, completedMinutes, status };
          }),
        })),

      resetProgress: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, completedMinutes: 0, completedSessions: [], status: 'todo' } : t,
          ),
        })),

      loadSeedTasks: () =>
        set({
          tasks: SEED_TASKS.map((t) => ({
            ...t,
            createdAt: new Date().toISOString(),
            completedMinutes: 0,
            completedSessions: [],
          })),
        }),
    }),
    { name: 'task-planner-tasks' },
  ),
);
