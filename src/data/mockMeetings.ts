import type { Meeting } from '../types';

export const mockMeetings: Meeting[] = [
  // Sunday
  { id: 'm1', title: 'Weekly Kickoff', start: '09:00', end: '09:30', dayOfWeek: 0 },
  { id: 'm2', title: 'Sprint Planning', start: '10:00', end: '11:30', dayOfWeek: 0 },

  // Monday
  { id: 'm3', title: 'Daily Standup', start: '09:00', end: '09:15', dayOfWeek: 1 },
  { id: 'm4', title: '1:1 with Manager', start: '11:00', end: '11:30', dayOfWeek: 1 },
  { id: 'm5', title: 'Design Review', start: '14:00', end: '15:00', dayOfWeek: 1 },

  // Tuesday
  { id: 'm6', title: 'Daily Standup', start: '09:00', end: '09:15', dayOfWeek: 2 },
  { id: 'm7', title: 'Architecture Sync', start: '10:00', end: '11:00', dayOfWeek: 2 },
  { id: 'm8', title: 'Lunch & Learn', start: '12:30', end: '13:30', dayOfWeek: 2 },

  // Wednesday
  { id: 'm9',  title: 'Daily Standup', start: '09:00', end: '09:15', dayOfWeek: 3 },
  { id: 'm10', title: 'Product Demo', start: '13:00', end: '14:00', dayOfWeek: 3 },
  { id: 'm11', title: 'Team Retrospective', start: '15:00', end: '16:00', dayOfWeek: 3 },

  // Thursday
  { id: 'm12', title: 'Daily Standup', start: '09:00', end: '09:15', dayOfWeek: 4 },
  { id: 'm13', title: 'Code Review', start: '11:30', end: '12:00', dayOfWeek: 4 },
  { id: 'm14', title: 'Weekly Wrap-up', start: '15:30', end: '16:00', dayOfWeek: 4 },
];

export function getTodaysMeetings(): Meeting[] {
  const today = new Date().getDay();
  return mockMeetings.filter((m) => m.dayOfWeek === today);
}

export function getMeetingsForDay(dayOfWeek: number): Meeting[] {
  return mockMeetings.filter((m) => m.dayOfWeek === dayOfWeek);
}
