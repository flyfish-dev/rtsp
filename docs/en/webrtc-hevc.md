# WebRTC / H.265

WebRTC is the default preferred media path. It allows Chromium or the system WebView to use the platform media pipeline and hardware decoding.

## Strategy

```txt
transport="auto"
  1. Probe RTCPeerConnection and receiver video capabilities
  2. Create a recvonly video offer
  3. Go Gateway creates an answer through Pion
  4. H.264 uses vdk RTSP demux, rebuilds Annex-B samples, then writes them into Pion TrackLocalStaticSample
  5. H.265 uses Pion RTP passthrough when the browser exposes HEVC capability
  6. If negotiation or the first rendered frame fails within 9 seconds, fallback to ws-annexb
```

`codec="auto"` prefers the most stable path. H.265 can be requested with `codec="h265"`, but it only works when the browser, OS, and hardware expose HEVC capability.

For H.264, vdk extracts clean SPS/PPS and access units from the RTSP stream. The Gateway re-injects clean SPS/PPS before keyframes, writes one Annex-B sample per frame into Pion `TrackLocalStaticSample`, and lets Pion handle WebRTC packetization. This avoids the old hand-rolled FU-A path and improves compatibility with vendor-modified SPS streams.

H.265 remains on the RTP passthrough path and is only enabled when the browser offer explicitly advertises HEVC.

## Fallback

```txt
RTSP RTP/H.264 or H.265
  -> depay + Annex-B access unit
  -> Gateway WebSocket
  -> WebCodecs VideoDecoder prefer-hardware
  -> Canvas
```

H.264 WebCodecs is the safest fallback. H.265 WebCodecs is also platform-dependent.
