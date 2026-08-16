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

      loadSeedTasks: () =>
        set({
          tasks: SEED_TASKS.map((t) => ({ ...t, createdAt: new Date().toISOString() })),
        }),
    }),
    { name: 'task-planner-tasks' },
  ),
);
