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

## Storage setup
Copy the sample file:

```powershell
Copy-Item .env.example .env
```

The `.env` file is ignored by Git. `.env.example` documents all supported
variables without containing real credentials:

| Variable | Purpose | Default |
|---|---|---|
| `STORAGE_MODE` | Persistence provider: `mongodb` or browser `local` storage | `mongodb` |
| `MONGODB_ATLAS_URI` | Complete Atlas connection URI (recommended) | Required unless split credentials are used |
| `MONGODB_USERNAME`, `MONGODB_PASSWORD`, `MONGODB_URI` | Alternative split Atlas credentials | None |
| `MONGODB_DB_NAME` | Database name | `task_planner` |
| `MONGODB_COLLECTION_NAME` | Task collection | `tasks` |
| `MONGODB_SETTINGS_COLLECTION_NAME` | Settings collection | `settings` |
| `MONGODB_TLS_ALLOW_INVALID_CERTIFICATES` | Disable certificate validation only for MongoDB; use solely behind a trusted certificate-intercepting proxy | `false` |
| `API_PORT` | Backend API port | `3002` |
| `CLIENT_ORIGIN` | Browser origin allowed by API CORS during development | `http://localhost:5173` |
| `VITE_API_BASE_URL` | Backend URL embedded into the frontend | `http://localhost:3002` |
| `UI_PORT` | Production preview UI port | `4173` |
| `COMPANION_PORT` | Outlook companion port | `3001` |

For browser-only persistence, set `STORAGE_MODE=local`. MongoDB credentials are
not required in this mode. Tasks and settings remain in the current browser
profile and are not shared with other browsers or computers.

If Atlas fails with `self-signed certificate in certificate chain`, prefer
installing your organization's CA certificate. As a temporary workaround, add
this to `.env` and restart the app:

```env
MONGODB_TLS_ALLOW_INVALID_CERTIFICATES=true
```

## Scripts
- `npm run dev` - runs frontend + backend together
- `npm run dev:api` - runs backend only
- `npm start` - runs the production UI, backend, and Outlook companion
- `start.bat` - runs the production UI, backend, and Outlook companion

## Local storage migration
When `STORAGE_MODE=mongodb`, the frontend imports legacy task and settings data
from localStorage into MongoDB on first load. In `local` mode, that data remains
in the browser.
