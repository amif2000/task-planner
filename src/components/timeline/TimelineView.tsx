import { useMemo, useEffect, useState, useCallback } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useDateStore } from '../../store/useDateStore';
import {
  refreshMeetings,
  getCachedMeetingsForDate,
  type MeetingSource,
} from '../../data/meetings';
import { getScheduleForDate } from '../../utils/scheduler';
import { getHourMarks, toMinutes, toTimeString, formatTime } from '../../utils/timeUtils';
import { syncTasksToOutlook, syncAllTasksToOutlook, toLocalISODate } from '../../utils/outlookSync';
import MeetingBlock from './MeetingBlock';
import TaskBlock from './TaskBlock';
import { CalendarX, Wifi, WifiOff, Upload, Loader, Calendar, RefreshCw } from 'lucide-react';

const TIMELINE_PADDING_MINUTES = 60;

export default function TimelineView() {
  const tasks = useTaskStore((s) => s.tasks);
  const { settings } = useSettingsStore();
  const { selectedDate } = useDateStore();
  const { workStart, workEnd } = settings;
  const selectedDateKey = toLocalISODate(selectedDate);

  const [source, setSource] = useState<MeetingSource>('mock');
  const [readyDateKey, setReadyDateKey] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  // Bumped after every successful meeting refresh to force schedule recompute
  const [refreshTick, setRefreshTick] = useState(0);
  const meetingsReady = readyDateKey === selectedDateKey;

  // Refresh meetings from the companion, then trigger a schedule recompute
  const runRefresh = useCallback((force = false) => {
    setIsRefreshing(true);
    setCalendarError(null);
    return refreshMeetings(selectedDate, 14, force)
      .then((src) => {
        setSource(src);
        setLastSyncedAt(new Date());
        setRefreshTick((t) => t + 1);
        return true;
      })
      .catch((error) => {
        setCalendarError(error instanceof Error ? error.message : 'Failed to load Outlook meetings');
        return false;
      })
      .finally(() => setIsRefreshing(false));
  }, [selectedDate]);

  // Fetch / refresh meetings whenever the selected date changes
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve()
      .then(() => runRefresh())
      .then((loaded) => {
        if (loaded && !cancelled) setReadyDateKey(selectedDateKey);
      });
    return () => {
      cancelled = true;
    };
  }, [runRefresh, selectedDateKey]);

  // Also re-fetch every 60 seconds while the view is open
  useEffect(() => {
    const id = setInterval(() => void runRefresh(), 60 * 1000);
    return () => clearInterval(id);
  }, [runRefresh]);

  const dayMeetings = useMemo(
    () => (meetingsReady ? getCachedMeetingsForDate(selectedDate) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDate, meetingsReady, refreshTick],
  );

  const schedule = useMemo(
    () => meetingsReady
      ? getScheduleForDate(tasks, selectedDate, settings, getCachedMeetingsForDate)
      : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, selectedDate, settings, meetingsReady, refreshTick],
  );

  const handleSyncToOutlook = async () => {
    if (!schedule) {
      setSyncStatus({ type: 'error', message: 'Wait for Outlook meetings to finish loading.' });
      return;
    }
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const dateStr = toLocalISODate(selectedDate);
      const result = await syncTasksToOutlook(schedule.slots, dateStr);
      setSyncStatus({
        type: 'success',
        message: `Deleted ${result.deleted} old meetings. Created ${result.created} new meetings.`,
      });
      // Refresh meetings from Outlook after sync (also recomputes schedule)
      setTimeout(() => void runRefresh(), 1000);
    } catch (err) {
      setSyncStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Sync failed',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncAllDays = async () => {
    if (!meetingsReady) {
      setSyncStatus({ type: 'error', message: 'Wait for Outlook meetings to finish loading.' });
      return;
    }
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const result = await syncAllTasksToOutlook(tasks, settings);
      setSyncStatus({
        type: 'success',
        message: `Synced across multiple days. Deleted ${result.deleted} old meetings. Created ${result.created} new meetings.`,
      });
      // Refresh meetings from Outlook after sync (also recomputes schedule)
      setTimeout(() => void runRefresh(), 1000);
    } catch (err) {
      setSyncStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Sync failed',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const timelineStart = toTimeString(Math.max(0, toMinutes(workStart) - TIMELINE_PADDING_MINUTES));
  const timelineEnd = toTimeString(Math.min(24 * 60, toMinutes(workEnd) + TIMELINE_PADDING_MINUTES));
  const hourMarks = getHourMarks(timelineStart, timelineEnd);
  const totalMins = toMinutes(timelineEnd) - toMinutes(timelineStart);

  return (
    <div className="flex gap-6 h-full">
      {/* Timeline column */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">Day Schedule</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={handleSyncToOutlook}
                disabled={isSyncing || !meetingsReady}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Sync today's task sessions to Outlook (clears old ones first)"
              >
                {isSyncing ? (
                  <>
                    <Loader size={12} className="animate-spin" /> Syncing...
                  </>
                ) : (
                  <>
                    <Upload size={12} /> Today
                  </>
                )}
              </button>
              <button
                onClick={handleSyncAllDays}
                disabled={isSyncing || !meetingsReady}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Sync all upcoming days until all tasks are allocated (clears old ones first)"
              >
                {isSyncing ? (
                  <>
                    <Loader size={12} className="animate-spin" /> Syncing...
                  </>
                ) : (
                  <>
                    <Calendar size={12} /> All Days
                  </>
                )}
              </button>
            </div>
            <span
              className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border
                ${!meetingsReady
                  ? 'text-blue-700 bg-blue-50 border-blue-200'
                  : source === 'outlook'
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-slate-500 bg-slate-100 border-slate-200'}`}
              title={!meetingsReady
                ? 'Waiting for calendar data before scheduling'
                : source === 'outlook'
                  ? 'Live Outlook calendar'
                  : 'Mock meeting data — start the companion for live data'}
            >
              {!meetingsReady
                ? calendarError
                  ? <><WifiOff size={11} /> Outlook unavailable</>
                  : <><Loader size={11} className="animate-spin" /> Loading calendar…</>
                : source === 'outlook'
                ? <><Wifi size={11} /> Outlook</>
                : <><WifiOff size={11} /> Mock data</>}
            </span>
            {/* Refresh indicator + last-synced timestamp */}
            <button
              onClick={() => void runRefresh()}
              disabled={isRefreshing}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 disabled:cursor-default transition-colors"
              title="Refresh meetings from Outlook now"
            >
              <RefreshCw size={11} className={isRefreshing ? 'animate-spin text-blue-500' : ''} />
              {isRefreshing
                ? <span className="text-blue-500">Updating…</span>
                : lastSyncedAt
                  ? <span>Updated {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  : <span>—</span>}
            </button>
          </div>
        </div>

        {syncStatus && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              syncStatus.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {syncStatus.message}
          </div>
        )}

        <div
          className="relative bg-white border border-slate-200 rounded-xl overflow-hidden"
          style={{ height: '600px' }}
        >
          {hourMarks.map((mark) => {
            const top = ((toMinutes(mark) - toMinutes(timelineStart)) / totalMins) * 100;
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
            {schedule?.slots.map((slot, i) => {
              if (slot.type === 'meeting' && slot.meeting) {
                return (
                  <MeetingBlock
                    key={`m-${slot.meeting.id}-${i}`}
                    meeting={slot.meeting}
                    timelineStart={timelineStart}
                    timelineEnd={timelineEnd}
                  />
                );
              }
              if (slot.type === 'task' && slot.task) {
                return (
                  <TaskBlock
                    key={`t-${slot.task.id}-${slot.completed ? 'done' : slot.sessionIndex ?? 0}-${i}`}
                    task={slot.task}
                    start={slot.start}
                    end={slot.end}
                    timelineStart={timelineStart}
                    timelineEnd={timelineEnd}
                    sessionIndex={slot.sessionIndex}
                    sessionTotal={slot.sessionTotal}
                    completed={slot.completed}
                    date={toLocalISODate(selectedDate)}
                  />
                );
              }
              return null;
            })}
          </div>

          {!meetingsReady && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/85 backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-2 text-sm font-medium text-slate-600">
                {calendarError
                  ? <WifiOff size={24} className="text-red-500" />
                  : <Loader size={24} className="animate-spin text-blue-500" />}
                <span>{calendarError ?? 'Loading Outlook meetings before scheduling…'}</span>
                {calendarError && (
                  <button
                    onClick={() => void runRefresh(true)}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {meetingsReady && dayMeetings.length === 0 && (
          <p className="text-sm text-slate-400 mt-3 flex items-center gap-1">
            <CalendarX size={14} /> No meetings this day
          </p>
        )}
      </div>

      {/* Side panel */}
      <div className="w-64 shrink-0">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Unscheduled</h2>
        {!schedule ? (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <Loader size={14} className="animate-spin" /> Waiting for meetings…
          </p>
        ) : schedule.unscheduled.length === 0 ? (
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
          {!meetingsReady ? (
            <p className="text-xs text-slate-400">Loading from calendar…</p>
          ) : dayMeetings.length === 0 ? (
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
