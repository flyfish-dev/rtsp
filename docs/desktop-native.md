# Electron / Tauri 免插件桌面方案

桌面方案把 Go runtime 作为应用 sidecar 打包进 Electron 或 Tauri。应用进程负责启动 `127.0.0.1` 本地 gateway，渲染层使用同一个 `<rtsp-player>`，不需要安装 Chrome 扩展或 Native Messaging Host。

## 默认链路

```txt
Electron/Tauri UI
  ↓ window.rtspNative / Tauri invoke
Go sidecar gateway
  ↓ RTSP over TCP interleaved
Camera / NVR
  ↓ H.264 sample track / H.265 RTP passthrough
WebRTC PeerConnection
  ↓ browser/system hardware decoder
Canvas render
```

默认使用 `transport="auto"`，播放器会优先尝试 WebRTC。WebRTC 协商失败、9 秒内没有可渲染视频帧、或系统 WebView 不支持当前 codec 时，自动回退到 `ws-annexb` + WebCodecs。

## Electron

目录：`apps/electron`

```bash
npm run build:sdk
./scripts/build.sh
cd apps/electron
npm install
npm run start
```

Electron 主进程会：

- 查找 `dist/rtsp-web-native-<os>-<arch>`。
- 以 `--gateway` 启动 Go sidecar。
- 通过 IPC 暴露 `startStream`、`createWebRTCOffer`、`health`。
- renderer 只拿一次性 stream token 或 WebRTC answer。

打包：

```bash
cd apps/electron
npm run make
```

macOS 可通过 `RTSP_MAC_SIGN=1`、`APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID` 接入 Electron Forge 的签名和公证。

## Tauri

目录：`apps/tauri`

```bash
npm run build:sdk
./scripts/build.sh
npm run build:desktop
cd apps/tauri
npm install
npm run dev
```

Tauri v2 使用 `bundle.externalBin` 打包 sidecar。`npm run build:desktop` 会把 `dist/` 里的 Go 二进制复制成 Tauri 需要的 target triple 命名。

Tauri command：

- `gateway_health`
- `start_stream`
- `create_webrtc_offer`
- `stop_stream`

## 平台差异

- Electron 跟随内置 Chromium，WebRTC/H.265 能力取决于 Electron 对应 Chromium 版本、系统 codec 和硬件。
- Tauri 跟随系统 WebView：Windows 是 WebView2，macOS 是 WKWebView，Linux 是 WebKitGTK。
- H.265 不做转码；如果 WebRTC/H.265 不可用，请把摄像头切到 H.264 或使用 `codec="h264"`。

## 组件用法

```html
<rtsp-player
  runtime="desktop"
  transport="auto"
  codec="auto"
  url="rtsp://user:pass@camera/stream"
  autoplay
  controls>
</rtsp-player>
```

React/Vue 同步支持 `runtime`、`transport`、`rtspTransport`、`mediaTransport`、`codec`。
