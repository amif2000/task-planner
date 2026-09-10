# Task Planner

A personal task planner built with React + Vite + TypeScript.

## Features
- View mock Outlook meetings on a daily timeline
- Add tasks with estimated duration and priority
- Auto-schedule tasks into free time slots
- Track task progress

## Dev
```bash
npm install
npm run dev
```

## MongoDB Atlas backend setup
Copy the sample file and replace the MongoDB placeholders:

```powershell
Copy-Item .env.example .env
```

The `.env` file is ignored by Git. `.env.example` documents all supported
variables without containing real credentials:

| Variable | Purpose | Default |
|---|---|---|
| `MONGODB_ATLAS_URI` | Complete Atlas connection URI (recommended) | Required unless split credentials are used |
| `MONGODB_USERNAME`, `MONGODB_PASSWORD`, `MONGODB_URI` | Alternative split Atlas credentials | None |
| `MONGODB_DB_NAME` | Database name | `task_planner` |
| `MONGODB_COLLECTION_NAME` | Task collection | `tasks` |
| `MONGODB_SETTINGS_COLLECTION_NAME` | Settings collection | `settings` |
| `API_PORT` | Backend API port | `3002` |
| `CLIENT_ORIGIN` | Browser origin allowed by API CORS during development | `http://localhost:5173` |
| `VITE_API_BASE_URL` | Backend URL embedded into the frontend | `http://localhost:3002` |
| `UI_PORT` | Production preview UI port | `4173` |
| `COMPANION_PORT` | Outlook companion port | `3001` |

## Scripts
- `npm run dev` - runs frontend + backend together
- `npm run dev:api` - runs backend only
- `npm start` - runs the production UI, backend, and Outlook companion
- `start.bat` - runs the production UI, backend, and Outlook companion

## Local storage migration
On first load, the frontend imports legacy task and settings data from localStorage into MongoDB. The backend creates the `settings` collection and its global settings document when it starts.
