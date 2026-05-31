# RTSP 兼容性基线

本项目的 RTSP runtime 以 VLC/LIVE555 的客户端行为作为兼容性基线，同时保持 Go core 轻量实现，不复制 VLC、LIVE555、FFmpeg 或 mpv 源码。

## 参考对象

- VLC 是开源播放器。VLC 应用是 GPLv2+，libVLC engine 是 LGPLv2+。
- VLC 的 RTSP/RTP 入口主要通过 LIVE555：`modules/access/live555.cpp`。
- IINA 是开源 macOS 播放器，播放核心依赖 mpv；mpv 的网络媒体能力主要来自 FFmpeg/libavformat。

这些项目的源码可用于理解行业成熟行为，但当前 Go runtime 不直接链接或复制这些代码，以保持交付体积、授权边界和安装体验可控。

## 已对齐的 RTSP 流程

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

关键行为：

- `OPTIONS` 失败不直接判死，继续 `DESCRIBE`，兼容部分只实现核心 RTSP 方法的摄像头。
- 如果 `Public` 暴露 `GET_PARAMETER`，keepalive 使用 `GET_PARAMETER`；否则使用 `OPTIONS`。
- SDP 同时处理 session-level 和 media-level `a=control`，用 session control 作为 aggregate PLAY URL。
- `SETUP` 优先 TCP interleaved，并按多个常见 `Transport` 写法重试。
- `PLAY` 后记录 `RTP-Info`，用于调试 RTP timestamp / seq 对齐问题。
- 播放结束或网页关闭时主动 `TEARDOWN`，避免摄像头/NVR 残留旧 session。

## WebRTC 兼容策略

- 默认仍优先 WebRTC，因为它是浏览器里延迟最低、平台硬解路径最短的方案。
- H.264 WebRTC 只接受 `packetization-mode=1`，并从浏览器 offer 中优先选择更适合高码流摄像头的 `profile-level-id`。
- H.265/HEVC 只在浏览器 offer 明确支持时启用；否则立即回退到 H.264 或 WebSocket + WebCodecs。
- Go gateway 不转码。H.264 默认由 vdk demux 成 access unit 后写入 Pion sample track；H.265 在能力允许时尽量 RTP passthrough，减少 CPU 与延迟。

## 不能承诺的部分

- 普通网页不能直接打开 RTSP，也不能直接启动本地程序；必须通过扩展、桌面 app 或本地 gateway。
- WebRTC/H.265 取决于浏览器、系统、硬件和 WebView，不能保证所有设备可用。
- VLC/IINA 可以依赖大型本地媒体库；本项目为了浏览器分发和安装体验，仍保持最小 Go runtime。

## 排障建议

客户反馈“VLC 能播但 RTSP Player 不能播”时，先开启扩展里的 `Debug 级日志`，复现一次并复制日志。日志会包含：

- OPTIONS / DESCRIBE / SETUP / PLAY 响应状态与关键 header。
- SDP 原文、选中的 video track、fmtp、SPS/PPS/VPS 长度。
- RTP seq / timestamp / marker / payload 类型。
- H.264/H.265 NAL 类型、AU flush 原因、是否输出 key access unit。
- WebRTC offer/answer、codec fmtp、RTP 转发和 WebSocket 回退状态。
