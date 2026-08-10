# Nararouter Release v1.0.0

**Desktop sidebar app for the Nararouter AI router**

## 📥 Download Nararouter

| Version | File | Size | Description |
|---------|------|------|-------------|
| v1.0.0 | [Nararouter-Setup-1.0.0.exe](https://github.com/Ventureverse0/nararouter/releases/download/v1.0.0/Nararouter-Setup-1.0.0.exe) | 215 MB | NSIS Installer (per-user, no admin) |
| v1.0.0 | [Nararouter-1.0.0.exe](https://github.com/Ventureverse0/nararouter/releases/download/v1.0.0/Nararouter-1.0.0.exe) | 215 MB | Portable EXE (run anywhere) |
| v1.0.0 | [Nararouter-1.0.0.zip](https://github.com/Ventureverse0/nararouter/releases/download/v1.0.0/Nararouter-1.0.0.zip) | 215 MB | Portable ZIP (extract and run) |

## 🚀 Installation

### Option 1: Installer (Recommended)
1. Download `Nararouter-Setup-1.0.0.exe`
2. Double-click to run
3. No admin rights required
4. App appears in Start Menu + Desktop shortcut
5. Minimizes to tray automatically

### Option 2: Portable
1. Download `Nararouter-1.0.0.exe` or `Nararouter-1.0.0.zip`
2. Run directly or extract anywhere
3. Double-click `Nararouter.exe`

## 📋 System Requirements

- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4GB+ recommended
- **Disk**: 500MB free space
- **Node.js**: NOT required (bundled)

## 🎯 Features

- ✅ 400px sidebar window docks to left edge
- ✅ System tray icon (minimize to tray)
- ✅ No taskbar button (clean desktop)
- ✅ Zero API keys shipped (secure by design)
- ✅ Local config storage (`~/.nararoute/`)
- ✅ External mode detection (port 20128)
- ✅ First-run dashboard setup
- ✅ Provider management UI
- ✅ Usage analytics dashboard
- ✅ Settings configuration

## 🔧 First Run

1. Launch `Nararouter.exe`
2. Sidebar window opens with OmniRoute dashboard
3. Port 20128 auto-detected
4. If busy → external mode (leaves existing server untouched)
5. If free → spawns OmniRoute server automatically
6. Configure providers via dashboard

## 📊 Dashboard URL

- **Local**: http://localhost:20128
- **Network**: http://[your-ip]:20128

## 🔐 Security

- **No keys in installer**: Zero API keys shipped
- **Local storage**: All config stays on your machine
- **External mode**: Nararouter detects busy ports and leaves existing servers untouched
- **First-run**: Each user configures their own providers via the dashboard

## 📁 Data Locations

| Data | Location |
|------|----------|
| Config | `%USERPROFILE%\.nararoute\` |
| Logs | `%USERPROFILE%\.nararoute\logs\desktop-app.log` |
| PID | `%USERPROFILE%\.nararoute\server\.pid` |

## ⌨️ Keyboard Shortcuts

- `Ctrl+W` — Close window (minimize to tray)
- `Ctrl+R` — Restart server
- `Esc` — Quit app

## 🐛 Troubleshooting

### Build locks
```powershell
Get-Process | Where-Object { $_.Path -like "*nararoute*" -or $_.Path -like "*electron*" } | Stop-Process -Force
```

### NSIS hangs
Use portable target instead:
```bash
npx electron-builder --win portable --publish never
```

### Exe won't run
Run from `dist/win-unpacked/`:
```
E:\NovaEra Hub\useful projects\hermes-ecosystem\nararoute-desktop\dist\win-unpacked\Nararouter.exe
```

### Logs
Check: `C:\Users\<user>\.nararoute\logs\desktop-app.log`

## 📦 Technical Details

| Component | Version |
|-----------|---------|
| Electron | v43.3.0 |
| Node.js | 24.18.1 (bundled) |
| electron-builder | v26.15.3 |
| Build config | `asar: false`, `npmRebuild: false` |
| Runtime | `ELECTRON_RUN_AS_NODE=1` |

## 📜 License

MIT — based on OmniRoute (MIT)

## 🔗 Links

- **Original Repo**: https://github.com/diegosouzapw/OmniRoute
- **This Repo**: https://github.com/Ventureverse0/nararouter
- **Issues**: https://github.com/Ventureverse0/nararouter/issues

---

*Built with ❤️ using Electron 43 + Node 24.18.1*
