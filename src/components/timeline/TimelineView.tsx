import { useMemo, useEffect, useState } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useDateStore } from '../../store/useDateStore';
import {
  refreshMeetings,
  getCachedMeetingsForDate,
  type MeetingSource,
} from '../../data/meetings';
import { getScheduleForDate } from '../../utils/scheduler';
import { getHourMarks, toMinutes, formatTime } from '../../utils/timeUtils';
import MeetingBlock from './MeetingBlock';
import TaskBlock from './TaskBlock';
import { CalendarX, Wifi, WifiOff } from 'lucide-react';

export default function TimelineView() {
  const tasks = useTaskStore((s) => s.tasks);
  const { settings } = useSettingsStore();
  const { selectedDate } = useDateStore();
  const { workStart, workEnd } = settings;

  const [source, setSource] = useState<MeetingSource>('mock');
  const [meetingsReady, setMeetingsReady] = useState(false);

  // Fetch / refresh meetings whenever the selected date changes
  useEffect(() => {
    setMeetingsReady(false);
    refreshMeetings(selectedDate).then((src) => {
      setSource(src);
      setMeetingsReady(true);
    });
  }, [selectedDate]);

  // Also re-fetch every 5 minutes while the view is open
  useEffect(() => {
    const id = setInterval(() => {
      refreshMeetings(selectedDate).then(setSource);
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [selectedDate]);

  const dayMeetings = useMemo(
    () => (meetingsReady ? getCachedMeetingsForDate(selectedDate) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDate, meetingsReady],
  );

  const schedule = useMemo(
    () => getScheduleForDate(tasks, selectedDate, settings, getCachedMeetingsForDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, selectedDate, settings, meetingsReady],
  );

  const hourMarks = getHourMarks(workStart, workEnd);
  const totalMins = toMinutes(workEnd) - toMinutes(workStart);

  return (
    <div className="flex gap-6 h-full">
      {/* Timeline column */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">Day Schedule</h2>
          <span
            className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border
              ${source === 'outlook'
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : 'text-slate-500 bg-slate-100 border-slate-200'}`}
            title={source === 'outlook' ? 'Live Outlook calendar' : 'Mock meeting data — start the companion for live data'}
          >
            {source === 'outlook'
              ? <><Wifi size={11} /> Outlook</>
              : <><WifiOff size={11} /> Mock data</>}
          </span>
        </div>

        <div
          className="relative bg-white border border-slate-200 rounded-xl overflow-hidden"
          style={{ height: '600px' }}
        >
          {hourMarks.map((mark) => {
            const top = ((toMinutes(mark) - toMinutes(workStart)) / totalMins) * 100;
            return (
              <div
                key={mark}
                className="absolute left-0 right-0 border-t border-slate-100"
                style={{ top: `${top}%` }}
              >
                <span className="absolute -top-2.5 left-2 text-xs text-slate-400 select-none">
                  {formatTime(mark)}
                </span>
              </div>
            );
          })}

          <div className="absolute inset-0 ml-14">
            {schedule.slots.map((slot, i) => {
              if (slot.type === 'meeting' && slot.meeting) {
                return (
                  <MeetingBlock
                    key={`m-${slot.meeting.id}-${i}`}
                    meeting={slot.meeting}
                    workStart={workStart}
                    workEnd={workEnd}
                  />
                );
              }
              if (slot.type === 'task' && slot.task) {
                return (
                  <TaskBlock
                    key={`t-${slot.task.id}-${slot.sessionIndex ?? 0}-${i}`}
                    task={slot.task}
                    start={slot.start}
                    end={slot.end}
                    workStart={workStart}
                    workEnd={workEnd}
                    sessionIndex={slot.sessionIndex}
                    sessionTotal={slot.sessionTotal}
                  />
                );
              }
              return null;
            })}
          </div>
        </div>

        {dayMeetings.length === 0 && (
          <p className="text-sm text-slate-400 mt-3 flex items-center gap-1">
            <CalendarX size={14} /> No meetings this day
          </p>
        )}
      </div>

      {/* Side panel */}
      <div className="w-64 shrink-0">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Unscheduled</h2>
        {schedule.unscheduled.length === 0 ? (
          <p className="text-sm text-slate-400">All tasks fit in the day 🎉</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {schedule.unscheduled.map(({ task, scheduledMinutes, remainingMinutes }) => (
              <li key={task.id} className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                <p className="text-sm font-medium text-slate-700 truncate">{task.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {remainingMinutes}m remaining
                  {scheduledMinutes > 0 && (
                    <span className="text-blue-500"> · {scheduledMinutes}m scheduled</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">Meetings</h3>
          {dayMeetings.length === 0 ? (
            <p className="text-xs text-slate-400">None</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {dayMeetings.map((m) => (
                <li key={m.id} className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{m.title}</span>
                  <br />
                  {formatTime(m.start)} – {formatTime(m.end)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
