<#
    Task Planner — one-time setup

    Installs dependencies for both the UI and the Outlook companion, then
    produces a production build of the UI. Run this ONCE on a new machine
    (or after pulling new code / changing dependencies).

    Usage (from this folder):
        powershell -ExecutionPolicy Bypass -File .\setup.ps1
#>

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root

Write-Host "`n=== Task Planner setup ===`n" -ForegroundColor Cyan

# --- Verify Node.js -----------------------------------------------------------
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "Node.js is not installed or not on PATH." -ForegroundColor Red
    Write-Host "Install the LTS build from https://nodejs.org/ and re-run this script." -ForegroundColor Red
    exit 1
}
$nodeVersion = (& node --version)
Write-Host "Using Node.js $nodeVersion" -ForegroundColor Green

# --- Install UI dependencies --------------------------------------------------
Write-Host "`n[1/3] Installing UI dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install (UI) failed" }

# --- Install companion dependencies ------------------------------------------
Write-Host "`n[2/3] Installing companion dependencies (winax needs Windows)..." -ForegroundColor Cyan
Push-Location (Join-Path $root 'companion')
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install (companion) failed" }
}
finally {
    Pop-Location
}

# --- Build the UI -------------------------------------------------------------
Write-Host "`n[3/3] Building the UI (production)..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "UI build failed" }

Write-Host "`n=== Setup complete ===" -ForegroundColor Green
Write-Host "Start the app with:  .\start.bat   (or)   npm start`n"
