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

`0.1.17` removes the recurring "`gateway startup lock timeout`" error reported by Windows users:

- A read-only health probe runs before the startup lock is taken, so when a healthy gateway is already running every native messaging call returns immediately without contending for the lock.
- The lock file now records the holder's PID. Waiters check whether that PID is still alive and reclaim the lock instantly when it is not, which covers the very common case of Chrome force-closing the short-lived native messaging host while it is holding the lock.
- Windows `processExists` no longer always returns false; it now uses `OpenProcess + GetExitCodeProcess` so stale gateway processes are detected and cleaned up correctly.
- The lock wait deadline is raised from 7 s to 20 s and the stale-lock threshold from 12 s to 30 s, giving cold-cache Windows machines (Defender scanning, slow disks) enough time to start the gateway without producing false timeouts.

`0.1.18` recovers playback for cameras whose RTSP stream is relayed through tunnels such as natapp. 0.1.16/0.1.17 dropped the oversized vendor SPS NAL, but on these relays the real SPS/PPS/IDR units travel as Annex-B data packed inside the FU-A fragments of the vendor SPS itself — discarding the whole NAL also threw away the real keyframe, so the browser was permanently stuck on `dropping delta frame before first keyframe`. 0.1.18 scans every oversized SPS for inline Annex-B start codes and salvages the embedded SPS/PPS/SEI/IDR units as independent NALs (see `h264 sps salvaged inline nalus`). Both the WebSocket and WebRTC paths use the same recovery logic.

`0.1.20`/`0.1.21` switch the WebRTC pipeline to `deepch/vdk` RTSP demux + a Pion sample track to fix camera compatibility issues at the root:

- The previous pipeline was a hand-rolled RTSP demuxer + Pion v4 + manual RTP repacketizer. Every new camera quirk (oversized vendor SPS, Annex-B-in-RTP, FU-A NAL-type spoofing) required a custom patch (0.1.16/0.1.17/0.1.18/0.1.19 were exactly that chain of band-aids).
- 0.1.20 uses vdk's `format/rtspv2` for RTSP demux. This RTSP/H.264 parsing path has been battle-tested by RTSPtoWeb against Chinese IP cameras, natapp relays, and assorted SPS extensions: it extracts clean SPS/PPS into codec data and emits clean H.264 access units.
- 0.1.21 creates its own Pion v4 `TrackLocalStaticSample`, rebuilds one Annex-B sample per video frame, and lets Pion repacketize it for WebRTC. This keeps vdk's RTSP compatibility while avoiding vdk webrtcv3's default STUN behavior and early packet writes before ICE is ready.
- Every keyframe sample re-injects the clean SPS/PPS extracted by vdk, so the browser decoder can recover even when the camera embeds vendor data near the keyframe.
- The vdk backend is the new default. If a specific stream regresses on vdk, set the environment variable `RTSP_WEBRTC_BACKEND=pion` when launching Chrome to fall back to the 0.1.19 hand-rolled path (debug-only).

The native gateway logs the active backend on startup: `webrtc backend: vdk` or `webrtc backend: pion`.

`0.1.24` fixes the "frame skips backwards every few frames" jitter seen when mediamtx republishes a High Profile MP4 (such as a HandBrake-encoded `1.mp4` with an IBBBP GOP and 24 fps) over RTSP and the browser receives the stream via WebRTC:

- Symptom: overall frame rate looks fine, but every few frames the picture snaps backwards by one or two frames before resuming. Visually it looks like a misaligned refresh.
- Root cause: Chrome's WebRTC RTP jitter buffer was never designed to tolerate B-frame PTS reordering. In an H.264 stream with B-frames, a B-frame's presentation time is *smaller* than the preceding P-frame's presentation time; Chrome's jitter buffer treats packets with regressing timestamps as late retransmissions and drops them. On top of that, vdk's webrtcv3 muxer accumulates RTP timestamps from `sample.Duration`, but the very first packet emitted by vdk has `Duration=0`, which already mis-aligns the first few samples.
- Fix: in the vdk backend, as soon as `dialRTSPWithCodecs` returns the first H.264 `CodecData`, we parse the SPS's `profile_idc` and `constraint_set1_flag` (see `internal/h264.SPSMayContainBFrames`). Anything other than baseline / constrained baseline is conservatively treated as B-frame capable. For those streams we refuse WebRTC negotiation with `OK=false, Fallback="ws-annexb"` so the player automatically switches to WebSocket + WebCodecs, which has a full DPB reorder buffer and handles regressing PTS correctly.
- Player.js drops the long-standing "force monotonic timestamp" line. The old `if (timestamp <= this.lastTimestamp) timestamp = this.lastTimestamp + 1` snippet was rewriting B-frame PTS into a +1 offset and destroying WebCodecs' DPB reordering. The new logic preserves the original PTS for every chunk and only intervenes when the timestamp regresses by more than 5 s (i.e. the upstream clock actually reset), in which case it shifts every subsequent chunk by a global offset instead of editing individual chunks.
- Logs: `webrtc vdk refusing offer ... profile_idc=100 constraint_set1=false (B-frames possible) -> ws-annexb` confirms the new fallback fired; `access unit timestamp reset detected` confirms the genuine timestamp-reset guard fired.
- Diagnostic helper: `go run ./cmd/vdk-smoke -url rtsp://...` now also prints `sps_profile_idc / constraint_set1 / may_contain_bframes`, so you can predict which transport the player will pick without opening the browser.

`0.1.19` finally lets WebRTC play baseline level 4.x camera streams end-to-end and stay stable:

- Chrome's SDP offer caps H.264 at `profile-level-id=42001f` (baseline level 3.1) so the previous "echo back" behaviour silently mis-configured the browser decoder when the camera was actually at level 4.0–5.0. Gateway now rewrites every H.264 `a=fmtp` line in the answer to `profile-level-id=42c033` (baseline level 5.1) with `level-asymmetry-allowed=1`, so Chrome accepts the real SPS verbatim (log: `webrtc answer profile-level-id upgraded to 42c033`).
- Browser-issued RTCP PLI (PT=206 FMT=1) and FIR (PT=206 FMT=4) feedback used to be discarded by `drainRTCP`. Gateway now parses them and forwards each request to the camera through a new `Client.RequestKeyframe()` API which produces a proper RTSP RTCP keyframe request (log: `webrtc rtcp browser PLI/FIR forwarded to RTSP source`). This closes the end-to-end recovery loop and prevents the player from getting stuck on a black frame after a single decode glitch.
- The keyframe RTP repacketizer coalesces leading SPS/PPS/SEI NALUs into a single STAP-A packet, so the browser receives a compact configuration packet right before the keyframe slice and is less likely to lose individual parameter sets to packet loss.
- The WebRTC first-frame timeout is raised from 5 s to 8 s so cameras with a 1.4 s GOP get five (instead of three) chances to deliver a fresh keyframe before the player falls back to WebSocket. Combined with the PLI feedback path, typical first-frame time on these cameras drops back into the ~1–2 s range.

Useful log keywords:

```txt
h264 annexb-in-rtp
h264 fu-a annexb-fragment
h264 sps oversized dropped
h264 sps salvaged inline nalus
webrtc repacketize
webrtc repacketize soft-starting h264 after parameters
vdk webrtc sample
vdk webrtc write sample failed
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
