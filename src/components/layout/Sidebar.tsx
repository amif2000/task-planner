import { CalendarDays, CheckSquare, BarChart2, Settings } from 'lucide-react';
import type { View } from '../../types';

interface SidebarProps {
  current: View;
  onChange: (v: View) => void;
}

const NAV: { view: View; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
  { view: 'timeline', label: 'Today', Icon: CalendarDays },
  { view: 'tasks', label: 'Tasks', Icon: CheckSquare },
  { view: 'progress', label: 'Progress', Icon: BarChart2 },
  { view: 'settings', label: 'Settings', Icon: Settings },
];

export default function Sidebar({ current, onChange }: SidebarProps) {
  return (
    <aside className="flex flex-col w-16 md:w-52 min-h-screen bg-slate-900 text-slate-200 shrink-0">
      <div className="px-4 py-5 hidden md:block">
        <span className="font-bold text-lg tracking-tight text-white">TaskPlanner</span>
      </div>
      <div className="px-4 py-5 md:hidden flex justify-center">
        <span className="font-bold text-white text-xl">T</span>
      </div>
      <nav className="flex flex-col gap-1 px-2 flex-1">
        {NAV.map(({ view, label, Icon }) => (
          <button
            key={view}
            onClick={() => onChange(view)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left
              ${current === view
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            aria-current={current === view ? 'page' : undefined}
          >
            <Icon size={18} className="shrink-0" />
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
