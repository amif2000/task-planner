@echo off
REM ---------------------------------------------------------------------------
REM  Task Planner launcher (double-click friendly)
REM  Starts the Outlook companion AND the UI, then opens your browser.
REM  Run setup.ps1 once before the first launch.
REM ---------------------------------------------------------------------------
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js is not installed or not on PATH.
    echo Install the LTS build from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Dependencies are not installed. Running setup...
    powershell -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
    if errorlevel 1 (
        echo Setup failed.
        pause
        exit /b 1
    )
)

node start.mjs
pause
