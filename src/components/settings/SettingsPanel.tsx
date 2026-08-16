import { useSettingsStore } from '../../store/useSettingsStore';
import { useTaskStore } from '../../store/useTaskStore';
import { RotateCcw, FlaskConical } from 'lucide-react';

export default function SettingsPanel() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const loadSeedTasks = useTaskStore((s) => s.loadSeedTasks);

  return (
    <div className="max-w-md">
      <h2 className="text-base font-semibold text-slate-700 mb-6">Settings</h2>

      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-6">
        {/* Work hours */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Work Hours</h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">Start</label>
              <input
                type="time"
                value={settings.workStart}
                onChange={(e) => updateSettings({ workStart: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">End</label>
              <input
                type="time"
                value={settings.workEnd}
                onChange={(e) => updateSettings({ workEnd: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Break buffer */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Break buffer between tasks
          </label>
          <p className="text-xs text-slate-400 mb-2">
            Minimum gap (in minutes) inserted between scheduled tasks.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="30"
              step="5"
              value={settings.breakMinutes}
              onChange={(e) => updateSettings({ breakMinutes: parseInt(e.target.value) })}
              className="flex-1 accent-blue-600"
            />
            <span className="text-sm font-medium text-slate-700 w-12 text-right">
              {settings.breakMinutes}m
            </span>
          </div>
        </div>

        {/* Mock Outlook note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <p className="text-xs text-blue-700">
            <strong>Outlook Integration:</strong> Currently using mock meeting data. Meetings are
            pre-populated for each day of the week and used for scheduling calculations.
          </p>
        </div>

        {/* Reset */}
        <div className="flex gap-3">
          <button
            onClick={resetSettings}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-400 px-4 py-2 rounded-lg transition-colors"
          >
            <RotateCcw size={14} />
            Reset settings
          </button>
          <button
            onClick={loadSeedTasks}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-400 px-4 py-2 rounded-lg transition-colors"
          >
            <FlaskConical size={14} />
            Load sample tasks
          </button>
        </div>
      </div>
    </div>
  );
}
