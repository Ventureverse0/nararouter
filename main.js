'use strict';
// OmniRoute Desktop - tray-only desktop app for the OmniRoute AI router.
//
// Runs the bundled Omniroute server (dist/server-ws.mjs) as a child process
// using Electron's own Node runtime (ELECTRON_RUN_AS_NODE), so the app is
// self-contained: installers do NOT require a separate Node.js install.
//
// Design notes:
//  - No windows, no taskbar button. A system tray icon is the whole UI.
//  - Data lives in the per-user data dir (~/.omniroute if present, else
//    %APPDATA%/omniroute) - the app never ships or touches anyone's keys.
//  - Env loading mirrors bin/omniroute.mjs loadEnvFile() exactly (order,
//    first-wins, quote stripping) so behavior matches the CLI.
//  - If port 20128 is already in use at startup, the app switches to
//    "external mode" and leaves the existing server untouched.

const { app, Tray, Menu, nativeImage, shell, dialog } = require('electron');
const { spawn, execFile } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const APP_ID = 'com.omniroute.desktop';
const PORT = Number(process.env.OMNIROUTE_DESKTOP_PORT || process.env.OMNIROUTE_PORT || '20128');
const HOME = os.homedir();
const APP_NAME = 'omniroute';

// --- data dir resolution (mirrors bin/cli/data-dir.mjs) ---------------------
function resolveDefaultDataDir() {
  const legacy = path.join(HOME, '.' + APP_NAME);
  try {
    if (fs.existsSync(legacy) && fs.statSync(legacy).isDirectory()) return legacy;
  } catch (e) { /* ignore */ }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming'), APP_NAME);
  }
  return process.env.XDG_CONFIG_HOME ? path.join(process.env.XDG_CONFIG_HOME, APP_NAME) : legacy;
}
const DEFAULT_DATA_DIR = resolveDefaultDataDir();
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : DEFAULT_DATA_DIR;
const LOG_DIR = path.join(DATA_DIR, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'desktop-app.log');
const PID_FILE = path.join(DATA_DIR, 'server', '.pid');

let tray = null;
let serverChild = null;
let external = false;
let ready = false;
let quitting = false;
let restarts = 0;

function log(msg) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, '[' + new Date().toISOString() + '] ' + msg + '\n');
  } catch (e) { /* never throw from logging */ }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function portInUse(port) {
  return new Promise(resolve => {
    const sock = net.connect({ port, host: '127.0.0.1' });
    sock.setTimeout(1500);
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('timeout', () => { sock.destroy(); resolve(false); });
    sock.once('error', () => resolve(false));
  });
}

// Compatibility bridge: a global npm install of omniroute may carry a
// machine-local .env (JWT_SECRET, INITIAL_PASSWORD, OAuth client IDs...).
// Load it after the user's own files (first-wins) so an existing install's
// dashboard login / secrets keep working unchanged. Never shipped in the app.
function globalPkgEnvPath() {
  const cands = [
    process.env.OMNIROUTE_GLOBAL_ENV,
    'C:\\nvm4w\\nodejs\\node_modules\\omniroute\\.env',
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node_modules', 'omniroute', '.env'),
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'omniroute', '.env'),
    path.join(process.env.LOCALAPPDATA || '', 'nvm', 'node_modules', 'omniroute', '.env'),
  ].filter(Boolean);
  for (const c of cands) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// Mirrors bin/omniroute.mjs: migrate <dataDir>/server.env -> <dataDir>/.env
// (one-time, never overwrites), then load in order with first-wins semantics.
function migrateServerEnv() {
  const envPath = path.join(DATA_DIR, '.env');
  const serverEnvPath = path.join(DATA_DIR, 'server.env');
  if (fs.existsSync(envPath) || !fs.existsSync(serverEnvPath)) return;
  try {
    fs.copyFileSync(serverEnvPath, envPath);
    log('migrated ' + serverEnvPath + ' -> ' + envPath);
  } catch (e) { log('server.env migration failed: ' + e.message); }
}

