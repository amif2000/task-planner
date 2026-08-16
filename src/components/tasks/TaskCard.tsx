import type { Task, TaskStatus } from '../../types';
import { useTaskStore } from '../../store/useTaskStore';
import { formatDuration } from '../../utils/timeUtils';
import { Pencil, Trash2 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onEdit: (id: string) => void;
}

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-orange-100 text-orange-700',
  low: 'bg-green-100 text-green-700',
};

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'in-progress', 'done'];
const STATUS_LABELS: Record<TaskStatus, string> = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'done': 'Done',
};

export default function TaskCard({ task, onEdit }: TaskCardProps) {
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-3 px-4 text-sm text-slate-800 max-w-xs">
        <span className={task.status === 'done' ? 'line-through text-slate-400' : ''}>
          {task.title}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
        {formatDuration(task.estimatedMinutes)}
      </td>
      <td className="py-3 px-4">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${PRIORITY_BADGE[task.priority]}`}>
          {task.priority}
        </span>
      </td>
      <td className="py-3 px-4">
        <select
          value={task.status}
          onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}
          className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(task.id)}
            className="text-slate-400 hover:text-blue-600 transition-colors"
            aria-label={`Edit ${task.title}`}
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => deleteTask(task.id)}
            className="text-slate-400 hover:text-red-600 transition-colors"
            aria-label={`Delete ${task.title}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
