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