function loadEnvFiles() {
  migrateServerEnv();
  const envPaths = [];
  const add = p => { if (p && envPaths.indexOf(p) === -1) envPaths.push(p); };
  add(path.join(DATA_DIR, '.env'));                 // DATA_DIR/.env (CLI: when DATA_DIR set)
  add(path.join(DEFAULT_DATA_DIR, '.env'));         // default data dir .env
  add(path.join(HOME, '.env'));                     // cwd/.env - we run the child from HOME
  add(path.join(__dirname, 'node_modules', 'omniroute', '.env')); // package ROOT/.env
  add(globalPkgEnvPath());                          // machine-local global install .env
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const eq = t.indexOf('=');
        if (eq <= 0) continue;
        const key = t.slice(0, eq).trim();
        if (process.env[key] === undefined) {
          process.env[key] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        }
      }
      log('loaded env: ' + envPath);
    } catch (e) { log('env load error ' + envPath + ': ' + e.message); }
  }
}

// Heap sizing mirrors scripts/build/runtime-env.mjs: OMNIROUTE_MEMORY_MB wins,
// else ~35% of physical RAM clamped to [512, 4096] MB.
function heapArgs() {
  const pinned = parseInt(process.env.OMNIROUTE_MEMORY_MB || '', 10);
  const mb = Number.isFinite(pinned) && pinned > 0
    ? pinned
    : Math.max(512, Math.min(4096, Math.floor((os.totalmem() / 1024 / 1024) * 0.35)));
  return ['--max-old-space-size=' + mb];
}

function startServer() {
  const pkgDir = path.join(__dirname, 'node_modules', 'omniroute');
  const serverJs = fs.existsSync(path.join(pkgDir, 'dist', 'server-ws.mjs'))
    ? path.join(pkgDir, 'dist', 'server-ws.mjs')
    : path.join(pkgDir, 'dist', 'server.js');
  if (!fs.existsSync(serverJs)) {
    log('FATAL: server bundle not found at ' + serverJs);
    dialog.showErrorBox('OmniRoute Desktop', 'The bundled OmniRoute server is missing. Please reinstall the app.');
    app.exit(1);
    return;
  }
  const env = Object.assign({}, process.env, {
    OMNIROUTE_PORT: String(PORT),
    PORT: String(PORT),
    DASHBOARD_PORT: String(PORT),
    API_PORT: String(PORT),
    HOSTNAME: process.env.OMNIROUTE_SERVER_HOST ||
      (process.env.HOSTNAME && process.env.HOSTNAME !== os.hostname() ? process.env.HOSTNAME : '0.0.0.0'),
    NODE_ENV: 'production',
    ELECTRON_RUN_AS_NODE: '1',
  });
  log('spawning server: ' + process.execPath + ' ' + heapArgs().join(' ') + ' ' + serverJs + ' (port ' + PORT + ', cwd ' + HOME + ')');
  const child = spawn(process.execPath, heapArgs().concat([serverJs]), {
    cwd: HOME,
    env: env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  serverChild = child;
  ready = false;
  child.stdout.on('data', d => {
    const s = d.toString().trim();
    if (s) log('[server] ' + s.split(/\r?\n/).join(' | '));
  });
  child.stderr.on('data', d => {
    const s = d.toString().trim();
    if (s) log('[server-err] ' + s.split(/\r?\n/).join(' | '));
  });
  child.on('exit', (code, sig) => {
    log('server exited code=' + code + ' signal=' + sig + ' quitting=' + quitting);
    if (serverChild === child) serverChild = null;
    ready = false;
    if (!quitting) {
      restarts += 1;
      if (restarts <= 3) {
        log('server will restart in 3s (attempt ' + restarts + '/3)');
        setTimeout(startServer, 3000);
      } else {
        log('server gave up after 3 crash-restarts; use tray -> Restart Server');
      }
    }
    updateMenu();
  });
  try {
    fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
    fs.writeFileSync(PID_FILE, String(child.pid));
    log('pid file written: ' + PID_FILE + ' -> ' + child.pid);
  } catch (e) { log('pid write failed: ' + e.message); }
}

async function waitForReady(timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await portInUse(PORT)) return true;
    await sleep(1000);
  }
  return false;
}

