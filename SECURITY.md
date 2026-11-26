# Security Policy — Sapira Media Player

## Supported Versions

Security updates are provided for the latest release of **Sapira Media Player** built on a currently supported Electron series:

| Version | Electron Engine | Supported |
| --- | --- | --- |
| `0.1.x` | Electron `45.x` | ✅ Yes |
| `< 0.1.0` | Legacy | ❌ No |

## Security Architecture

- **Renderer Sandbox**: Enabled (`sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`).
- **Content Security Policy (CSP)**: Enforced in `index.html` with navigation (`will-navigate`) and popup (`setWindowOpenHandler`) lockdown.
- **IPC Sender Verification**: Every `ipcMain` channel validates `event.sender`, `event.senderFrame === mainFrame`, and allowed origin URLs.
- **Zero Telemetry**: No automatic outbound network connections occur unless explicitly initiated by the user.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for undisclosed security vulnerabilities. Instead, use GitHub's **Report a vulnerability** (Private Vulnerability Reporting) tab on this repository, and we will respond within 72 hours.
