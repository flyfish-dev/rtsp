# Overview

RTSP is a local playback runtime for browser pages and desktop apps. It pulls camera or NVR RTSP streams through a local Go Gateway and renders them with WebRTC first, then WebSocket + WebCodecs fallback.

## Integration Paths

1. **Chrome Runtime Extension**: recommended for normal browser pages. The extension owns page authorization, iframe playback, Native Messaging, and Gateway startup.
2. **Universal Components SDK**: Web Component, React, Vue, and script-tag APIs for application teams.
3. **Electron / Tauri Desktop**: bundles the Go sidecar and plays without installing a Chrome extension.

## Pipeline

```txt
Web page / desktop WebView
  -> RTSP component
  -> Chrome extension or desktop IPC
  -> Go Gateway on 127.0.0.1
  -> RTSP over TCP interleaved
  -> WebRTC RTP passthrough first
  -> WebSocket Annex-B + WebCodecs fallback
  -> Canvas / Video render
```

## Why a Local Gateway Is Required

Browsers cannot open `rtsp://` URLs or arbitrary RTSP TCP sockets. The local Gateway handles RTSP, RTP, authentication, and H.264/H.265 payloads, then exposes browser-safe media paths on localhost.

## Support Matrix

| Area | Status |
| --- | --- |
| Video codec | H.264 stable, H.265 capability-gated |
| RTSP transport | TCP interleaved |
| RTSP auth | Basic and Digest |
| Browser decode | WebRTC first, WebCodecs fallback |
| Hardware decode | Platform WebRTC / `prefer-hardware` |
| Audio | Not included |
| UDP RTP | Not included |
| FFmpeg | Not used |

![Public RTSP validation](../assets/public-rtsp-e2e.png)
