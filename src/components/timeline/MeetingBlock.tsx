import type { Meeting } from '../../types';
import { formatTime, formatDuration, toMinutes } from '../../utils/timeUtils';

interface MeetingBlockProps {
  meeting: Meeting;
  workStart: string;
  workEnd: string;
}

export default function MeetingBlock({ meeting, workStart, workEnd }: MeetingBlockProps) {
  const totalMins = toMinutes(workEnd) - toMinutes(workStart);
  const top = ((toMinutes(meeting.start) - toMinutes(workStart)) / totalMins) * 100;
  const height = ((toMinutes(meeting.end) - toMinutes(meeting.start)) / totalMins) * 100;
  const durationMins = toMinutes(meeting.end) - toMinutes(meeting.start);

  return (
    <div
      className="absolute left-0 right-0 mx-1 bg-slate-200 border border-slate-300 rounded-md px-2 py-1 overflow-hidden"
      style={{ top: `${top}%`, height: `${height}%`, minHeight: '24px' }}
      title={`${meeting.title} · ${formatTime(meeting.start)} – ${formatTime(meeting.end)}`}
    >
      <p className="text-xs font-medium text-slate-600 truncate">{meeting.title}</p>
      {durationMins >= 20 && (
        <p className="text-xs text-slate-500">
          {formatTime(meeting.start)} · {formatDuration(durationMins)}
        </p>
      )}
    </div>
  );
}
