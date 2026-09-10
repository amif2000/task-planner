import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { SEED_TASKS } from '../src/data/seedTasks.ts';

dotenv.config();

const PORT = Number(process.env.API_PORT || 3002);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const DB_NAME = process.env.MONGODB_DB_NAME || 'task_planner';
const COLLECTION_NAME = process.env.MONGODB_COLLECTION_NAME || 'tasks';
const SETTINGS_COLLECTION_NAME = process.env.MONGODB_SETTINGS_COLLECTION_NAME || 'settings';
const TASKS_LOCAL_STORAGE_KEY = 'task-planner-tasks';

const STATUS_CYCLE = {
  'todo': 'in-progress',
  'in-progress': 'done',
  'done': 'todo',
};

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function buildMongoUri() {
  if (process.env.MONGODB_ATLAS_URI) return process.env.MONGODB_ATLAS_URI;
  const username = encodeURIComponent(required('MONGODB_USERNAME'));
  const password = encodeURIComponent(required('MONGODB_PASSWORD'));
  const host = required('MONGODB_URI').replace(/^(\*+)/, '');
  return `mongodb+srv://${username}:${password}@${host}/?retryWrites=true&w=majority&appName=task-planner`;
}

function normalizeTask(task, now = new Date().toISOString()) {
  const estimatedMinutes = Number(task.estimatedMinutes);
  if (!task.title || Number.isNaN(estimatedMinutes) || estimatedMinutes <= 0) {
    throw new Error('Task must include a valid title and estimatedMinutes > 0');
  }

  const completedSessions = Array.isArray(task.completedSessions) ? task.completedSessions : [];
  const sessionSum = completedSessions.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
  const completedMinutesRaw = task.completedMinutes == null ? sessionSum : Number(task.completedMinutes);
  const completedMinutes = Math.max(0, Math.min(estimatedMinutes, Number.isNaN(completedMinutesRaw) ? 0 : completedMinutesRaw));
  const status = completedMinutes >= estimatedMinutes ? 'done' : (task.status || 'todo');

  return {
    id: task.id || randomUUID(),
    title: String(task.title).trim(),
    estimatedMinutes,
    priority: task.priority || 'medium',
    status,
    createdAt: task.createdAt || now,
    minSessionMinutes: Number(task.minSessionMinutes) || 30,
    maxSessionMinutes: Math.max(Number(task.maxSessionMinutes) || 120, Number(task.minSessionMinutes) || 30),
    maxSessionsPerDay: task.maxSessionsPerDay == null ? null : Math.max(1, Number(task.maxSessionsPerDay) || 1),
    completedMinutes,
    completedSessions,
  };
}

const client = new MongoClient(buildMongoUri());
await client.connect();
const db = client.db(DB_NAME);
const collection = db.collection(COLLECTION_NAME);
const settingsCollection = db.collection(SETTINGS_COLLECTION_NAME);
await collection.createIndex({ id: 1 }, { unique: true });
await settingsCollection.createIndex({ id: 1 }, { unique: true });
await settingsCollection.updateOne(
  { id: 'global' },
  {
    $setOnInsert: {
      id: 'global',
      workStart: '08:00',
      workEnd: '17:00',
      breakMinutes: 10,
      dayOverrides: {},
    },
  },
  { upsert: true },
);

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: [CLIENT_ORIGIN, 'http://127.0.0.1:5173'] }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', source: 'task-planner-api' });
});

app.get('/api/tasks', async (_req, res) => {
  const tasks = await collection.find({}, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray();
  res.json(tasks);
});

app.get('/api/settings', async (_req, res) => {
  const settings = await settingsCollection.findOne({ id: 'global' }, { projection: { _id: 0, id: 0 } });
  res.json(settings ?? {
    workStart: '08:00',
    workEnd: '17:00',
    breakMinutes: 10,
    dayOverrides: {},
  });
});

app.post('/api/settings/import-local', async (req, res) => {
  const settings = req.body?.settings;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Body must include settings object' });
  }
  const next = {
    workStart: String(settings.workStart ?? '08:00'),
    workEnd: String(settings.workEnd ?? '17:00'),
    breakMinutes: Number(settings.breakMinutes ?? 10),
    dayOverrides: settings.dayOverrides && typeof settings.dayOverrides === 'object' ? settings.dayOverrides : {},
  };
  await settingsCollection.updateOne(
    { id: 'global' },
    { $set: next },
    { upsert: true },
  );
  res.json(next);
});

