# Outlook Companion

Bridges your local Outlook calendar to the Task Planner React app.  
Runs entirely on your machine — no IT, no Azure, no network auth.

## Requirements

- Windows with Microsoft Outlook (desktop app) installed and a profile configured
- Node.js ≥ 18
- Visual Studio Build Tools (for the `winax` native addon)

### Install Build Tools (one-time)
```
npm install --global windows-build-tools
```
Or install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) manually (select "Desktop development with C++").

## Setup

```bash
cd companion
npm install
```

## Run

```bash
npm start
```

The server starts on `http://localhost:3001`. The React app detects it automatically and switches from mock data to your live Outlook calendar. Restart the companion any time you need a hard refresh; it also auto-refreshes every 5 minutes.

## Auto-start with Windows (optional)

To start the companion automatically when you log in:

1. Press `Win + R` → type `shell:startup` → press Enter
2. Create a shortcut to this script in that folder:

```bat
@echo off
cd /d "C:\Users\amitfri\React\task-planner\companion"
node companion.mjs
```

Save it as `task-planner-companion.bat` and add a shortcut to the Startup folder.

## API

| Endpoint | Description |
|---|---|
| `GET /api/health` | Liveness check (React app polls this) |
| `GET /api/meetings` | All meetings for the next 14 days |
| `GET /api/meetings?date=YYYY-MM-DD` | Meetings for a specific date |
| `GET /api/meetings?start=YYYY-MM-DD&end=YYYY-MM-DD` | Meetings in a date range |
| `POST /api/refresh` | Force a cache refresh from Outlook |
| `POST /api/meetings/sync` | **Create/update task sessions as Outlook meetings** |

### POST /api/meetings/sync

Syncs scheduled task sessions to Outlook as calendar meetings.

**Features:**
- Automatically deletes all existing Task Planner meetings (identified by `[Task Planner]` prefix)
- Creates new meetings for each task session scheduled that day
- Meetings are marked as **"Free"** so others can schedule over them
- No conflicts with your calendar — Task Planner owns only meetings it creates

**Request:**
```json
{
  "meetings": [
    {
      "title": "Task name",
      "date": "2026-08-16",
      "start": "09:00",
      "end": "10:30"
    }
  ]
}
```

**Response:**
```json
{
  "deleted": 3,
  "created": 2,
  "failed": 0,
  "meetings": [
    {
      "title": "[Task Planner] Task name",
      "date": "2026-08-16",
      "start": "09:00",
      "end": "10:30"
    }
  ],
  "errors": []
}
```

**UI Integration:**  
In the React app, click **"Sync to Outlook"** on the Day Schedule view to sync today's scheduled task sessions.
