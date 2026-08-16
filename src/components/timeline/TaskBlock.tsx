import type { Task } from '../../types';
import { formatTime, formatDuration, toMinutes } from '../../utils/timeUtils';
import { useTaskStore } from '../../store/useTaskStore';

interface TaskBlockProps {
  task: Task;
  start: string;
  end: string;
  workStart: string;
  workEnd: string;
  sessionIndex?: number;
  sessionTotal?: number;
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-100 border-red-400 text-red-800',
  medium: 'bg-orange-100 border-orange-400 text-orange-800',
  low: 'bg-green-100 border-green-400 text-green-800',
};

const STATUS_ICON: Record<string, string> = {
  'todo': '○',
  'in-progress': '◑',
  'done': '●',
};

export default function TaskBlock({ task, start, end, workStart, workEnd, sessionIndex, sessionTotal }: TaskBlockProps) {
  const cycleStatus = useTaskStore((s) => s.cycleStatus);
  const totalMins = toMinutes(workEnd) - toMinutes(workStart);
  const top = ((toMinutes(start) - toMinutes(workStart)) / totalMins) * 100;
  const height = ((toMinutes(end) - toMinutes(start)) / totalMins) * 100;
  const durationMins = toMinutes(end) - toMinutes(start);
  const isMultiSession = sessionTotal !== undefined && sessionTotal > 1;

  return (
    <div
      className={`absolute left-0 right-0 mx-1 border rounded-md px-2 py-1 overflow-hidden cursor-pointer hover:brightness-95 transition-all
        ${PRIORITY_STYLES[task.priority]}
        ${task.status === 'done' ? 'opacity-60' : ''}`}
      style={{ top: `${top}%`, height: `${height}%`, minHeight: '28px' }}
      onClick={() => cycleStatus(task.id)}
      title={`Click to cycle status · ${task.title}${isMultiSession ? ` (session ${sessionIndex}/${sessionTotal})` : ''}`}
      role="button"
      aria-label={`${task.title}${isMultiSession ? `, session ${sessionIndex} of ${sessionTotal}` : ''} — ${task.status}. Click to advance status.`}
    >
      <p className={`text-xs font-semibold truncate ${task.status === 'done' ? 'line-through' : ''}`}>
        {STATUS_ICON[task.status]} {task.title}
      </p>
      {durationMins >= 20 && (
        <p className="text-xs opacity-75 flex items-center gap-1">
          <span>{formatTime(start)} · {formatDuration(durationMins)}</span>
          {isMultiSession && (
            <span className="font-semibold">· {sessionIndex}/{sessionTotal}</span>
          )}
        </p>
      )}
    </div>
  );
}
