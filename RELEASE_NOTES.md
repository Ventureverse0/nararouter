# Nararouter v1.0.0

**Desktop sidebar app for the Nararouter AI router** — a modern evolution of OmniRoute.

## 📥 Download

| Type | File | Size | Use Case |
|------|------|------|----------|
| **NSIS Installer** | `Nararouter Setup 1.0.0.exe` | 520 MB | Permanent install, autostart |
| **Portable** | `Nararouter-portable.tar.gz` | 285 MB | Test first, no install |

## 🎯 What is Nararouter?

Nararouter wraps the OmniRoute AI router in a native Windows desktop app:
- **400px sidebar window** with native title bar
- **Minimize to tray** — stays running in background
- **Local storage only** — no cloud, no secrets shipped
- **External mode** — detects busy ports, coexists with existing servers

## 📦 Installation

### Portable (Recommended for Testing)
1. Download `Nararouter-portable.tar.gz`
2. Extract anywhere
3. Double-click `win-unpacked/Nararouter.exe`

### Installer (Permanent)
1. Download `Nararouter Setup 1.0.0.exe`
2. Run — no admin rights needed
3. App adds itself to Start Menu + Desktop
4. Auto-starts on login (via Windows Task Scheduler)

## 🔐 Security

- **Zero API keys shipped** — users enter their own on first run
- **All config stored locally** in `%USERPROFILE%\.nararoute\`
- **No network calls** for telemetry
- **External mode** — safe to run alongside existing OmniRoute

## 🛠️ Technical Details

| Component | Version |
|-----------|---------|
| Electron | v43.3.0 |
| Node.js (bundled) | 24.18.1 |
| Native modules | better-sqlite3, @parcel/watcher, keytar (N-API prebuilts) |
| Build config | `asar: false`, `npmRebuild: false` |

## 📂 Data Location

| Data | Path |
|------|------|
| Config | `%USERPROFILE%\.nararoute\` |
| Logs | `%USERPROFILE%\.nararoute\logs\desktop-app.log` |
| Server PID | `%USERPROFILE%\.nararoute\server\.pid` |

## 🚀 Quick Start

1. Download & extract or run installer
2. Launch `Nararouter.exe`
3. Dashboard opens at http://localhost:20128
4. Add your providers via the GUI
5. Configure AI routing

## ⚡ Performance Notes

- First launch may take 10-15 seconds while the server starts
- Subsequent launches are faster due to cached build artifacts
- If dashboard shows blank, wait 10 seconds and it will auto-load
- Server automatically reclaims port 20128 if another process is using it

---
*Built with ❤️ using Electron 43 + Node 24.18.1*
*Based on [OmniRoute](https://github.com/diegosouzapw/OmniRoute)*