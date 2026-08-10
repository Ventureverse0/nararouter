# Nararouter

**Desktop sidebar app for the Nararouter AI router** — a modern evolution of OmniRoute.

## What is Nararouter?

Nararouter is a desktop application that wraps the [OmniRoute](https://github.com/diegosouzapw/OmniRoute) AI router in a native Windows application. It provides a seamless desktop experience for managing AI providers, API keys, and usage.

**Original repo:** https://github.com/diegosouzapw/OmniRoute

## How Nararouter Enhances OmniRoute

| Feature | OmniRoute (Original) | Nararouter (This App) |
|---------|---------------------|----------------------|
| **UI** | Web dashboard only | Desktop sidebar window |
| **Distribution** | npm package | Portable exe + NSIS installer |
| **Installation** | Requires Node.js | Self-contained, no Node needed |
| **API Keys** | Stored in cloud | Stored locally (your machine) |
| **Data Privacy** | Cloud-stored | Local-only storage |
| **Configuration** | Web-based | Desktop GUI |
| **Window** | Browser tab | Native frameless window |
| **Tray** | None | Full system tray with menu |
| **Ports** | Fixed 20128 | Configurable via env var |
| **Memory** | Browser cache | Local filesystem storage |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Nararouter Desktop                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────┐    │
│  │   Sidebar       │    │     Main Content Area        │    │
│  │   (400px)       │    │     (OmniRoute Dashboard)    │    │
│  │                 │    │                              │    │
│  │  • Providers    │    │  • API Key Management         │    │
│  │  • Quotas       │    │  • Usage Analytics           │    │
│  │  • Settings     │    │  • Provider Configuration    │    │
│  │                 │    │                              │    │
│  └─────────────────┘    └─────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  System Tray (Minimize to Tray)                             │
│  • Right-click → Open / Restart / Quit                      │
│  • X button → Hides to tray (app keeps running)             │
│  • Always on Top option                                     │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### Option 1: Portable (Recommended for Testing)

1. Download the portable zip from releases
2. Extract anywhere
3. Double-click `Nararouter.exe`

### Option 2: Installer (Per-User, No Admin Required)

1. Download `Nararouter-Setup-1.0.0.exe`
2. Run it — no admin rights needed
3. App appears in Start Menu + Desktop shortcut
4. Minimizes to tray, stays running in background

### Option 3: Build from Source

```bash
# Clone the repo
git clone https://github.com/Ventureverse0/nararouter.git
cd nararoute-desktop

# Install dependencies
npm install

# Build portable version
npx electron-builder --win portable --publish never

# Or build NSIS installer
npx electron-builder --win nsis --publish never
```

## First Run

1. Launch `Nararouter.exe`
2. The sidebar window opens with the OmniRoute dashboard
3. Port 20128 is automatically detected
4. If busy, external mode activates (leaves existing server untouched)
5. Configure your providers via the dashboard

## Usage

### Desktop Window
- **Size**: 400px wide × 800px tall
- **Position**: Docked to left edge of screen
- **Minimize**: Click X → hides to tray (app keeps running)
- **Restore**: Click tray icon → window reappears

### System Tray
- Right-click tray icon for:
  - **Open** — Show the desktop window
  - **Restart Server** — Restart the OmniRoute server
  - **Always on Top** — Keep window above others
  - **Quit** — Close app and stop server

### Keyboard Shortcuts
- `Ctrl+W` — Close window (minimize to tray)
- `Ctrl+R` — Restart server
- `Esc` — Close app

## Data Storage

All data is stored locally on your machine:

| Data | Location |
|------|----------|
| **Config** | `%USERPROFILE%\.nararoute\` |
| **Logs** | `%USERPROFILE%\.nararoute\logs\desktop-app.log` |
| **Server PID** | `%USERPROFILE%\.nararoute\server\.pid` |
| **Environment** | Mirrors OmniRoute CLI first-wins loading |

## Environment Loading

Nararouter mirrors the OmniRoute CLI's env loading (first-wins):

1. `<dataDir>/.env`
2. `~/.env`
3. Bundled package `.env` (if present)
4. Global npm install `.env` (bridge for JWT_SECRET, INITIAL_PASSWORD)

## Privacy & Security

- **No keys shipped**: The installer contains zero API keys
- **Local storage**: All configuration stays on your machine
- **External mode**: If port 20128 is busy, Nararouter leaves the existing server untouched
- **First-run setup**: Each user configures their own providers via the dashboard

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
Make sure you're running the exe from `dist/win-unpacked/`:
```
E:\NovaEra Hub\useful projects\hermes-ecosystem\nararoute-desktop\dist\win-unpacked\Nararouter.exe
```

### Logs
Check `C:\Users\<user>\.nararoute\logs\desktop-app.log` for startup logs.

## Technical Details

| Component | Version | Details |
|-----------|---------|---------|
| **Electron** | v43.3.0 | Bundled Node.js 24.18.1 |
| **Build tool** | electron-builder | v26.15.3 |
| **Runtime** | `ELECTRON_RUN_AS_NODE=1` | Runs bundled Node, no system Node needed |
| **Native modules** | N-API prebuilts | better-sqlite3, @parcel/watcher, keytar, etc. |
| **Build config** | `asar: false`, `npmRebuild: false` | No compiler needed |

## License

MIT — same as OmniRoute.

## Credits

- **OmniRoute**: [diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute)
- **Electron**: [electron/electron](https://github.com/electron/electron)
- **electron-builder**: [electron-userland/electron-builder](https://github.com/electron-userland/electron-builder)

---

## Setup Diagram (3D Animated)

```
┌────────────────────────────────────────────────────────────┐
│                    NARAROUTER ARCHITECTURE                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   ┌──────────────┐        ┌──────────────────────────┐    │
│   │  Electron    │        │     Nararouter Desktop    │    │
│   │  Runtime     │        │     (Main Process)        │    │
│   │  Node 24.18  │        │                           │    │
│   └──────┬───────┘        └────────────┬─────────────┘    │
│          │                              │                  │
│          │        ┌─────────────────────┘                  │
│          │        │                                       │
│          ▼        ▼                                       │
│   ┌──────────────┐  ┌─────────────────────────────────┐   │
│   │  Native      │  │  Renderer Process                │   │
│   │  Modules     │  │  (React/Next.js Dashboard)       │   │
│   │  N-API       │  │                                 │   │
│   │  • better-   │  │  • OmniRoute Dashboard           │   │
│   │    sqlite3   │  │  • Provider Management           │   │
│   │  • @parcel/  │  │  • Usage Analytics               │   │
│   │    watcher   │  │  • Settings                      │   │
│   │  • keytar    │  │                                 │   │
│   │  • koffi     │  │  ┌──────────────────────────┐   │   │
│   └──────────────┘  │  │  System Tray             │   │   │
│                     │  │  • Minimize to tray      │   │   │
│                     │  │  • Context menu          │   │   │
│                     │  │  • Always on top         │   │   │
│                     │  └──────────────────────────┘   │   │
│                     └─────────────────────────────────┘   │
│                                                            │
│   ┌──────────────────────────────────────────────────┐    │
│   │  OmniRoute Server (dist/server-ws.mjs)           │    │
│   │  • Spawns via ELECTRON_RUN_AS_NODE               │    │
│   │  • Listens on port 20128                         │    │
│   │  • External mode detection                       │    │
│   └──────────────────────────────────────────────────┘    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Direct Installer Link

**Download Nararouter Installer:**
- **Portable**: [Nararouter-1.0.0.zip](https://github.com/Ventureverse0/nararouter/releases/latest)
- **Installer**: [Nararouter-Setup-1.0.0.exe](https://github.com/Ventureverse0/nararouter/releases/latest)

---

*Built with ❤️ using Electron 43 + Node 24.18.1*
