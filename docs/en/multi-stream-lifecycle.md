# Multi-stream and Lifecycle

Multiple players are supported. Each `<rtsp-player>` instance owns its own `streamId`, media connection, decoder, and cleanup path.

```txt
created -> connecting -> playing -> stopping -> stopped
                         -> error
```

## Model

- Each playback request creates a unique `streamId`.
- Chrome extension players use separate iframe, WebRTC/WebSocket, decoder, canvas, and RTSP client.
- Electron/Tauri desktop players use the same Gateway API and independent stream IDs.
- Gateway diagnostics track pending and active streams separately.

## Cleanup

- `startStream` creates a pending session with a one-time token.
- WebSocket claims the session when the media socket connects.
- WebRTC claims it during offer creation.
- `stopStream` cancels the RTSP pull, closes media transport, and removes Gateway state.
- Disconnection, failed WebRTC negotiation, and WebSocket close all remove active records.

## Auto Recovery

- WebCodecs decode errors first rebuild the decoder and wait for the next key frame.
- Repeated decode errors restart the full stream.
- WebSocket close, Gateway errors, and video stalls trigger stream restart.
- WebRTC failure, ended tracks, or video stalls switch to the stable WebSocket fallback.

Recovery uses exponential backoff and emits `recovering` / `recovered` events.

## Validation

The current build has been validated with 4 simultaneous local H.264 RTSP streams. After stopping all streams, diagnostics returned `pendingStreams = 0` and `activeStreams = 0`.
