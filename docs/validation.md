# Validation

## Basic Checks

```bash
cd native
go test ./...
```

```bash
./scripts/build.sh
```

```bash
npm run check
```

Current implementation also includes:

- H.265 SDP parsing and RTP metadata tests.
- Pion WebRTC codec-selection tests.
- JS syntax checks for Electron/Tauri desktop apps.

## Native Messaging Ping

The native host reads one Chrome Native Messaging message, responds, then exits.
The gateway daemon stays alive and writes its state file.

Expected response:

```json
{
  "ok": true,
  "type": "ping",
  "port": 53745,
  "version": "0.1.0"
}
```

## Public RTSP E2E

Validated public source:

```txt
rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1
```

The full browser path was verified:

```txt
demo page -> content script -> extension iframe -> service worker
-> Chrome Native Messaging -> Go host -> Go gateway
-> RTSP over TCP -> WebRTC first when available
-> WebSocket/WebCodecs fallback -> Canvas
```

Observed browser result:

```txt
RTSP_PLAYER_READY
codec avc1.4D401E
~30 fps
queue 0
```

The public source is H.264, so it validates WebRTC/H.264 or H.264 fallback
depending on local browser capabilities. H.265 should be validated with a
known H.265 camera/NVR because public HEVC RTSP sources are frequently unstable.

Screenshot artifact:

![Public RTSP E2E](assets/public-rtsp-e2e.png)
