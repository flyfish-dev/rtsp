# 项目总览

RTSP 是一套面向浏览器与桌面应用的本地 RTSP 播放运行时。它把摄像头或 NVR 的 RTSP 流拉到本机 Gateway，再交给浏览器使用 WebRTC 或 WebCodecs 硬件优先解码。

## 交付路径

1. **Chrome 扩展 Runtime**：适合普通网页和业务后台。扩展负责页面授权、iframe 播放器、Native Messaging 和 Gateway 启动。
2. **通用组件 SDK**：适合前端团队显式接入 Web Component、React 或 Vue。浏览器网页仍需要安装 Runtime；桌面应用可切到 `runtime="desktop"`。
3. **Electron / Tauri 免扩展**：适合桌面监控台。应用内打包 Go sidecar，不需要用户安装 Chrome 扩展。

## 核心链路

```txt
业务页面 / 桌面 WebView
  -> RTSP 组件
  -> Chrome 扩展或桌面 IPC
  -> Go Gateway 127.0.0.1
  -> RTSP over TCP interleaved
  -> WebRTC media track first
  -> WebSocket Annex-B + WebCodecs fallback
  -> Canvas / Video render
```

## 为什么需要本地 Gateway

浏览器不能直接打开 `rtsp://`，也不能随意创建 RTSP TCP 连接。RTSP 使用本地 Gateway 处理 RTSP、RTP、鉴权和 H.264/H.265 payload，再把浏览器能消费的视频路径暴露到本机。

默认优先 WebRTC，让 Chromium 或系统 WebView 走平台媒体管线；WebRTC 协商失败或短时间没有视频帧时，自动回退到本机 WebSocket + WebCodecs。

## RTSP 稳定性策略

协议层按 go2rtc 等成熟 RTSP 客户端的现场经验处理：默认使用 RTSP over TCP interleaved，读取服务端实际返回的 `interleaved` 通道号，支持 `Content-Base` / `Content-Location` 修正控制 URL，按 `Session timeout` 发送 `OPTIONS` keepalive，并能响应播放中的服务端 `OPTIONS` / `GET_PARAMETER` / `SET_PARAMETER` 请求。

低延迟策略是“少缓存、快起播、可恢复”：H.264 WebRTC 默认使用 vdk 拉流并输出干净 access unit，再写入 Pion sample track；H.265 在平台能力允许时走 RTP passthrough；WebSocket 回退只传 Annex-B access unit。H.264 起播会识别 IDR、non-IDR I/SI slice、AUD intra、拆包 SPS/PPS 后的刷新帧，以及带 SDP 参数集的首个 VCL 候选帧；解码异常时先重建解码器，连续失败再自动重拉流。

## 支持矩阵

| 能力 | 状态 |
| --- | --- |
| 视频编码 | H.264 稳定支持，H.265 按平台能力启用 |
| RTSP 传输 | TCP interleaved |
| RTSP 鉴权 | Basic / Digest |
| 浏览器解码 | WebRTC 优先，WebCodecs 回退 |
| 硬解 | `prefer-hardware` / 平台 WebRTC |
| 音频 | 暂不支持 |
| UDP RTP | 暂不支持 |
| FFmpeg | 不使用 |
| Node 网关 | 不使用 |

## 验证

项目已完成公开 H.264 RTSP 源、WebSocket/WebCodecs 回退、本机 4 路并发、生命周期清理、安装包和线上站点验证。

```txt
rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1
```

![公开 RTSP 验证](assets/public-rtsp-e2e.png)
