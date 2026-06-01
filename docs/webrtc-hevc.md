# WebRTC / H.265 方案

WebRTC 是桌面端和扩展播放器的默认优先链路。它可以让浏览器或系统 WebView 直接走硬件解码路径，避免把视频帧塞进 Native Messaging JSON，也避免在 Go 端转码。

## 策略

```txt
transport="auto"
  1. 探测 RTCPeerConnection + RTCRtpReceiver video capabilities
  2. 创建 recvonly video offer
  3. Go gateway 使用 Pion 创建 answer
  4. H.264 默认由 vdk RTSP demux 输出 access unit，再写入 Pion TrackLocalStaticSample
  5. H.265 在能力允许时走 Pion RTP passthrough
  6. 9 秒内没有可渲染视频帧或协商失败，回退 ws-annexb
```

默认 `codec="auto"` 会优先使用 H.264 WebRTC，因为 H.264 的浏览器支持最稳。H.265 摄像头可显式设置 `codec="h265"`；如果浏览器 offer 不包含 H.265，SDK 会立即回退。

## Native 实现

Go gateway 通过 vdk RTSP demux + Pion WebRTC 实现：

- `POST /api/webrtc/offer` 接收浏览器 offer。
- 根据 offer 与 `codec` 选择 H.264 或 H.265。
- H.264 默认使用 deepch/vdk 的 `rtspv2` 拉流并输出 access unit；Gateway 将同一帧 NAL 合成一个 Annex-B sample，写入 Pion `TrackLocalStaticSample`。
- H.264 每个关键帧 sample 前都会补入 vdk 提取出的干净 SPS/PPS，优先解决 VLC 能播但浏览器拒绝 vendor SPS 的现场流。
- H.265 仍使用 Pion RTP passthrough；只有浏览器 offer 明确支持 HEVC 时才启用。
- Pion 负责 WebRTC RTP packetization、SSRC 和 PayloadType。

## H.265 边界

Chrome 136 起开始支持 WebRTC HEVC，但官方说明编码能力依赖设备和操作系统。Electron 要看内置 Chromium 版本；Tauri 要看系统 WebView。H.265 因此是能力探测后的优先路径，不是全平台硬承诺。

建议：

- 生产默认 `codec="auto"`。
- H.265-only 摄像头使用 `codec="h265"`，并在 UI 上保留 H.264/子码流提示。
- 内网监控优先 RTSP over TCP，避免 UDP 丢包导致花屏。
- GOP 建议 1-2 秒，码率按分辨率合理控制，关闭 B 帧可降低实时播放延迟。

## 回退路径

WebRTC 失败时会走：

```txt
RTSP RTP/H.264 or H.265
  ↓ depay + Annex-B access unit
Gateway WebSocket
  ↓ binary frame
WebCodecs VideoDecoder prefer-hardware
Canvas
```

H.264 WebCodecs 是当前最稳的网页回退路径。H.265 WebCodecs 同样依赖平台 codec 支持；不支持时需要切摄像头编码。

## 参考

- Chrome 136 beta: HEVC joins WebRTC codecs in Chrome, with device/OS capability limits.
- W3C WebCodecs HEVC codec registration: HEVC bitstream formats and codec strings.
- RFC 7798: RTP payload format for HEVC.
- Pion `TrackLocalStaticSample`: suitable for browser-side H.264 packetization from Annex-B samples.
- Pion `TrackLocalStaticRTP`: suitable for pre-packetized RTP passthrough.
