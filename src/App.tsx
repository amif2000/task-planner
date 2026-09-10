import { useEffect, useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import TimelineView from './components/timeline/TimelineView';
import TaskList from './components/tasks/TaskList';
import ProgressDashboard from './components/progress/ProgressDashboard';
import SettingsPanel from './components/settings/SettingsPanel';
import type { View } from './types';
import { useTaskStore } from './store/useTaskStore';
import { useSettingsStore } from './store/useSettingsStore';

export default function App() {
  const [view, setView] = useState<View>('timeline');
  const initialize = useTaskStore((s) => s.initialize);
  const isLoading = useTaskStore((s) => s.isLoading);
  const initialized = useTaskStore((s) => s.initialized);
  const error = useTaskStore((s) => s.error);
  const clearError = useTaskStore((s) => s.clearError);
  const initializeSettings = useSettingsStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    void initializeSettings();
  }, [initializeSettings]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar current={view} onChange={setView} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {!initialized && isLoading && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Loading tasks...
            </div>
          )}
          {error && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="rounded-md border border-red-300 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                Dismiss
              </button>
            </div>
          )}
          {view === 'timeline' && <TimelineView />}
          {view === 'tasks' && <TaskList />}
          {view === 'progress' && <ProgressDashboard />}
          {view === 'settings' && <SettingsPanel />}
        </main>
      </div>
    </div>
  );
}
