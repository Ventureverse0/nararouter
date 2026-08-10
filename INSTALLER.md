# Nararouter Installer Script

This script creates an NSIS installer for Nararouter Desktop.

## Usage

```powershell
# Build the installer
cd "E:\NovaEra Hub\useful projects\hermes-ecosystem\nararoute-desktop"
npx electron-builder --win nsis --publish never

# Or build portable
npx electron-builder --win portable --publish never
```

## Output

- **NSIS Installer**: `dist/Nararouter-Setup-1.0.0.exe`
- **Portable**: `dist/Nararouter-1.0.0.exe`

## Distribution

### Option 1: GitHub Releases
Upload the installer to GitHub Releases. Users can download and install without admin rights.

### Option 2: Direct Download
Host the installer on your web server. Users download and run it.

### Option 3: Portable
Extract the portable zip anywhere. Run `Nararouter.exe` directly.

## Files

| File | Purpose |
|------|---------|
| `Nararouter.exe` | Main application (portable) |
| `Nararouter-Setup.exe` | NSIS installer (per-user, no admin) |
| `resources/` | App resources (icons, assets) |
| `node_modules/` | Dependencies (bundled) |
| `main.js` | Application entry point |
| `package.json` | Configuration |

## Installation Notes

1. **No admin required** — Installer runs per-user
2. **No Node.js needed** — Bundled runtime (Electron 43 + Node 24.18.1)
3. **No API keys shipped** — Each user configures their own on first run
4. **Privacy** — All config stored in `~/.nararoute/` (or `%APPDATA%\nararoute`)

## Environment

- **App ID**: `com.nararouter.desktop`
- **Port**: 20128 (configurable via `NARAROUTER_PORT`)
- **Data dir**: `~/.nararoute/` or `%APPDATA%\nararoute`
- **Logs**: `~/.nararoute/logs/desktop-app.log`

## Troubleshooting

### Build locks
```powershell
# Kill any processes holding the dist folder
Get-Process | Where-Object { $_.Path -like "*nararoute*" -or $_.Path -like "*electron*" } | Stop-Process -Force
```

### NSIS hangs
Use portable target instead:
```bash
npx electron-builder --win portable --publish never
```

### Exe won't run
Make sure you're running from the correct location:
```
E:\NovaEra Hub\useful projects\hermes-ecosystem\nararoute-desktop\dist\win-unpacked\Nararouter.exe
```

### Logs
Check `C:\Users\<user>\.nararoute\logs\desktop-app.log` for startup logs.
