import { useTaskStore } from '../../store/useTaskStore';
import ProgressBar from './ProgressBar';
import { formatDuration } from '../../utils/timeUtils';
import { Trash2, CheckCircle2 } from 'lucide-react';
import type { Priority } from '../../types';

const PRIORITY_STYLES: Record<Priority, { bar: string; badge: string; label: string }> = {
  high:   { bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700',    label: 'High' },
  medium: { bar: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700', label: 'Medium' },
  low:    { bar: 'bg-green-500',  badge: 'bg-green-100 text-green-700', label: 'Low' },
};

export default function ProgressDashboard() {
  const tasks = useTaskStore((s) => s.tasks);
  const clearDone = useTaskStore((s) => s.clearDone);

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
  const todo = tasks.filter((t) => t.status === 'todo').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const totalMins = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const doneMins = tasks.filter((t) => t.status === 'done').reduce((sum, t) => sum + t.estimatedMinutes, 0);

  const priorities: Priority[] = ['high', 'medium', 'low'];

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <CheckCircle2 size={40} className="mb-3 opacity-40" />
        <p className="text-sm">No tasks yet. Add some in the Tasks view!</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      {/* Overall progress card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-3xl font-bold text-slate-900">{pct}%</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {done} of {total} tasks complete
            </p>
          </div>
          {done > 0 && (
            <button
              onClick={clearDone}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              Clear done
            </button>
          )}
        </div>
        <ProgressBar value={pct} height="h-4" />
        <div className="flex gap-6 mt-4 text-sm text-slate-600">
          <span>📋 To Do: <strong>{todo}</strong></span>
          <span>⚡ In Progress: <strong>{inProgress}</strong></span>
          <span>✅ Done: <strong>{done}</strong></span>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Time: {formatDuration(doneMins)} done / {formatDuration(totalMins)} total
        </p>
      </div>

      {/* Priority breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Breakdown by Priority</h3>
        <div className="flex flex-col gap-4">
          {priorities.map((p) => {
            const pTasks = tasks.filter((t) => t.priority === p);
            const pDone = pTasks.filter((t) => t.status === 'done').length;
            const pPct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
            const style = PRIORITY_STYLES[p];
            return (
              <div key={p}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                    {style.label}
                  </span>
                  <span className="text-xs text-slate-500">
                    {pDone}/{pTasks.length} · {pPct}%
                  </span>
                </div>
                <ProgressBar value={pPct} colorClass={style.bar} height="h-2" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Task list with statuses */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">All Tasks</h3>
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3 text-sm">
              <span className="text-lg leading-none">
                {task.status === 'done' ? '✅' : task.status === 'in-progress' ? '⚡' : '📋'}
              </span>
              <span className={`flex-1 ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {task.title}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${PRIORITY_STYLES[task.priority].badge}`}>
                {task.priority}
              </span>
              <span className="text-xs text-slate-400">{formatDuration(task.estimatedMinutes)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
