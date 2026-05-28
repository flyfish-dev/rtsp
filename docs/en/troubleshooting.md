# Troubleshooting

## Native Runtime Missing

Check the Native Messaging manifest.

macOS:

```txt
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.rtspweb.player.json
```

Linux:

```txt
~/.config/google-chrome/NativeMessagingHosts/com.rtspweb.player.json
```

The manifest must allow the fixed extension ID:

```txt
chrome-extension://giegomfhcmgebjhdiihnjohoinkbcjbh/
```

## VLC Works but Browser Does Not

Open the extension popup:

1. Click Refresh logs.
2. Click Copy logs.
3. Send the copied bundle to support.

Logs include extension events, Native Runtime health, Gateway PID/port, RTSP handshake, selected track, WebRTC negotiation, WebSocket fallback, decoder recovery, and auto-restart attempts. Credentials and tokens are redacted.

Common log meanings:

- `PLAY: not RTSP response: "$..."`: some cameras send an RTCP interleaved packet before the PLAY response. `0.1.6` skips those packets and continues reading the real RTSP response.
- `FU-A continuation without start`: playback joined the live H.264 stream in the middle of a fragmented frame. This is normal for live streams. The player waits for the next IDR keyframe instead of restarting too early.
- `non-existing PPS 0 referenced` / `decode_slice_header error` / `no frame!`: the source is sending slices that reference a PPS before the client has received that PPS. `0.1.12` waits for complete SPS/PPS before WebRTC/WS startup and sends RTCP PLI/FIR upstream to request a fresh keyframe and parameter sets. If the stream still never provides PPS, configure the camera or restreamer to include SPS/PPS with keyframes.
- `first access unit ... key=false bytes=...` while VLC plays: some cameras encode startup pictures as non-IDR I-slices or split SPS/PPS into standalone RTP marker packets. `0.1.9` treats I/SI slices, intra AUDs, VCL after split SPS/PPS, and the first VCL with known SDP parameter sets as key/startup frame candidates.
- `DESCRIBE/SETUP/PLAY status 401`: the camera rejected RTSP authentication. Verify username, password, and live-view permissions. `0.1.9` adds Digest URI compatibility retries; if it still fails, try removing URL parameters such as `?transportmode=...&profile=...`.
- `Waiting for the first camera key/startup frame`: RTSP is connected and the browser is waiting for the first decodable frame. Set camera GOP to 1-2 seconds for faster first paint.

## Stale Gateway After Upgrade

Click Restart Native in the extension popup. The current Native Host will clear stale state, stop identifiable old Gateway processes, and start the installed runtime version.

## Origin Not Allowed

Add the exact page origin in the extension popup:

```txt
http://localhost:5173
https://your-app.example.com
```

Production demo origins:

```txt
https://rtsp.flyfish.dev
https://rtsp-roan.vercel.app
```

## Black Screen or Decode Error

Recoverable errors are handled automatically. The player first rebuilds the WebCodecs decoder; repeated failures clean the current `streamId` and restart the stream.

Useful log keywords:

```txt
RTSP_PLAYER_RECOVERING
decoder-error-loop
video-stall
websocket-closed
gateway-error
```

If recovery keeps failing, use an H.264 substream, set GOP to 1-2 seconds, and reduce bitrate.

For FFmpeg restreaming, avoid a bare `-vcodec copy` path that still omits parameter sets. Prefer camera-side SPS/PPS on every keyframe; when that is not configurable, evaluate an H.264 bitstream filter such as `dump_extra=freq=keyframe` in the restreaming pipeline.

## VLC Plays but Browser Shows No Video

Some cameras or RTSP restreamers put Annex-B H.264 byte streams directly inside RTP payloads, sometimes inside a FU-A wrapper. This is not standard RFC6184 packetization, but VLC and FFmpeg accept it.

`0.1.14` supports this compatibility path. The Gateway detects `Annex-B-in-RTP`; the WebSocket/WebCodecs path splits NAL units correctly, and the WebRTC path tries to repacketize Annex-B into browser-compatible H.264 RTP before falling back to WebSocket.

`0.1.15` adds another field compatibility path for cameras that emit many non-IDR VCL packets first and expose PPS only after the stream is already running. The Gateway now syncs runtime SPS/PPS updates into the WebSocket access-unit assembler. WebRTC also soft-starts after parameter sets are available when keyframe detection stays inconclusive, matching the tolerant VLC/FFmpeg startup behavior while still injecting parameter sets.

`0.1.16` handles cameras that smuggle vendor-specific metadata inside the H.264 SPS NAL unit (type 7). These fake SPS units typically exceed 80 KB and arrive as FU-A fragments right next to the IDR. The Gateway now drops any SPS NAL larger than 512 bytes (a valid SPS is usually 10–30 bytes), keeping the small standard SPS that the same camera also emits inline so the decoder can still be configured. Results: startup drops from ~17 s to <1 s, keyframes go from ~85 KB back to ~1 KB, the periodic stutter and frame backtracking disappear, and WebRTC stops failing because the decoder no longer sees an oversized SPS. The WebRTC first-frame timeout has also been reduced from 15 s to 5 s so cameras that genuinely cannot deliver WebRTC fall back to WebSocket much sooner.

Useful log keywords:

```txt
h264 annexb-in-rtp
h264 fu-a annexb-fragment
webrtc repacketize
webrtc repacketize soft-starting h264 after parameters
h264 runtime parameter sync
first access unit
```

## WebRTC Plays but Stutters

`0.1.13` adds two safeguards. The Gateway lightly paces outgoing WebRTC RTP by RTP timestamp so RTSP/TCP bursts do not hit the browser jitter buffer all at once. The player also samples real decoded video frames; if a WebRTC session has very low frame rate or large frame gaps, `auto` transport switches to WebSocket/WebCodecs automatically.

Useful log keywords:

```txt
WebRTC smoothness sample
webrtc-poor-smoothness
falling back to WebSocket transport
```
