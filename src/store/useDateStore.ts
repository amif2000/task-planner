import { create } from 'zustand';

interface DateStore {
  selectedDate: Date;
  goToPrev: () => void;
  goToNext: () => void;
  goToToday: () => void;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export const useDateStore = create<DateStore>((set) => ({
  selectedDate: new Date(),

  goToPrev: () => set((s) => ({ selectedDate: addDays(s.selectedDate, -1) })),
  goToNext: () => set((s) => ({ selectedDate: addDays(s.selectedDate, 1) })),
  goToToday: () => set({ selectedDate: new Date() }),
}));

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}
