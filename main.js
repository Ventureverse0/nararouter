'use strict';
// OmniRoute Desktop - sidebar app with native title bar
//
// Always owns the port: if something else is listening, kill it and start our own.
// Minimizes to tray (not taskbar) — app keeps running in background.
// Uses native Windows title bar for reliability.

const { app, BrowserWindow, Tray, Menu, nativeImage, shell, dialog } = require('electron');
const { spawn, execFile, execSync } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const APP_ID = 'com.nararouter.desktop';
const PORT = Number(process.env.NARAROUTER_PORT || process.env.OMNIROUTE_PORT || '20128');
const HOME = os.homedir();
const APP_NAME = 'nararoute';

function getAppRoot() {
  const exeDir = path.dirname(process.execPath);
  const candidate = path.join(exeDir, 'resources', 'app');
  if (fs.existsSync(path.join(candidate, 'node_modules', 'omniroute'))) {
    return candidate;
  }
  return __dirname;
}

const APP_ROOT = getAppRoot();

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

let mainWindow = null;
let tray = null;
let serverChild = null;
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

// Check if a TCP port is listening on localhost
function portInUse(port) {
  return new Promise(resolve => {
    const sock = net.connect({ port, host: '127.0.0.1' });
    sock.setTimeout(1500);
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('timeout', () => { sock.destroy(); resolve(false); });
    sock.once('error', () => resolve(false));
  });
}

// Find PID listening on a port (Windows) via netstat
function getPidOnPort(port) {
  try {
    const out = execSync(
      `netstat -ano 2>nul | findstr :${port} | findstr LISTENING`,
      { encoding: 'utf8', shell: 'cmd.exe', windowsHide: true }
    );
    const lines = out.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      // Format: Proto Local Address Foreign Address State PID
      // Local Address looks like 0.0.0.0:20128 or [::]:20128
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) {
        return parseInt(pid, 10);
      }
    }
  } catch (e) { /* no output = no listener */ }
  return null;
}

// Kill whatever process is using the port, then verify it's gone
async function reclaimPort(port, maxWaitMs = 5000) {
  const pid = getPidOnPort(port);
  if (!pid) return;

  log(`port ${port} in use by PID ${pid}, killing...`);
  try {
    execFileSync('taskkill', ['/F', '/PID', String(pid), '/T'], { windowsHide: true });
  } catch (e) {
    log(`kill command failed for PID ${pid}: ${e.message}`);
  }

  // Wait until port is free
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (!(await portInUse(port))) {
      log(`port ${port} is now free`);
      return;
    }
    await sleep(200);
  }
  log(`WARNING: port ${port} still in use after kill attempt`);
}

function globalPkgEnvPath() {
  const cands = [
    process.env.OMNIROUTE_GLOBAL_ENV,
    String.raw`C:\nvm4w\nodejs\node_modules\omniroute\.env`,
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node_modules', 'omniroute', '.env'),
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'omniroute', '.env'),
    path.join(process.env.LOCALAPPDATA || '', 'nvm', 'node_modules', 'omniroute', '.env'),
  ].filter(Boolean);
  for (const c of cands) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

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
  add(path.join(DATA_DIR, '.env'));
  add(path.join(DEFAULT_DATA_DIR, '.env'));
  add(path.join(HOME, '.env'));
  add(path.join(APP_ROOT, 'node_modules', 'omniroute', '.env'));
  add(globalPkgEnvPath());
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
          process.env[key] = t.slice(eq + 1).trim().replace(/^[\"']|[\"']$/g, '');
        }
      }
      log('loaded env: ' + envPath);
    } catch (e) { log('env load error ' + envPath + ': ' + e.message); }
  }
}

function heapArgs() {
  const pinned = parseInt(process.env.OMNIROUTE_MEMORY_MB || '', 10);
  const mb = Number.isFinite(pinned) && pinned > 0
    ? pinned
    : Math.max(512, Math.min(4096, Math.floor((os.totalmem() / 1024 / 1024) * 0.35)));
  return ['--max-old-space-size=' + mb];
}

function startServer() {
  const pkgDir = path.join(APP_ROOT, 'node_modules', 'omniroute');
  const serverJs = fs.existsSync(path.join(pkgDir, 'dist', 'server-ws.mjs'))
    ? path.join(pkgDir, 'dist', 'server-ws.mjs')
    : path.join(pkgDir, 'dist', 'server.js');
  if (!fs.existsSync(serverJs)) {
    log('FATAL: server bundle not found at ' + serverJs);
    dialog.showErrorBox('Nararouter', 'The bundled server is missing. Please reinstall the app.');
    app.exit(1);
    return;
  }

  // Kill previous server child if still running
  if (serverChild && !serverChild.killed) {
    try { serverChild.kill('SIGTERM'); } catch (e) { /* ignore */ }
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
  if (serverChild) {
    restarts = 0;
    const old = serverChild;
    serverChild = null;
    log('manual restart requested');
    try { old.kill(); } catch (e) { /* ignore */ }
    setTimeout(() => { if (!quitting) startServer(); }, 2000);
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 800,
    x: 0,
    y: 0,
    frame: true,  // native Windows title bar with minimize/maximize/close
    titleBarStyle: 'default',
    skipTaskbar: true,  // no taskbar button
    alwaysOnTop: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.loadURL('http://localhost:' + PORT);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(APP_ROOT, 'assets', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: false,
      click: (item) => {
        if (mainWindow) mainWindow.setAlwaysOnTop(item.checked);
      }
    },
    { type: 'separator' },
    {
      label: 'Restart Server',
      click: restartServer
    },
    {
      label: 'Open Logs Folder',
      click: () => shell.openPath(LOG_DIR)
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        quitting = true;
        if (mainWindow) mainWindow.close();
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Nararouter');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  log('=== Nararouter ' + app.getVersion() + ' starting (port ' + PORT + ', dataDir ' + DATA_DIR + ') ===');
  fs.mkdirSync(LOG_DIR, { recursive: true });
  loadEnvFiles();

  // Always own the port: kill anything else using it, then start our own server
  const busy = await portInUse(PORT);
  if (busy) {
    log('port ' + PORT + ' already in use, reclaiming...');
    await reclaimPort(PORT);
  }
  startServer();
  const ok = await waitForReady(120000);
  if (ok) {
    ready = true;
    log('server is ready');
  } else {
    log('server did not become ready within 120s');
  }

  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('before-quit', e => {
  if (quitting) return;
  e.preventDefault();
  stopServer(() => app.exit(0));
});
