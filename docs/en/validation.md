# Validation

## Checks

```bash
npm run check
```

Includes SDK build, JS syntax checks, Go tests, and site build.

```bash
cd native
go test ./...
```

```bash
npm run build:installers
cd apps/tauri/src-tauri && cargo check
```

## Native Messaging

The native host reads one message, responds, and exits. The Gateway daemon stays alive and writes its state file.

Expected ping:

```json
{
  "ok": true,
  "type": "ping",
  "port": 53745,
  "version": "0.1.9"
}
```

## Public RTSP E2E

```txt
rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1
```

Public streams may be rate-limited or unavailable. Production validation should use your own camera/NVR.

## Local Multi-stream Validation

Validated local source:

```txt
rtsp://127.0.0.1:8554/local
```

`0.1.9` compatibility regression also used a MediaMTX + FFmpeg H.264 TCP interleaved source:

```txt
rtsp://127.0.0.1:18554/codex-test
```

Result:

```txt
DESCRIBE/SETUP/PLAY passed
received codec config: avc1.42C01E
first access unit key=true
received continuous H.264 Annex-B binary frames
```

Result:

```txt
4 simultaneous startStream calls
each stream received H.264 Annex-B binary frames
activeStreams = 4
after stopStream: pendingStreams = 0, activeStreams = 0
```
