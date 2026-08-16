import type { Task } from '../types';

// Fixed IDs so re-seeding is idempotent
export const SEED_TASKS: Omit<Task, 'createdAt' | 'completedMinutes' | 'completedSessions'>[] = [
  // High priority — urgent, short tasks
  {
    id: 'seed-1', title: 'Fix login bug reported by QA',
    estimatedMinutes: 45, priority: 'high', status: 'in-progress',
    minSessionMinutes: 30, maxSessionMinutes: 120, maxSessionsPerDay: null,
  },
  {
    id: 'seed-2', title: 'Review & merge auth PR',
    estimatedMinutes: 30, priority: 'high', status: 'todo',
    minSessionMinutes: 30, maxSessionMinutes: 120, maxSessionsPerDay: null,
  },

  // High priority — long task that must be split across sessions
  {
    id: 'seed-3', title: 'Implement new authentication flow',
    estimatedMinutes: 240, priority: 'high', status: 'todo',
    minSessionMinutes: 45, maxSessionMinutes: 90, maxSessionsPerDay: null,
  },

  // Medium priority
  {
    id: 'seed-4', title: 'Write technical design document',
    estimatedMinutes: 180, priority: 'medium', status: 'todo',
    minSessionMinutes: 30, maxSessionMinutes: 60, maxSessionsPerDay: 2,
  },
  {
    id: 'seed-5', title: 'Refactor API error handling',
    estimatedMinutes: 90, priority: 'medium', status: 'todo',
    minSessionMinutes: 30, maxSessionMinutes: 120, maxSessionsPerDay: null,
  },
  {
    id: 'seed-6', title: 'Update unit tests for user module',
    estimatedMinutes: 60, priority: 'medium', status: 'todo',
    minSessionMinutes: 30, maxSessionMinutes: 120, maxSessionsPerDay: null,
  },
  {
    id: 'seed-7', title: 'Database migration script',
    estimatedMinutes: 150, priority: 'medium', status: 'todo',
    minSessionMinutes: 30, maxSessionMinutes: 60, maxSessionsPerDay: null,
  },

  // Low priority
  {
    id: 'seed-8', title: 'Document new endpoints in Swagger',
    estimatedMinutes: 40, priority: 'low', status: 'todo',
    minSessionMinutes: 20, maxSessionMinutes: 120, maxSessionsPerDay: null,
  },
  {
    id: 'seed-9', title: 'Clean up unused feature flags',
    estimatedMinutes: 25, priority: 'low', status: 'todo',
    minSessionMinutes: 25, maxSessionMinutes: 120, maxSessionsPerDay: null,
  },
  {
    id: 'seed-10', title: 'Read architecture RFC draft',
    estimatedMinutes: 20, priority: 'low', status: 'done',
    minSessionMinutes: 20, maxSessionMinutes: 120, maxSessionsPerDay: null,
  },
];
