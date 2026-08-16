import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import TimelineView from './components/timeline/TimelineView';
import TaskList from './components/tasks/TaskList';
import ProgressDashboard from './components/progress/ProgressDashboard';
import SettingsPanel from './components/settings/SettingsPanel';
import type { View } from './types';

export default function App() {
  const [view, setView] = useState<View>('timeline');

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar current={view} onChange={setView} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {view === 'timeline' && <TimelineView />}
          {view === 'tasks' && <TaskList />}
          {view === 'progress' && <ProgressDashboard />}
          {view === 'settings' && <SettingsPanel />}
        </main>
      </div>
    </div>
  );
}
