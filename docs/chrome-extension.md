# Chrome Runtime Extension

The Chrome extension path is the recommended deployment model for controlled
business pages, intranet dashboards, NVR consoles, and SaaS products that can
ask users to install a runtime extension.

## What It Provides

- MV3 Chrome extension.
- Content script that mounts `<rtsp-player>` on allowed web pages.
- Extension-owned iframe player page.
- Service worker that talks to the native host.
- Popup for Native Runtime health checks and allowed origins.
- WebRTC-first player with WebSocket/WebCodecs fallback and low-latency queue management.

## Build

```bash
./scripts/build.sh
```

macOS output:

```txt
dist/rtsp-web-native-darwin-arm64
```

Windows output:

```powershell
./scripts/build.ps1
```

## Load the Extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository `extension/` directory.
5. The extension ID is fixed by `manifest.json`:

```txt
giegomfhcmgebjhdiihnjohoinkbcjbh
```

## Register the Native Host

macOS:

```bash
./scripts/install-host.sh giegomfhcmgebjhdiihnjohoinkbcjbh ./dist/rtsp-web-native-darwin-arm64
```

Linux:

```bash
./scripts/install-host.sh giegomfhcmgebjhdiihnjohoinkbcjbh ./dist/rtsp-web-native-linux-amd64
```

Windows:

```powershell
./scripts/install-host.ps1 `
  -ExtensionId giegomfhcmgebjhdiihnjohoinkbcjbh `
  -BinaryPath .\dist\rtsp-web-native-windows-amd64.exe
```

On macOS the installer copies the binary to:

```txt
~/Library/Application Support/rtsp-web-player/rtsp-web-native
```

This is the recommended runtime location for the packaged installer.

## Authorize Page Origins

Open the extension popup and add your app origin:

```txt
http://localhost:5173
https://your-app.example.com
```

Use `*` only for local debugging. Production deployments should list exact
origins.

## Page Usage

When the extension content script is enabled for your site, the page only needs:

```html
<rtsp-player
  url="rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101"
  width="960"
  height="540"
  transport="auto"
  codec="auto"
  autoplay
  controls></rtsp-player>
```

Events:

```js
const player = document.querySelector("rtsp-player");

player.addEventListener("ready", () => {
  console.log("RTSP ready");
});

player.addEventListener("error", (event) => {
  console.error(event.detail.error);
});
```

## Production Hardening

`transport="auto"` is the recommended default. It attempts WebRTC first for
H.264/H.265 and falls back to `ws-annexb` if negotiation fails or no video
track arrives quickly.

Before shipping, change `extension/manifest.json` content script matches from
the broad development defaults to your own business domains.

```json
{
  "content_scripts": [
    {
      "matches": ["https://your-app.example.com/*"],
      "js": ["content/rtsp-component.js"]
    }
  ]
}
```

For enterprise rollout, publish the fixed-ID extension through Chrome Web Store
or Chrome Enterprise policy, then install the native host manifest with the same
extension ID.
