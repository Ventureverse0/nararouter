# Nararouter

**Desktop sidebar app for the Nararouter AI router** — embeds the OmniRoute dashboard in a narrow window, minimizes to system tray, no taskbar button.

## Overview

Nararouter is a desktop application that wraps the [OmniRoute](https://github.com/diegosouzapw/OmniRoute) AI router in a native Windows application. It provides:

- **Sidebar window** — 400px wide, docks to the left edge of your screen
- **System tray** — minimizes to tray, no taskbar button
- **Background server** — spawns the OmniRoute server automatically
- **Privacy** — no API keys shipped; each user configures their own
- **External mode** — if port 20128 is busy, leaves the existing server untouched

## What is OmniRoute?

OmniRoute is a unified AI router with:
- 290+ AI providers (90+ free tiers)
- Auto-fallback across providers
- RTK + Caveman compression (15–95% token savings)
- OpenAI-compatible API at `/v1`
- MCP tools, A2A, desktop, PWA support

**Original repo:** https://github.com/diegosouzapw/OmniRoute

## How Nararouter enhances it

The official OmniRoute provides `npm run electron:build` which builds the full Next.js app from source. Nararouter takes a different approach:

| Feature | OmniRoute (official) | Nararouter |
|---------|---------------------|------------|
| Build | Full Next.js app from source (heavy) | Thin wrapper around existing install (light) |
| Dependencies | Requires toolchain, build tools | Self-contained, no toolchain needed |
| UI | Full desktop app | Sidebar window, tray-only |
| Config | Fresh install each time | Reuses existing `~/.omniroute` data |
| Distribution | Per-machine build | Portable exe, portable installer |

## Installation

### Option 1: Portable (recommended for testing)

1. Download the portable zip from the releases page
2. Extract anywhere
3. Double-click `Nararouter.exe`

### Option 2: Installer (per-user, no admin)

1. Download `Nararouter-Setup-1.0.0.exe`
2. Run it — no admin rights needed
3. App appears in Start Menu + Desktop shortcut
4. Minimize to tray, stays running in background

### Option 3: Build from source

```bash
# Clone the repo
git clone <repo-url>
cd nararoute-desktop

# Install dependencies
npm install

# Build portable version
npx electron-builder --win portable --publish never

# Or build installer
npx electron-builder --win nsis --publish never
```

## Usage

### First run
1. Launch `Nararouter.exe`
2. The sidebar window opens with the OmniRoute dashboard
3. If port 20128 is busy, it detects "external mode" and leaves the existing server untouched
4. If port 20128 is free, it spawns the server automatically

### Managing the app
- **Open dashboard**: Click the tray icon
- **Minimize to tray**: Click the X button (window hides, app keeps running)
- **Quit**: Right-click tray icon → Quit (stops server, closes app)
- **Restart server**: Right-click tray icon → Restart Server
- **Always on top**: Right-click tray icon → Always on Top (checkbox)

### Data storage
- **Config**: `%USERPROFILE%\.nararoute\` (or `%APPDATA%\nararoute` if legacy doesn't exist)
- **Logs**: `%USERPROFILE%\.nararoute\logs\desktop-app.log`
- **Server data**: `%USERPROFILE%\.omniroute\` (shared with CLI)

### Environment loading
Nararouter mirrors the OmniRoute CLI's env loading (first-wins):
1. `<dataDir>/.env`
2. `~/.env`
3. Bundled package `.env` (if present)
4. Global npm install `.env` (bridge for JWT_SECRET, INITIAL_PASSWORD)

## Privacy & Keys

- **No keys shipped**: The installer contains zero API keys
- **Per-user config**: Each user sets up their own providers via the dashboard
- **Local storage**: All config stays on the user's machine
- **External mode**: If your existing OmniRoute instance is running, Nararouter leaves it untouched

## Troubleshooting

### Build locks
If the build fails with "Device or resource busy":
```powershell
# Kill all related processes
Get-Process | Where-Object { $_.Path -like "*nararoute*" -or $_.Path -like "*electron*" } | Stop-Process -Force
```

### NSIS signing hangs
If the NSIS installer hangs, use the portable target instead:
```bash
npx electron-builder --win portable --publish never
```

### Exe won't run
Make sure you're running the exe from `dist/win-unpacked/`, not the project root:
```
E:\NovaEra Hub\useful projects\hermes-ecosystem\nararoute-desktop\dist\win-unpacked\Nararouter.exe
```

### Logs
Check `C:\Users\<user>\.nararoute\logs\desktop-app.log` for startup logs.

## Technical Details

- **Electron**: v43.3.0 (bundled Node.js 24.18.1)
- **Build tool**: electron-builder v26.15.3
- **Runtime**: `ELECTRON_RUN_AS_NODE=1` (runs bundled Node, no system Node needed)
- **Native modules**: All N-API prebuilts (better-sqlite3, @parcel/watcher, keytar, etc.)
- **Build config**: `asar: false`, `npmRebuild: false` (no compiler needed)

## License

MIT — same as OmniRoute.

## Credits

- **OmniRoute**: [diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute)
- **Electron**: [electron/electron](https://github.com/electron/electron)
- **electron-builder**: [electron-userland/electron-builder](https://github.com/electron-userland/electron-builder)
