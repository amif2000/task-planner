import { useState } from 'react';
import type { Priority } from '../../types';
import { TASK_SESSION_DEFAULTS } from '../../types';
import { useTaskStore } from '../../store/useTaskStore';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface TaskFormProps {
  onClose: () => void;
  editId?: string;
}

const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

export default function TaskForm({ onClose, editId }: TaskFormProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);

  const editing = editId ? tasks.find((t) => t.id === editId) : undefined;

  const [title, setTitle] = useState(editing?.title ?? '');
  const [hours, setHours] = useState(editing ? String(Math.floor(editing.estimatedMinutes / 60)) : '0');
  const [minutes, setMinutes] = useState(editing ? String(editing.estimatedMinutes % 60) : '30');
  const [priority, setPriority] = useState<Priority>(editing?.priority ?? 'medium');

  const [minSession, setMinSession] = useState(
    String(editing?.minSessionMinutes ?? TASK_SESSION_DEFAULTS.minSessionMinutes)
  );
  const [maxSession, setMaxSession] = useState(
    String(editing?.maxSessionMinutes ?? TASK_SESSION_DEFAULTS.maxSessionMinutes)
  );
  const [maxSessionsPerDay, setMaxSessionsPerDay] = useState(
    editing?.maxSessionsPerDay != null ? String(editing.maxSessionsPerDay) : ''
  );

  const [showAdvanced, setShowAdvanced] = useState(
    !!(editing && (
      editing.minSessionMinutes !== TASK_SESSION_DEFAULTS.minSessionMinutes ||
      editing.maxSessionMinutes !== TASK_SESSION_DEFAULTS.maxSessionMinutes ||
      editing.maxSessionsPerDay !== null
    ))
  );
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    const totalMins = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (totalMins <= 0) { setError('Duration must be greater than 0'); return; }

    const minSess = Math.max(1, parseInt(minSession) || TASK_SESSION_DEFAULTS.minSessionMinutes);
    const maxSess = Math.max(minSess, parseInt(maxSession) || TASK_SESSION_DEFAULTS.maxSessionMinutes);
    const maxPerDay = maxSessionsPerDay.trim() === '' ? null : Math.max(1, parseInt(maxSessionsPerDay) || 1);

    if (editId) {
      updateTask(editId, {
        title: title.trim(),
        estimatedMinutes: totalMins,
        priority,
        minSessionMinutes: minSess,
        maxSessionMinutes: maxSess,
        maxSessionsPerDay: maxPerDay,
      });
    } else {
      addTask(title.trim(), totalMins, priority, {
        minSessionMinutes: minSess,
        maxSessionMinutes: maxSess,
        maxSessionsPerDay: maxPerDay,
      });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            {editId ? 'Edit Task' : 'Add Task'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Write unit tests"
              autoFocus
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Total Estimated Duration</label>
            <div className="flex gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="number" min="0" max="99" value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-16 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-500">h</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number" min="0" max="59" step="5" value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-16 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-500">m</span>
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p} type="button" onClick={() => setPriority(p)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium border capitalize transition-colors
                    ${priority === p
                      ? p === 'high' ? 'bg-red-500 text-white border-red-500'
                        : p === 'medium' ? 'bg-orange-400 text-white border-orange-400'
                        : 'bg-green-500 text-white border-green-500'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Session settings (collapsible) */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span>Session settings</span>
              {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showAdvanced && (
              <div className="px-4 pb-4 pt-1 flex flex-col gap-3 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  Long tasks are split into work sessions. Configure how each session is sized.
                </p>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Min session</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="5" max="240" step="5" value={minSession}
                        onChange={(e) => setMinSession(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-400 shrink-0">min</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Max session</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="5" max="480" step="5" value={maxSession}
                        onChange={(e) => setMaxSession(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-400 shrink-0">min</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Max sessions per day <span className="text-slate-400">(leave blank for unlimited)</span>
                  </label>
                  <input
                    type="number" min="1" max="20" value={maxSessionsPerDay}
                    onChange={(e) => setMaxSessionsPerDay(e.target.value)}
                    placeholder="Unlimited"
                    className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700"
            >
              {editId ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
