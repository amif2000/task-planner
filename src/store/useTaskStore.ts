import { create } from 'zustand';
import type { Task, Priority } from '../types';
import { TASK_SESSION_DEFAULTS } from '../types';
import { SEED_TASKS } from '../data/seedTasks';
import { getStorageMode } from '../storage/storageMode';

interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  clearError: () => void;
  addTask: (
    title: string,
    estimatedMinutes: number,
    priority: Priority,
    sessionOpts?: {
      minSessionMinutes?: number;
      maxSessionMinutes?: number;
      maxSessionsPerDay?: number | null;
    },
  ) => Promise<void>;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  cycleStatus: (id: string) => Promise<void>;
  clearDone: () => Promise<void>;
  loadSeedTasks: () => Promise<void>;
  /** Mark a concrete session done — deducts its minutes and keeps it in place on the timeline */
  completeSession: (id: string, session: { date: string; start: string; end: string; minutes: number }) => Promise<void>;
  /** Undo a completed session (identified by date + start time) */
  uncompleteSession: (id: string, date: string, start: string) => Promise<void>;
  /** Reset logged progress back to zero and status to todo */
  resetProgress: (id: string) => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3002';
const TASKS_LOCAL_STORAGE_KEY = 'task-planner-tasks';

type TaskPayload = Omit<Task, 'id' | 'createdAt'>;
type SessionPayload = { date: string; start: string; end: string; minutes: number };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep generic message when response body is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

function parsePersistedTasks(raw: string | null): Task[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Task[] | { state?: { tasks?: Task[] } };
    if (Array.isArray(parsed)) return parsed;
    return Array.isArray(parsed.state?.tasks) ? parsed.state.tasks : [];
  } catch {
    return [];
  }
}

function readLocalTasks(): Task[] {
  return parsePersistedTasks(localStorage.getItem(TASKS_LOCAL_STORAGE_KEY));
}

function writeLocalTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_LOCAL_STORAGE_KEY, JSON.stringify({ state: { tasks } }));
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  initialized: false,
  clearError: () => set({ error: null }),
  initialize: async () => {
    if (get().initialized || get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      if (await getStorageMode() === 'local') {
        set({ tasks: readLocalTasks(), initialized: true, isLoading: false, error: null });
        return;
      }
      let tasks = await request<Task[]>('/api/tasks');
      if (tasks.length === 0) {
        const localTasks = parsePersistedTasks(localStorage.getItem(TASKS_LOCAL_STORAGE_KEY));
        if (localTasks.length > 0) {
          await request<{ imported: number }>('/api/tasks/import-local', {
            method: 'POST',
            body: JSON.stringify({ tasks: localTasks }),
          });
          localStorage.removeItem(TASKS_LOCAL_STORAGE_KEY);
          tasks = await request<Task[]>('/api/tasks');
        }
      }
      set({ tasks, initialized: true, isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load tasks';
      set({ error: message, isLoading: false });
    }
  },

  addTask: async (title, estimatedMinutes, priority, sessionOpts = {}) => {
    set({ isLoading: true, error: null });
    try {
      const payload: TaskPayload = {
        title,
        estimatedMinutes,
        priority,
        status: 'todo',
        minSessionMinutes: sessionOpts.minSessionMinutes ?? TASK_SESSION_DEFAULTS.minSessionMinutes,
        maxSessionMinutes: sessionOpts.maxSessionMinutes ?? TASK_SESSION_DEFAULTS.maxSessionMinutes,
        maxSessionsPerDay: sessionOpts.maxSessionsPerDay !== undefined
          ? sessionOpts.maxSessionsPerDay
          : TASK_SESSION_DEFAULTS.maxSessionsPerDay,
        completedMinutes: 0,
        completedSessions: [],
      };
      if (await getStorageMode() === 'local') {
        const task: Task = {
          ...payload,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        const tasks = [...get().tasks, task];
        writeLocalTasks(tasks);
        set({ tasks, isLoading: false });
        return;
      }
      const task = await request<Task>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      set((state) => ({ tasks: [...state.tasks, task], isLoading: false }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add task';
      set({ error: message, isLoading: false });
    }
  },

  updateTask: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      if (await getStorageMode() === 'local') {
        const tasks = get().tasks.map((task) => task.id === id ? { ...task, ...updates } : task);
        writeLocalTasks(tasks);
        set({ tasks, isLoading: false });
        return;
      }
      const task = await request<Task>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? task : t)),
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update task';
      set({ error: message, isLoading: false });
    }
  },

  deleteTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      if (await getStorageMode() === 'local') {
        const tasks = get().tasks.filter((task) => task.id !== id);
        writeLocalTasks(tasks);
        set({ tasks, isLoading: false });
        return;
      }
      await request<void>(`/api/tasks/${id}`, { method: 'DELETE' });
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete task';
      set({ error: message, isLoading: false });
    }
  },

  cycleStatus: async (id) => {
    set({ isLoading: true, error: null });
    try {
      if (await getStorageMode() === 'local') {
        const statusCycle = { 'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo' } as const;
        const tasks = get().tasks.map((task) => (
          task.id === id ? { ...task, status: statusCycle[task.status] } : task
        ));
        writeLocalTasks(tasks);
        set({ tasks, isLoading: false });
        return;
      }
      const task = await request<Task>(`/api/tasks/${id}/cycle-status`, { method: 'POST' });
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? task : t)),
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cycle task status';
      set({ error: message, isLoading: false });
    }
  },

  clearDone: async () => {
    set({ isLoading: true, error: null });
    try {
      if (await getStorageMode() === 'local') {
        const tasks = get().tasks.filter((task) => task.status !== 'done');
        writeLocalTasks(tasks);
        set({ tasks, isLoading: false });
        return;
      }
      await request<{ deleted: number }>('/api/tasks/clear-done', { method: 'POST' });
      set((state) => ({
        tasks: state.tasks.filter((t) => t.status !== 'done'),
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear done tasks';
      set({ error: message, isLoading: false });
    }
  },

  completeSession: async (id, session: SessionPayload) => {
    set({ isLoading: true, error: null });
    try {
      if (await getStorageMode() === 'local') {
        const tasks: Task[] = get().tasks.map((task): Task => {
          if (task.id !== id) return task;
          const completedSessions = task.completedSessions.some(
            (item) => item.date === session.date && item.start === session.start,
          )
            ? task.completedSessions
            : [...task.completedSessions, session];
          const completedMinutes = Math.min(
            task.estimatedMinutes,
            completedSessions.reduce((sum, item) => sum + item.minutes, 0),
          );
          return {
            ...task,
            completedSessions,
            completedMinutes,
            status: completedMinutes >= task.estimatedMinutes ? 'done' : 'in-progress',
          };
        });
        writeLocalTasks(tasks);
        set({ tasks, isLoading: false });
        return;
      }
      const task = await request<Task>(`/api/tasks/${id}/complete-session`, {
        method: 'POST',
        body: JSON.stringify({ session }),
      });
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? task : t)),
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete session';
      set({ error: message, isLoading: false });
    }
  },

  uncompleteSession: async (id, date, start) => {
    set({ isLoading: true, error: null });
    try {
      if (await getStorageMode() === 'local') {
        const tasks: Task[] = get().tasks.map((task): Task => {
          if (task.id !== id) return task;
          const completedSessions = task.completedSessions.filter(
            (session) => session.date !== date || session.start !== start,
          );
          const completedMinutes = completedSessions.reduce((sum, session) => sum + session.minutes, 0);
          return {
            ...task,
            completedSessions,
            completedMinutes,
            status: completedMinutes <= 0 ? 'todo' : 'in-progress',
          };
        });
        writeLocalTasks(tasks);
        set({ tasks, isLoading: false });
        return;
      }
      const task = await request<Task>(`/api/tasks/${id}/uncomplete-session`, {
        method: 'POST',
        body: JSON.stringify({ date, start }),
      });
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? task : t)),
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to undo completed session';
      set({ error: message, isLoading: false });
    }
  },

  resetProgress: async (id) => {
    set({ isLoading: true, error: null });
    try {
      if (await getStorageMode() === 'local') {
        const tasks: Task[] = get().tasks.map((task): Task => task.id === id
          ? { ...task, completedMinutes: 0, completedSessions: [], status: 'todo' }
          : task);
        writeLocalTasks(tasks);
        set({ tasks, isLoading: false });
        return;
      }
      const task = await request<Task>(`/api/tasks/${id}/reset-progress`, { method: 'POST' });
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? task : t)),
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset task progress';
      set({ error: message, isLoading: false });
    }
  },

  loadSeedTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      if (await getStorageMode() === 'local') {
        const now = new Date().toISOString();
        const tasks: Task[] = SEED_TASKS.map((task) => ({
          ...task,
          createdAt: now,
          completedMinutes: 0,
          completedSessions: [],
        }));
        writeLocalTasks(tasks);
        set({ tasks, isLoading: false });
        return;
      }
      const tasks = await request<Task[]>('/api/tasks/load-seed', { method: 'POST' });
      set({ tasks, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load sample tasks';
      set({ error: message, isLoading: false });
    }
  },
}));
