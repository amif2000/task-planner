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
  /** True when this block is an already-completed session */
  completed?: boolean;
  /** Local ISO date "YYYY-MM-DD" this block belongs to */
  date: string;
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

export default function TaskBlock({ task, start, end, workStart, workEnd, sessionIndex, sessionTotal, completed, date }: TaskBlockProps) {
  const completeSession = useTaskStore((s) => s.completeSession);
  const uncompleteSession = useTaskStore((s) => s.uncompleteSession);
  const totalMins = toMinutes(workEnd) - toMinutes(workStart);
  const top = ((toMinutes(start) - toMinutes(workStart)) / totalMins) * 100;
  const height = ((toMinutes(end) - toMinutes(start)) / totalMins) * 100;
  const durationMins = toMinutes(end) - toMinutes(start);
  const isMultiSession = sessionTotal !== undefined && sessionTotal > 1;
  const completedMins = task.completedMinutes ?? 0;

  const handleClick = () => {
    if (completed) {
      uncompleteSession(task.id, date, start);
    } else {
      completeSession(task.id, { date, start, end, minutes: durationMins });
    }
  };

  return (
    <div
      className={`absolute left-0 right-0 mx-1 border rounded-md px-2 py-1 overflow-hidden cursor-pointer hover:brightness-95 transition-all
        ${PRIORITY_STYLES[task.priority]}
        ${completed ? 'opacity-70 ring-2 ring-inset ring-green-500/60' : ''}`}
      style={{ top: `${top}%`, height: `${height}%`, minHeight: '28px' }}
      onClick={handleClick}
      title={
        completed
          ? `✓ Completed ${formatDuration(durationMins)} session · ${task.title} · click to undo`
          : `Click to mark this ${formatDuration(durationMins)} session done · ${task.title}${isMultiSession ? ` (session ${sessionIndex}/${sessionTotal})` : ''} · ${completedMins}/${task.estimatedMinutes}m done`
      }
      role="button"
      aria-label={
        completed
          ? `${task.title} — completed ${durationMins} minute session. Click to undo.`
          : `${task.title}${isMultiSession ? `, session ${sessionIndex} of ${sessionTotal}` : ''} — ${completedMins} of ${task.estimatedMinutes} minutes done. Click to mark this ${durationMins} minute session complete.`
      }
    >
      <p className={`text-xs font-semibold truncate ${completed ? 'line-through' : ''}`}>
        {completed ? '✓' : STATUS_ICON[task.status]} {task.title}
      </p>
      {durationMins >= 20 && (
        <p className="text-xs opacity-75 flex items-center gap-1">
          <span>{formatTime(start)} · {formatDuration(durationMins)}</span>
          {isMultiSession && !completed && (
            <span className="font-semibold">· {sessionIndex}/{sessionTotal}</span>
          )}
          {completedMins > 0 && (
            <span className="font-semibold">· {completedMins}/{task.estimatedMinutes}m</span>
          )}
        </p>
      )}
    </div>
  );
}
