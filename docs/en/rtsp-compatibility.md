# RTSP Compatibility Baseline

The RTSP runtime uses VLC/LIVE555 behavior as the compatibility baseline while keeping the Go core lightweight. It does not copy or link VLC, LIVE555, FFmpeg, or mpv source code.

## References

- VLC is open source. The VLC app is GPLv2+, and the libVLC engine is LGPLv2+.
- VLC handles RTSP/RTP mainly through LIVE555 in `modules/access/live555.cpp`.
- IINA is an open-source macOS player built on mpv; mpv relies heavily on FFmpeg/libavformat for network media handling.

These projects are useful references for mature client behavior. The current runtime keeps a clean Go implementation to preserve small size, licensing boundaries, and installer simplicity.

## Aligned RTSP Flow

```txt
parse URL
  -> OPTIONS
  -> DESCRIBE
  -> parse SDP session/media control
  -> SETUP video track with RTSP-over-TCP interleaved
  -> PLAY aggregate URL
  -> keepalive
  -> TEARDOWN on close
```

Key behavior:

- `OPTIONS` failure does not immediately fail playback; the client continues to `DESCRIBE`.
- If `Public` advertises `GET_PARAMETER`, keepalive uses `GET_PARAMETER`; otherwise it uses `OPTIONS`.
- SDP session-level and media-level `a=control` are both handled. Session control becomes the aggregate PLAY URL.
- `SETUP` prefers TCP interleaved and retries common `Transport` header variants.
- `RTP-Info` is logged after `PLAY` for RTP timestamp / sequence troubleshooting.
- The runtime sends `TEARDOWN` when playback closes to prevent stale camera/NVR sessions.

## WebRTC Strategy

- WebRTC stays the default first path because it gives the shortest browser hardware-decode route.
- H.264 WebRTC requires `packetization-mode=1`; the gateway chooses the best matching browser-offered `profile-level-id`.
- H.265/HEVC is used only when the browser offer explicitly supports it; otherwise playback falls back to H.264 or WebSocket + WebCodecs.
- The Go gateway does not transcode. H.264 defaults to vdk-demuxed access units written into a Pion sample track; H.265 uses RTP passthrough when supported, keeping CPU and latency low.

## Limits

- Normal web pages cannot open RTSP or start local programs directly; they need the extension, desktop app, or local gateway.
- WebRTC/H.265 depends on browser, OS, hardware, and WebView support.
- VLC/IINA can depend on large native media stacks. This project keeps the runtime smaller for browser distribution.

## Troubleshooting

When a customer reports “VLC plays but RTSP Player does not,” enable `Debug 级日志` in the extension popup, reproduce once, and copy logs. Debug logs include:

- OPTIONS / DESCRIBE / SETUP / PLAY status and key headers.
- SDP source, selected video track, fmtp, SPS/PPS/VPS lengths.
- RTP seq / timestamp / marker / payload type.
- H.264/H.265 NAL types, access-unit flush reason, and key-frame output.
- WebRTC offer/answer, codec fmtp, RTP forwarding, and WebSocket fallback state.
