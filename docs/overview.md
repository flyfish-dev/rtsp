# RTSP Overview

RTSP is a browser and desktop playback runtime for RTSP streams. It ships three
integration paths:

1. **Chrome Runtime Extension**: the extension injects `<rtsp-player>` on
   allowed pages and owns the iframe player.
2. **Universal Components SDK**: application teams import a Web Component,
   React component, or Vue component and point it at the installed extension.
3. **Electron/Tauri Desktop**: desktop apps bundle the Go sidecar and play
   without installing a browser extension.

All paths use the same native runtime:

```txt
Web page
  -> Chrome extension iframe
  -> Chrome service worker
  -> Native Messaging
  -> Go Native Host
  -> Go Gateway on 127.0.0.1
  -> RTSP over TCP interleaved
  -> WebRTC RTP passthrough first
  -> WebSocket Annex-B + WebCodecs fallback
  -> Canvas
```

## Why This Architecture

Browsers cannot open RTSP sockets directly, and Native Messaging is not suitable
for high-volume video frames. RTSP uses Native Messaging only for startup and
control. The default video path uses WebRTC so Chromium/System WebView can use
the platform media pipeline for H.264/H.265. If WebRTC negotiation fails or no
video arrives quickly, the player falls back to a local WebSocket served from
`127.0.0.1`.

This keeps the performance-sensitive path binary and low overhead while still
using official Chrome extension APIs for the trust boundary.

## Current Support Matrix

| Area | Status |
| --- | --- |
| Video codec | H.264 baseline, H.265/HEVC capability-gated |
| RTSP transport | TCP interleaved |
| RTSP auth | Basic and Digest |
| Browser decode | WebRTC first, WebCodecs fallback |
| Hardware decode | Requested with `prefer-hardware` |
| Audio | Not included |
| H.265/HEVC | WebRTC/WebCodecs when platform supports it |
| UDP RTP | Not included |
| FFmpeg | Not used |
| Node gateway | Not used |

## Public Stream Validation

The project has been validated against a public Wowza RTSP stream:

```txt
rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1
```

The browser E2E test rendered video through the full extension and native
runtime path, emitted `RTSP_PLAYER_READY`, and captured the canvas-backed frame.

![Public RTSP E2E](assets/public-rtsp-e2e.png)
