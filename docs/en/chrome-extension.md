# Chrome Extension Runtime

The Chrome extension path is recommended for browser pages, intranet dashboards, NVR consoles, and SaaS products.

## Features

- Chrome MV3 extension.
- Content script that mounts `<rtsp-player>`.
- Extension-owned iframe player.
- Service worker using Native Messaging for control.
- Popup for allowed origins, logs, diagnostics, and Gateway restart.
- WebRTC first with WebSocket/WebCodecs fallback.

## Recommended Installation

Use the graphical installer from the online assistant:

```txt
https://rtsp.flyfish.dev/#demo
```

Fixed extension ID:

```txt
giegomfhcmgebjhdiihnjohoinkbcjbh
```

## Development Setup

Build the native runtime:

```bash
./scripts/build.sh
```

Load the extension:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the repository `extension/` directory.

Register the native host:

```bash
./scripts/install-host.sh giegomfhcmgebjhdiihnjohoinkbcjbh ./dist/rtsp-web-native-darwin-arm64
```

Windows:

```powershell
./scripts/install-host.ps1 `
  -ExtensionId giegomfhcmgebjhdiihnjohoinkbcjbh `
  -BinaryPath .\dist\rtsp-web-native-windows-amd64.exe
```

## Authorize Origins

Open the extension popup and add the exact page origin:

```txt
http://localhost:5173
https://your-app.example.com
```

The content script also supports an explicit current-page auto-allow request:

```js
window.postMessage({ type: "RTSP_ALLOW_ORIGIN_REQUEST" }, location.origin);
```

Or include it in the install status check:

```js
window.postMessage({ type: "RTSP_INSTALL_STATUS_REQUEST", autoAllowOrigin: true }, location.origin);
```

The extension stores only the current page `location.origin`; the page cannot ask the extension to allow an arbitrary third-party origin.

## Page Usage

```html
<rtsp-player
  url="rtsp://user:pass@camera/stream"
  width="960"
  height="540"
  autoplay
  controls>
</rtsp-player>
```

## Diagnostics

For customer playback failures, open the extension popup, refresh logs, then copy the log bundle. Credentials, tokens, and secrets are redacted automatically.
