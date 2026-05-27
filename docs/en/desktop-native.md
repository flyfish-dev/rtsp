# Electron / Tauri Desktop Native

The desktop path bundles the Go runtime as an application sidecar. The app starts the localhost Gateway and the renderer uses the same `<rtsp-player>` component without installing a Chrome extension.

## Pipeline

```txt
Electron/Tauri UI
  -> window.rtspNative / Tauri invoke
  -> Go sidecar gateway
  -> RTSP over TCP interleaved
  -> WebRTC first
  -> WebSocket/WebCodecs fallback
```

## Electron

```bash
npm run build:sdk
./scripts/build.sh
cd apps/electron
npm install
npm run start
```

The main process starts the Gateway and exposes IPC methods for `startStream`, `stopStream`, `createWebRTCOffer`, and health checks.

## Tauri

```bash
npm run build:sdk
./scripts/build.sh
npm run build:desktop
cd apps/tauri
npm install
npm run dev
```

Tauri v2 uses `bundle.externalBin` for the sidecar.

## Component Usage

```html
<rtsp-player
  runtime="desktop"
  transport="auto"
  codec="auto"
  url="rtsp://user:pass@camera/stream"
  autoplay
  controls>
</rtsp-player>
```

H.265 depends on the platform codec stack. Keep an H.264 substream as the stable fallback.
