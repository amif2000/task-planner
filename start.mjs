/**
 * Task Planner — one-shot launcher
 *
 * Starts BOTH processes needed to run the tool:
 *   1. The Outlook Companion API server   (companion/companion.mjs → :3001)
 *   2. The built React UI (static preview) (vite preview           → :4173)
 *
 * Usage:
 *   node start.mjs            # start both, open the browser
 *   UI_PORT=4173 node start.mjs
 *
 * Requirements: Node.js 18+, Windows, Microsoft Outlook (desktop) installed.
 * Run `setup.ps1` (or `npm run setup`) once before the first launch.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const COMPANION_DIR = join(ROOT, 'companion');

const UI_PORT = process.env.UI_PORT || '4173';
const COMPANION_PORT = process.env.COMPANION_PORT || '3001';
const UI_URL = `http://127.0.0.1:${UI_PORT}`;

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

function log(tag, color, line) {
  process.stdout.write(`\x1b[${color}m[${tag}]\x1b[0m ${line}\n`);
}

function fail(msg) {
  console.error(`\n\x1b[31m✖ ${msg}\x1b[0m\n`);
  process.exit(1);
}

// ── Pre-flight checks ─────────────────────────────────────────────────────────

if (!existsSync(join(ROOT, 'node_modules'))) {
  fail('Dependencies are not installed. Run "npm run setup" (or setup.ps1) first.');
}
if (!existsSync(join(COMPANION_DIR, 'node_modules'))) {
  fail('Companion dependencies are not installed. Run "npm run setup" (or setup.ps1) first.');
}

const viteBin = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const distIndex = join(ROOT, 'dist', 'index.html');

const children = [];
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\nShutting down…');
  for (const child of children) {
    try { child.kill(); } catch { /* already gone */ }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

function track(child, tag, color) {
  children.push(child);
  child.stdout.on('data', (d) => d.toString().split(/\r?\n/).forEach((l) => l && log(tag, color, l)));
  child.stderr.on('data', (d) => d.toString().split(/\r?\n/).forEach((l) => l && log(tag, color, l)));
  child.on('exit', (code) => {
    log(tag, color, `exited with code ${code}`);
    // If either half dies, take the whole thing down so failures are obvious.
    shutdown(code ?? 0);
  });
  return child;
}

// ── Ensure the UI is built ────────────────────────────────────────────────────

function buildUiIfNeeded() {
  if (existsSync(distIndex)) return Promise.resolve();
  log('setup', '33', 'No production build found — running "npm run build"…');
  return new Promise((resolve) => {
    const build = spawn(npmCmd, ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: isWindows });
    build.on('exit', (code) => {
      if (code !== 0) fail('UI build failed. Fix the errors above and try again.');
      resolve();
    });
  });
}

// ── Launch ────────────────────────────────────────────────────────────────────

async function main() {
  await buildUiIfNeeded();

  log('companion', '36', `Starting Outlook companion on http://localhost:${COMPANION_PORT}…`);
  track(
    spawn(process.execPath, ['companion.mjs'], {
      cwd: COMPANION_DIR,
      env: { ...process.env, PORT: COMPANION_PORT },
    }),
    'companion',
    '36',
  );

  log('ui', '35', `Serving UI on ${UI_URL}…`);
  track(
    spawn(
      process.execPath,
      [viteBin, 'preview', '--port', UI_PORT, '--strictPort', '--host', '127.0.0.1'],
      { cwd: ROOT },
    ),
    'ui',
    '35',
  );

  // Give the servers a moment, then open the browser.
  setTimeout(() => {
    log('launcher', '32', `Opening ${UI_URL}`);
    if (isWindows) {
      spawn('cmd', ['/c', 'start', '', UI_URL], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [UI_URL], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [UI_URL], { detached: true, stdio: 'ignore' }).unref();
    }
  }, 2500);

  console.log(
    `\n\x1b[32m▶ Task Planner is running.\x1b[0m` +
    `\n    UI:        ${UI_URL}` +
    `\n    Companion: http://localhost:${COMPANION_PORT}` +
    `\n    Press Ctrl+C to stop both.\n`,
  );
}

main();