function restartServer() {
  if (external) return;
  if (serverChild) {
    restarts = 0;
    const old = serverChild;
    serverChild = null;
    log('manual restart requested');
    try { old.kill(); } catch (e) { /* ignore */ }
    setTimeout(() => { if (!quitting && !external) startServer(); }, 2000);
  } else {
    startServer();
  }
}

function stopServer(done) {
  quitting = true;
  const child = serverChild;
  if (!child) { done(); return; }
  const pid = child.pid;
  log('stopping managed server');
  try { child.kill(); } catch (e) { /* ignore */ }
  setTimeout(() => {
    try {
      execFile('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true }, () => done());
    } catch (e) { done(); }
  }, 2500);
}

function updateMenu() {
  if (!tray) return;
  let status;
  if (external) status = 'Running (external process on port ' + PORT + ')';
  else if (serverChild) status = ready ? 'Running (port ' + PORT + ')' : 'Starting...';
  else status = 'Stopped';
  tray.setToolTip('OmniRoute Desktop - ' + status);
  const menu = Menu.buildFromTemplate([
    { label: 'OmniRoute Desktop', enabled: false },
    { label: 'Server: ' + status, enabled: false },
    { type: 'separator' },
    { label: 'Open Dashboard', click: () => shell.openExternal('http://localhost:' + PORT) },
    { label: 'Restart Server', enabled: !external, click: restartServer },
    { label: 'Open Logs Folder', click: () => shell.openPath(LOG_DIR) },
    { type: 'separator' },
    {
      label: 'Launch at Windows startup',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: item => {
        try { app.setLoginItemSettings({ openAtLogin: item.checked }); log('login item -> ' + item.checked); }
        catch (e) { log('login item error: ' + e.message); }
      },
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (tray) tray.displayBalloon({ title: 'OmniRoute Desktop', content: 'Already running in the system tray.' });
  });
  app.setAppUserModelId(APP_ID);

  app.whenReady().then(async () => {
    log('=== OmniRoute Desktop ' + app.getVersion() + ' starting (port ' + PORT + ', dataDir ' + DATA_DIR + ') ===');
    fs.mkdirSync(LOG_DIR, { recursive: true });
    try {
      const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
      tray = new Tray(icon);
      tray.on('click', () => shell.openExternal('http://localhost:' + PORT));
    } catch (e) {
      log('tray icon error: ' + e.message);
    }
    loadEnvFiles();

    const busy = await portInUse(PORT);
    if (busy) {
      external = true;
      ready = true;
      log('port ' + PORT + ' already in use -> external mode (existing server left untouched)');
      updateMenu();
      tray.displayBalloon({ title: 'OmniRoute Desktop', content: 'OmniRoute already running on port ' + PORT + '.' });
      return;
    }

    const firstRun = !fs.existsSync(DATA_DIR);
    if (firstRun) log('first run detected (no data dir) - dashboard will open for setup');
    startServer();
    updateMenu();
    const ok = await waitForReady(120000);
    if (ok) {
      ready = true;
      log('server is ready');
      updateMenu();
      tray.displayBalloon({ title: 'OmniRoute Desktop', content: 'OmniRoute is running at http://localhost:' + PORT });
      if (firstRun) shell.openExternal('http://localhost:' + PORT);
    } else {
      log('server did not become ready within 120s');
    }
  });

  app.on('before-quit', e => {
    if (quitting) return;
    e.preventDefault();
    stopServer(() => app.exit(0));
  });
}
