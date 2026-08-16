import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { useDateStore, isToday } from '../../store/useDateStore';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Header() {
  const tasks = useTaskStore((s) => s.tasks);
  const { selectedDate, goToPrev, goToNext, goToToday } = useDateStore();

  const done = tasks.filter((t) => t.status === 'done').length;
  const total = tasks.length;

  const dayName = WEEKDAYS[selectedDate.getDay()];
  const dateLabel = `${dayName}, ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}`;
  const todayFlag = isToday(selectedDate);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={goToPrev}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-900 min-w-52">{dateLabel}</h1>
          {!todayFlag && (
            <button
              onClick={goToToday}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2 py-0.5 rounded-md transition-colors"
            >
              Today
            </button>
          )}
          {todayFlag && (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              Today
            </span>
          )}
        </div>

        <button
          onClick={goToNext}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Next day"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Progress summary */}
      {total > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{done}/{total} done</span>
          <div className="w-28 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
