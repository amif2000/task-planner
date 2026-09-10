import { create } from 'zustand';
import type { Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { getStorageMode } from '../storage/storageMode';

interface SettingsStore {
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  clearError: () => void;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  toggleDayOverride: (date: string) => Promise<void>;
  isDayOn: (date: Date) => boolean;
}

function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDefaultWorkingDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 5 && day !== 6;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3002';
const SETTINGS_LOCAL_STORAGE_KEY = 'task-planner-settings';

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
      // Keep generic message if the response isn't JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function parsePersistedSettings(raw: string | null): Settings | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: { settings?: Settings } };
    return parsed?.state?.settings ?? null;
  } catch {
    return null;
  }
}

function writeLocalSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_LOCAL_STORAGE_KEY, JSON.stringify({ state: { settings } }));
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  error: null,
  initialized: false,

  clearError: () => set({ error: null }),

  initialize: async () => {
    if (get().initialized || get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      if (await getStorageMode() === 'local') {
        const settings = parsePersistedSettings(localStorage.getItem(SETTINGS_LOCAL_STORAGE_KEY));
        set({
          settings: settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS,
          initialized: true,
          isLoading: false,
          error: null,
        });
        return;
      }
      const settings = await request<Settings>('/api/settings');
      const localSettings = parsePersistedSettings(localStorage.getItem(SETTINGS_LOCAL_STORAGE_KEY));
      if (localSettings) {
        const merged = {
          ...settings,
          ...localSettings,
          dayOverrides: localSettings.dayOverrides ?? settings.dayOverrides ?? {},
        };
        const updated = await request<Settings>('/api/settings/import-local', {
          method: 'POST',
          body: JSON.stringify({ settings: merged }),
        });
        localStorage.removeItem(SETTINGS_LOCAL_STORAGE_KEY);
        set({ settings: updated, initialized: true, isLoading: false, error: null });
        return;
      }
      set({
        settings: {
          ...DEFAULT_SETTINGS,
          ...settings,
          dayOverrides: settings.dayOverrides ?? {},
        },
        initialized: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load settings';
      set({ error: message, isLoading: false });
    }
  },

  updateSettings: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const payload = { ...get().settings, ...updates };
      if (await getStorageMode() === 'local') {
        writeLocalSettings(payload);
        set({ settings: payload, isLoading: false });
        return;
      }
      const settings = await request<Settings>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      set({ settings, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update settings';
      set({ error: message, isLoading: false });
    }
  },

  resetSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      if (await getStorageMode() === 'local') {
        writeLocalSettings(DEFAULT_SETTINGS);
        set({ settings: DEFAULT_SETTINGS, isLoading: false });
        return;
      }
      const settings = await request<Settings>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(DEFAULT_SETTINGS),
      });
      set({ settings, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset settings';
      set({ error: message, isLoading: false });
    }
  },

  toggleDayOverride: async (date) => {
    set({ isLoading: true, error: null });
    try {
      const current = get().settings.dayOverrides ?? {};
      const hasOverride = Object.prototype.hasOwnProperty.call(current, date);
      const next = { ...current };
      if (hasOverride) {
        delete next[date];
      } else {
        const d = new Date(date);
        next[date] = !isDefaultWorkingDay(d);
      }
      if (await getStorageMode() === 'local') {
        const settings = { ...get().settings, dayOverrides: next };
        writeLocalSettings(settings);
        set({ settings, isLoading: false });
        return;
      }
      const settings = await request<Settings>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ ...get().settings, dayOverrides: next }),
      });
      set({ settings, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle day override';
      set({ error: message, isLoading: false });
    }
  },

  isDayOn: (date) => {
    const iso = toLocalISODate(date);
    const overrides = get().settings.dayOverrides ?? {};
    if (Object.prototype.hasOwnProperty.call(overrides, iso)) {
      return overrides[iso];
    }
    return isDefaultWorkingDay(date);
  },
}));
