# Deploying Task Planner on another computer

Task Planner has two parts that run together on the **same Windows machine**:

| Part          | What it does                                                     | URL                     |
|---------------|-----------------------------------------------------------------|-------------------------|
| **UI**        | The React web app (task list, timeline, progress).              | `http://127.0.0.1:4173` |
| **Companion** | A small local server that reads/writes the **Outlook** calendar | `http://localhost:3001` |

The UI talks to the companion at `localhost:3001`. The companion uses **COM
automation** to reach the Outlook desktop app, so it must run on the same PC as
Outlook.

---

## 1. Requirements

- **Windows 10/11**
- **Microsoft Outlook** (desktop app) installed and configured with your account
- **Node.js 18 or newer** — install the LTS build from <https://nodejs.org/>
  - This also installs `npm`.
  - `winax` (used by the companion) ships prebuilt binaries; if a build is
    triggered you may also need the *Desktop development with C++* workload from
    the Visual Studio Build Tools.

Verify Node is available:

```powershell
node --version
npm --version
```

---

## 2. Get the files onto the target machine

You were given a single deployment archive: **`task-planner-deploy.zip`**.

1. Copy `task-planner-deploy.zip` to the target PC (e.g. into `C:\task-planner`).
2. Right-click it → **Extract All…** (or unzip with any tool).
3. Open the extracted folder — it contains the source, the `companion/` folder,
   `package.json`, the `setup.ps1` / `start.bat` / `start.mjs` scripts, and this
   document.

The archive intentionally **excludes** the generated folders — they are rebuilt
on the target during setup:

- `node_modules/`
- `companion/node_modules/`
- `dist/`

> Building the package yourself (advanced): from a source checkout, zip the repo
> while omitting those three folders (e.g. `git archive`, or copy everything
> except `node_modules/` and `dist/`).

---

## 3. One-time setup

From the project folder, run **either**:

```powershell
npm run setup
```

or double-click / run:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

This will:

1. Install the UI dependencies (`npm install`).
2. Install the companion dependencies (`companion/` → `npm install`).
3. Build the production UI into `dist/`.

Run setup again whenever you pull new code or change dependencies.

---

## 4. Start the app

Double-click **`start.bat`**, or run:

```powershell
npm start
```

This launches **both** processes in one window:

- the Outlook companion on `:3001`
- the built UI on `:4173`

…and opens `http://127.0.0.1:4173` in your default browser.

Press **Ctrl+C** in the console (or close the window) to stop both.

> First launch tip: Outlook may show a **security prompt** the first time the
> companion accesses your calendar. Allow access (and optionally tick
> "Allow access for 10 minutes"). If you use classic Outlook's programmatic
> access guard, choose *Allow*.

---

## 5. How it fits together

```
 ┌──────────────┐      HTTP :4173       ┌──────────────────┐
 │   Browser    │ ───────────────────▶ │   UI (dist/)     │
 │ 127.0.0.1    │                       │  vite preview    │
 └──────┬───────┘                       └──────────────────┘
        │ fetch  http://localhost:3001/api/...
        ▼
 ┌────────────────────┐    COM automation    ┌───────────────┐
 │  Companion server  │ ───────────────────▶ │   Outlook     │
 │  companion.mjs     │                       │   (desktop)   │
 └────────────────────┘                       └───────────────┘
```

- **Read**: the UI pulls your real meetings from Outlook to block busy time.
- **Write**: "Sync to Outlook" writes each scheduled work session as a **Free**
  meeting titled `[Task Planner] <task>`, colour-coded by priority.
  - **Today** replaces only the selected day's `[Task Planner]` meetings.
  - **All Days** clears every `[Task Planner]` meeting and rebuilds the full plan.

---

## 6. Configuration

| Setting        | Where                              | Default |
|----------------|------------------------------------|---------|
| Companion port | `PORT` env var (read by companion) | `3001`  |
| UI port        | `UI_PORT` env var (read by launcher) | `4173`  |

> ⚠️ The UI is currently hard-coded to reach the companion at
> `http://localhost:3001` (see `src/data/meetings.ts` and
> `src/utils/outlookSync.ts`). If you change the companion `PORT`, update those
> URLs and re-run `npm run build`. The UI port must stay one the companion's
> CORS allow-list accepts (`4173` or `5173`).

Example (PowerShell):

```powershell
$env:UI_PORT = "4173"; node start.mjs
```

---

## 7. Troubleshooting

| Symptom                                             | Fix                                                                                   |
|-----------------------------------------------------|---------------------------------------------------------------------------------------|
| Meetings show as "mock data" / not your calendar    | The companion isn't running or Outlook denied access. Restart `start.bat`, allow the Outlook prompt. |
| "Outlook companion server is not running"           | Start the companion (it's part of `start.bat` / `npm start`).                          |
| `node` not recognised                               | Install Node.js LTS and reopen the terminal so PATH refreshes.                         |
| Port 4173 or 3001 already in use                    | Close the other process, or set `UI_PORT` / `PORT` (see Configuration).                |
| Sync deleted meetings on the wrong day              | Ensure you restarted the companion after updating `companion.mjs` (it isn't hot-reloaded). |
| winax fails to install                              | Install the VS Build Tools *Desktop development with C++* workload, then re-run setup. |

---

## 8. Files added for deployment

| File          | Purpose                                                        |
|---------------|----------------------------------------------------------------|
| `setup.ps1`   | One-time install of all dependencies + UI build.               |
| `start.mjs`   | Launcher that runs the companion **and** the UI together.      |
| `start.bat`   | Double-click wrapper around `start.mjs` (runs setup if needed). |
| `DEPLOYMENT.md` | This document.                                               |
