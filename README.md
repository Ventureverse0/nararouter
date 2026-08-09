# OmniRoute Desktop

Tray-only desktop app that runs the **OmniRoute AI router** (https://github.com/diegosouzapw/OmniRoute)
in the background. No windows, no taskbar button - just an icon in the system
tray (bottom-right, next to the clock). The router stays available at:

    http://localhost:20128   (OpenAI-compatible /v1 endpoint + dashboard)

## Why this exists

The normal way to run OmniRoute is `omniroute serve` in a terminal - which
dies when you reboot and has to be started by hand. This app wraps the server
in a small Electron shell that:

- starts the server automatically (at login via the tray menu toggle, or any
  scheduled task / shortcut)
- keeps it alive in the background, restarting it if it crashes
- gives you a tray menu: Open Dashboard / Restart Server / logs / Quit
- is **self-contained** - the installer bundles the Omniroute server and its
  own Node runtime. End users do NOT need Node.js, npm, or any CLI install.

## Privacy / keys

- **No API keys are shipped in the installer.** The app contains zero user
  configuration. Each person who installs it opens the dashboard on first run
  and adds their own providers / API keys.
- Data lives in the per-user data dir:
  - `%USERPROFILE%\.omniroute` (if it exists - matches the CLI's legacy dir)
  - otherwise `%APPDATA%\omniroute`
- If an existing global `omniroute` npm install is present on the machine,
  its `.env` is read as a compatibility bridge so an existing install keeps
  its dashboard password / secrets. That file stays on the machine - it is
  never part of the app package.
- If port `20128` is already in use when the app starts (e.g. an old
  `omniroute serve` is still running), the app switches to **external mode**:
  it shows the tray icon but does not touch the running server.

## Build the installer

Requirements: Node.js 20+ on the BUILD machine, internet access.

    npm install
    npm run icon        # regenerate icons (optional)
    npm run dist        # produces dist/OmniRoute Desktop Setup 1.0.0.exe

Installers are per-user NSIS builds (no admin rights needed to install).
Run the .exe, pick a location, and OmniRoute Desktop appears in the tray.

## Run from source (development)

    npm install
    npm start

## Data & logs

| What          | Where                                             |
|---------------|---------------------------------------------------|
| Server data   | `%USERPROFILE%\.omniroute` (or `%APPDATA%\omniroute`) |
| App logs      | `<data dir>\logs\desktop-app.log`                 |
| PID file      | `<data dir>\server\.pid` (keeps `omniroute stop` working) |

## Troubleshooting

- **Tray icon missing after install** - it hides in the overflow chevron;
  drag it to the visible area. Also make sure the app is not blocked by
  antivirus (first run may prompt).
- **"Server: Running (external process)"** - something else already owns
  port 20128. Stop that process (`omniroute stop` if it is the CLI, or quit
  the other instance) then use tray -> Restart Server.
- **Dashboard login changed** - the app reads the same env files as the CLI
  (`<data dir>\.env`, `~\.env`, plus the global npm package `.env` if
  present). If you previously ran from a custom working directory with a
  local `.env`, place that file in `<data dir>\.env` (first-wins).

## Layout

    main.js                 Electron main process (tray, spawn, lifecycle)
    assets/icon.png         Tray / app icon
    build/icon.ico          Installer icon
    scripts/make_icon.py    Dependency-free icon generator (pure Python)
    package.json            electron-builder config