app.put('/api/settings', async (req, res) => {
  const payload = req.body || {};
  const next = {
    workStart: String(payload.workStart ?? '08:00'),
    workEnd: String(payload.workEnd ?? '17:00'),
    breakMinutes: Number(payload.breakMinutes ?? 10),
    dayOverrides: payload.dayOverrides && typeof payload.dayOverrides === 'object' ? payload.dayOverrides : {},
  };
  await settingsCollection.updateOne(
    { id: 'global' },
    { $set: next },
    { upsert: true },
  );
  res.json(next);
});

app.post('/api/tasks/import-local', async (req, res) => {
  const { tasks } = req.body || {};
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'Body must include tasks array' });
  }
  const existingCount = await collection.countDocuments();
  if (existingCount > 0) {
    return res.status(409).json({ error: 'Import refused because database is not empty' });
  }

  const now = new Date().toISOString();
  const docs = tasks.map((task) => normalizeTask(task, now));
  if (docs.length > 0) {
    await collection.insertMany(docs, { ordered: false });
  }
  res.json({ imported: docs.length, localStorageKey: TASKS_LOCAL_STORAGE_KEY });
});

app.post('/api/tasks', async (req, res) => {
  const task = normalizeTask(req.body);
  await collection.insertOne(task);
  res.status(201).json(task);
});

app.patch('/api/tasks/:id', async (req, res) => {
  const existing = await collection.findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  const merged = normalizeTask({ ...existing, ...req.body });
  await collection.updateOne({ id: req.params.id }, { $set: merged });
  res.json(merged);
});

app.delete('/api/tasks/:id', async (req, res) => {
  const result = await collection.deleteOne({ id: req.params.id });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Task not found' });
  res.status(204).send();
});

app.post('/api/tasks/:id/cycle-status', async (req, res) => {
  const task = await collection.findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const updated = { ...task, status: STATUS_CYCLE[task.status] || 'todo' };
  await collection.updateOne({ id: req.params.id }, { $set: updated });
  res.json(updated);
});

app.post('/api/tasks/clear-done', async (_req, res) => {
  const result = await collection.deleteMany({ status: 'done' });
  res.json({ deleted: result.deletedCount });
});

app.post('/api/tasks/:id/complete-session', async (req, res) => {
  const task = await collection.findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const session = req.body?.session;
  if (!session?.date || !session?.start || !session?.end || !session?.minutes) {
    return res.status(400).json({ error: 'Body must include session {date,start,end,minutes}' });
  }
  const existing = Array.isArray(task.completedSessions) ? task.completedSessions : [];
  if (!existing.some((s) => s.date === session.date && s.start === session.start)) {
    existing.push(session);
  }
  const completedMinutes = Math.min(task.estimatedMinutes, existing.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0));
  const status = completedMinutes >= task.estimatedMinutes ? 'done' : 'in-progress';
  const updated = { ...task, completedSessions: existing, completedMinutes, status };
  await collection.updateOne({ id: req.params.id }, { $set: updated });
  res.json(updated);
});

app.post('/api/tasks/:id/uncomplete-session', async (req, res) => {
  const task = await collection.findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const { date, start } = req.body || {};
  if (!date || !start) return res.status(400).json({ error: 'Body must include date and start' });
  const sessions = (task.completedSessions || []).filter((s) => !(s.date === date && s.start === start));
  const completedMinutes = sessions.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
  const status = completedMinutes <= 0 ? 'todo' : 'in-progress';
  const updated = { ...task, completedSessions: sessions, completedMinutes, status };
  await collection.updateOne({ id: req.params.id }, { $set: updated });
  res.json(updated);
});

app.post('/api/tasks/:id/reset-progress', async (req, res) => {
  const task = await collection.findOne({ id: req.params.id }, { projection: { _id: 0 } });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const updated = { ...task, completedMinutes: 0, completedSessions: [], status: 'todo' };
  await collection.updateOne({ id: req.params.id }, { $set: updated });
  res.json(updated);
});

app.post('/api/tasks/load-seed', async (_req, res) => {
  await collection.deleteMany({});
  const now = new Date().toISOString();
  const docs = SEED_TASKS.map((task) => normalizeTask({ ...task, createdAt: now, completedMinutes: 0, completedSessions: [] }, now));
  if (docs.length > 0) {
    await collection.insertMany(docs, { ordered: false });
  }
  res.json(docs);
});

app.listen(PORT, () => {
  console.log(`Task Planner API listening on http://localhost:${PORT}`);
});
