# Gateway for Web Components Without Chrome Extension

This guide is for customers who want to integrate the Web Component without installing the Chrome extension.

Clear rule:

- A normal browser page cannot play RTSP by Web Component alone.
- If the Chrome extension is not installed, a trusted host application must install and start the local Gateway.
- The recommended extension-free path is Electron or Tauri.

## Why Pure Web Is Not Enough

Browser sandboxing prevents a page from:

- Opening `rtsp://` directly.
- Creating arbitrary RTSP TCP sockets.
- Starting local executables.
- Reading a local Gateway secret safely.

## Customer Installation Paths

### Path A: Desktop App

Use this when customers should install one app and play directly.

1. Bundle `rtsp-web-native` as an Electron/Tauri sidecar.
2. Start the Go Gateway from the main process.
3. Expose a safe bridge as `window.rtspNative` or `window.__RTSP_DESKTOP__`.
4. Use `<rtsp-player runtime="desktop">`.

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

### Path B: Browser Page + Chrome Runtime

Use this when customers must open a business page in Chrome.

1. Run the graphical installer.
2. Install the Native Runtime.
3. Load the fixed-ID Chrome extension.
4. Allow the business origin in the extension popup.
5. Use the Web Component, React component, or Vue component.

## Required Bridge API

```ts
window.rtspNative = {
  startStream(input): Promise<{
    ok: boolean;
    streamId: string;
    streamToken?: string;
    wsUrl?: string;
    webRTCUrl?: string;
    codec?: string;
    error?: string;
  }>,
  stopStream(input): Promise<{ ok: boolean; stopped?: boolean }>,
  createWebRTCOffer?(input): Promise<{
    ok: boolean;
    streamId?: string;
    answer?: string;
    codec?: string;
    fallback?: string;
    error?: string;
  }>
};
```

`startStream` and `stopStream` are enough for WebSocket + WebCodecs. Add `createWebRTCOffer` for WebRTC/H.265-first playback.

## Recommended Customer Message

> Browsers do not support RTSP directly and cannot start local programs. RTSP Gateway is the local video runtime that connects to the camera and exposes browser-safe WebRTC/WebSocket playback. If you do not install the Chrome extension, use the desktop installer; the desktop app includes and starts the Gateway automatically.
