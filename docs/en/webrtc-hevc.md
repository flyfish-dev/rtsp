# WebRTC / H.265

WebRTC is the default preferred media path. It allows Chromium or the system WebView to use the platform media pipeline and hardware decoding.

## Strategy

```txt
transport="auto"
  1. Probe RTCPeerConnection and receiver video capabilities
  2. Create a recvonly video offer
  3. Go Gateway creates an answer through Pion
  4. RTSP RTP packets are written into WebRTC TrackLocalStaticRTP
  5. If negotiation or first video fails, fallback to ws-annexb
```

`codec="auto"` prefers the most stable path. H.265 can be requested with `codec="h265"`, but it only works when the browser, OS, and hardware expose HEVC capability.

## Fallback

```txt
RTSP RTP/H.264 or H.265
  -> depay + Annex-B access unit
  -> Gateway WebSocket
  -> WebCodecs VideoDecoder prefer-hardware
  -> Canvas
```

H.264 WebCodecs is the safest fallback. H.265 WebCodecs is also platform-dependent.
