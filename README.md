# RTSP

RTSP 是一个完整的 RTSP 播放方案：Chrome 扩展、通用 Web/React/Vue 组件、Electron/Tauri 桌面免插件应用共用同一个 Go 原生网关。

项目同时交付三种接入方式：

1. **Chrome 扩展方案**：扩展 content script 自动挂载 `<rtsp-player>`，适合统一管控的业务页面。
2. **通用组件方案**：`@rtsp/player` 提供 plain JS/Web Component、React、Vue 入口，并内置预构建 SDK，适合业务应用显式接入。
3. **桌面免插件方案**：Electron/Tauri 打包 Go sidecar，应用内直接原生播放 RTSP，无需安装 Chrome 扩展。

目标体验：安装扩展和本地 Go Runtime 后，业务网页只需要写：

```html
<rtsp-player
  url="rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101"
  width="640"
  height="360"
  autoplay
  controls>
</rtsp-player>
```

不使用 FFmpeg。Native 端实现：

- Chrome Native Messaging Host 协议
- 本地 HTTP API
- 本地 WebSocket server
- RTSP over TCP interleaved
- Basic/Digest RTSP authentication
- SDP H.264 track selection
- RTP/H.264 depayload：Single NALU、STAP-A、STAP-B、MTAP16/24、FU-A、FU-B、Annex-B-in-RTP 兼容
- RTP/H.265 depayload：Single NALU、AP、FU
- H.264/H.265 SDP track selection
- H.264/H.265 Annex-B access unit 输出
- Pion WebRTC RTP passthrough + Annex-B-in-RTP repacketize
- 多路并发 stream lifecycle：per-stream `streamId`、pending/active 状态、主动 stop 清理
- 播放中断自恢复：解码器软重建、WebRTC/WS 停滞检测、指数退避整路重启

浏览器端默认优先 WebRTC，兼容 H.264/H.265；WebRTC 协商失败或 15 秒内没有可渲染视频帧时，自动回退 WebSocket + WebCodecs `VideoDecoder` 硬件优先解码。遇到摄像头把 Annex-B H.264 起始码直接塞进 RTP payload 的非标准流时，WebSocket 路径会容错拆包，WebRTC 路径会重新封装成浏览器可接收的 RTP。

> H.265/HEVC 能力依赖浏览器、Electron Chromium、Tauri 系统 WebView、操作系统 codec 和硬件。生产建议保留 H.264 子码流作为回退。

## 目录

```txt
native/       Go Native Host + Gateway + RTSP/WebRTC implementation
extension/    Chrome MV3 extension, player iframe, content-script component
web-sdk/      Optional standalone SDK custom element
packages/     Universal SDK package: JS/Web Component, React, Vue
apps/         Electron and Tauri desktop apps
scripts/      Build and Native Messaging Host install scripts
site/         Vercel homepage and documentation site
```

## 三种方案

### 方案一：Chrome 扩展 Runtime

适合企业内网、NVR 管理台、SaaS 业务页面。页面只写原生标签，扩展自动注入播放器 iframe。

```html
<rtsp-player
  url="rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101"
  width="960"
  height="540"
  autoplay
  controls></rtsp-player>
```

### 方案二：通用组件 SDK

适合业务前端工程显式依赖 SDK。构建产物在 `packages/rtsp-sdk/dist/`，免构建脚本同步输出到 `web-sdk/rtsp-player-sdk.js`。

Plain HTML:

```html
<script
  src="/rtsp-player-sdk.js"
  data-extension-id="你的扩展ID"></script>

<rtsp-player url="rtsp://user:pass@camera/stream" autoplay controls></rtsp-player>
```

React:

```jsx
import { RtspPlayer } from "@rtsp/player/react";

<RtspPlayer
  extensionId="你的扩展ID"
  url="rtsp://user:pass@camera/stream"
  autoplay
  controls
/>;
```

Vue:

```vue
<script setup>
import { RtspPlayer } from "@rtsp/player/vue";
</script>

<template>
  <RtspPlayer
    extension-id="你的扩展ID"
    url="rtsp://user:pass@camera/stream"
    autoplay
    controls
  />
</template>
```

### 方案三：Electron / Tauri 免插件桌面应用

适合桌面监控台、内网工具、离线部署。应用内启动 Go sidecar，播放器走 `runtime="desktop"`。

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

`transport="auto"` 默认 WebRTC first，失败后回退 `ws-annexb`。

更多文档见 `docs/`：

- `docs/overview.md`
- `docs/chrome-extension.md`
- `docs/web-component-gateway.md`
- `docs/universal-components.md`
- `docs/desktop-native.md`
- `docs/multi-stream-lifecycle.md`
- `docs/webrtc-hevc.md`
- `docs/xiaomi-rtsp.md`
- `docs/online-demo.md`
- `docs/installers.md`
- `docs/sdk-api.md`
- `docs/security.md`
- `docs/deployment.md`
- `docs/validation.md`
- `docs/troubleshooting.md`

## 全链路

```txt
业务网页 <rtsp-player url="rtsp://...">
  ↓ content script 挂载组件 / 或 web-sdk 创建 iframe
Chrome extension player iframe
  ↓ chrome.runtime.sendMessage
Extension service worker
  ↓ chrome.runtime.sendNativeMessage("com.rtspweb.player")
Go Native Host 短进程
  ↓ 确保本地 Gateway daemon 已启动
Go Gateway 127.0.0.1:<random>
  ↓ RTSP over TCP interleaved
Camera / NVR
  ↓ RTP/H264 depay → Annex-B access unit
Gateway WebRTC / WebSocket fallback
  ↓ RTP passthrough / RTP repacketize / binary access unit
Player iframe / desktop webview
  ↓ WebRTC hardware decode or WebCodecs prefer-hardware
Canvas
```

## 一键安装包

推荐终端用户直接使用发布包：

```txt
https://rtsp.flyfish.dev/downloads/rtsp-macos-installer.dmg
https://rtsp.flyfish.dev/downloads/rtsp-macos-installer.zip
https://rtsp.flyfish.dev/downloads/rtsp-windows-installer.zip
https://rtsp.flyfish.dev/downloads/rtsp-linux-installer.tar.gz
release/installers/rtsp-macos-installer.dmg
release/installers/rtsp-macos-installer.zip
release/installers/rtsp-windows-installer.zip
release/installers/rtsp-linux-installer.tar.gz
```

三端安装包都提供图形入口：

- macOS：打开 DMG 后运行 `RTSP Installer.app`。
- Windows：解压后运行 `RTSP Installer.hta`。
- Linux：解压后运行 `RTSP Installer.desktop`，或运行 `install-gui.sh`。

图形安装器会根据系统语言显示中文或英文，准备本地 Runtime、复制 Chrome 扩展目录、注册 Native Messaging Host，并打开 Chrome 扩展页。脚本入口保留为备用。

发布包由维护者统一构建，普通用户只需要下载并运行当前系统的安装器。

固定 Chrome 扩展 ID：

```txt
giegomfhcmgebjhdiihnjohoinkbcjbh
```

Chrome 仍然要求用户在 `chrome://extensions` 中手动点击 **Load unpacked**。安装器会打开对应页面，并把 extension 目录复制到剪贴板或显示在完成提示中。

## 开发安装

### 1. 构建 Go Native Runtime

Linux/macOS:

```bash
./scripts/build.sh
```

Windows PowerShell:

```powershell
./scripts/build.ps1
```

输出在 `dist/`。

### 桌面应用开发

Electron:

```bash
npm run build:sdk
./scripts/build.sh
cd apps/electron
npm install
npm run start
```

Tauri:

```bash
npm run build:sdk
./scripts/build.sh
npm run build:desktop
cd apps/tauri
npm install
npm run dev
```

### 2. 加载 Chrome 扩展

打开：

```txt
chrome://extensions
```

开启 Developer mode，点击 **Load unpacked**，选择本仓库的 `extension/` 目录。

扩展 ID 已通过 manifest key 固定为：

```txt
giegomfhcmgebjhdiihnjohoinkbcjbh
```

### 3. 注册 Native Messaging Host

macOS:

```bash
./scripts/install-host.sh giegomfhcmgebjhdiihnjohoinkbcjbh ./dist/rtsp-web-native-darwin-arm64
```

Linux:

```bash
./scripts/install-host.sh giegomfhcmgebjhdiihnjohoinkbcjbh ./dist/rtsp-web-native-linux-amd64
```

Windows PowerShell:

```powershell
./scripts/install-host.ps1 -ExtensionId giegomfhcmgebjhdiihnjohoinkbcjbh -BinaryPath .\dist\rtsp-web-native-windows-amd64.exe
```

### 4. 检测

点击 Chrome 扩展图标，看到：

```txt
Native Runtime 正常，Gateway 端口：xxxxx
```

如果客户现场 VLC 正常但网页无法播放，打开同一个弹窗里的 **日志与诊断**：

- **刷新日志**：读取扩展日志、Native Gateway 日志、PID、端口和版本。
- **复制日志**：生成可直接发给技术支持的诊断文本。
- **重启 Native**：清理当前记录的旧 Gateway 进程并拉起已安装的新版本。

日志会记录 RTSP OPTIONS / DESCRIBE / SETUP / PLAY、WebRTC 协商、WebSocket 回退和浏览器解码错误，并自动遮蔽 RTSP 账号密码。

如果 VLC/FFmpeg 能播放但浏览器无画面，重点看日志里的 `h264 annexb-in-rtp`、`h264 fu-a annexb-fragment`、`h264 runtime parameter sync`、`webrtc repacketize soft-starting h264 after parameters`、`h264 sps oversized dropped`、`h264 sps salvaged inline nalus`、`webrtc answer profile-level-id upgraded`、`webrtc rtcp browser PLI/FIR forwarded`。从 `0.1.14` 开始，Native 会兼容 Annex-B-in-RTP 这类非标准 H.264 RTP；`0.1.15` 继续补齐运行中才出现 PPS、长期等不到标准 IDR 标识的摄像头流，WebSocket/WebCodecs 路径会同步参数集并尽快出首帧，WebRTC 路径会在不转码的前提下软启动和重新封装 RTP；`0.1.16` 会丢弃部分国产摄像头在 SPS NAL 中夹带的厂商私有元数据（一般 >80KB），避免每个关键帧被放大数十倍而导致周期性卡顿、帧回退以及 WebRTC 解码失败；`0.1.17` 重做了 native host 的启动互斥锁——加快路径、记录持有者 PID、修复 Windows 上的进程存活探测——消除频繁出现的 `gateway startup lock timeout`；`0.1.18` 在丢弃超大 vendor SPS 的同时，从其内部 Annex-B 数据中抢救出真实的 SPS/PPS/IDR——某些 RTSP 透传链路（如 natapp）会把真关键帧夹在 vendor SPS 的 FU-A 分片中间，0.1.17 一并丢掉造成完全无画面，0.1.18 恢复正常播放；`0.1.19` 让 WebRTC 真正能播 baseline 4.x 等高 level 码流：SDP answer 中的 H.264 `profile-level-id` 升级为 `42c033`（baseline level 5.1）让 Chrome 解码器按高 level 配置接受 4.x SPS，浏览器侧的 RTCP PLI/FIR 反馈会被 `drainRTCP` 解析并通过新的 `Client.RequestKeyframe()` 转发为 RTSP RTCP keyframe 请求形成完整的端到端反馈回路，关键帧前的 SPS/PPS/SEI 用单个 STAP-A 聚合下发让首帧更快、对包丢失更鲁棒，WebRTC 首帧超时从 5 秒延长到 8 秒。

### 5. 授权业务页面 origin

扩展弹窗里添加页面来源，例如：

```txt
http://localhost:5173
https://your-app.example.com
```

也可以只在内网调试时使用 `*`，正式环境不要这样做。

### 6. 网页使用组件

如果扩展 content script 已覆盖你的站点，直接写：

```html
<rtsp-player
  url="rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101"
  width="960"
  height="540"
  autoplay
  controls>
</rtsp-player>
```

可监听事件：

```js
const p = document.querySelector('rtsp-player');
p.addEventListener('ready', () => console.log('ready'));
p.addEventListener('error', (e) => console.error(e.detail.error));
```

如果你不想依赖 content script，也可以使用 `web-sdk/rtsp-player-sdk.js`：

```html
<script
  type="module"
  src="/rtsp-player-sdk.js"
  data-extension-id="你的扩展ID"></script>

<rtsp-player url="rtsp://..."></rtsp-player>
```

## 生产化建议

1. 把 `extension/manifest.json` 的 content script matches 限定为你的业务域名，避免所有网页都能创建 RTSP 组件。
2. 当前 unpacked 扩展已固定 ID；后续发布到 Chrome Web Store 后建议把安装助手切到 Web Store 页面。
3. 用安装器一次性安装：Chrome 扩展目录、本地 Go 二进制、Native Messaging manifest。
4. 本地 Gateway 已经只监听 `127.0.0.1`，并使用 Native Host secret + 单次 stream token。
5. RTSP URL 不放在 iframe query string，避免账号密码泄漏到日志、历史记录或 Referer。
6. 摄像头建议同时准备 H.264 子码流和 H.265/H.264 主码流；默认 WebRTC first，必要时切 H.264 回退。

## 协议说明

Gateway → Browser WebSocket：

1. 文本帧：

```json
{"type":"config","codec":"avc1.64001F","format":"annexb","mediaTransport":"ws-annexb"}
```

2. 二进制帧：

```txt
byte 0      message type = 1
byte 1      key frame flag: 1 key, 0 delta
byte 2..3   reserved
byte 4..11  uint64 little-endian timestamp_us
byte 12..15 uint32 little-endian payload length
byte 16..   H.264 Annex-B access unit
```

WebCodecs H.264/H.265 使用 Annex-B 模式，因此 `VideoDecoderConfig.description` 不设置。WebRTC 路径优先直接转发摄像头 RTP；遇到 Annex-B-in-RTP 或非标准 FU-A/FU-B 外壳时，会在 Native 内重新封装为浏览器可接收的 H.264 RTP，不做编码转码。

## 限制

- 当前只实现 RTSP over TCP interleaved；这是摄像头/NVR 最稳定的浏览器转流路径。
- 当前只传视频，不传音频。
- 不做转码和软件解码；浏览器不支持当前 H.264/H.265 profile/level 时，需要调整摄像头编码参数。
- WebRTC/H.265 取决于浏览器、系统 WebView、操作系统和硬件能力。
- 真实播放流畅度仍取决于摄像头 GOP、码率、网络、WebRTC/WebCodecs 支持和硬件解码能力。

## 联系与支持

如需定制集成、企业部署或问题反馈，可以通过下方方式联系。觉得项目有帮助，也欢迎支持维护。

| 客服联系 | 微信打赏 | 支付宝打赏 | 公众号 |
| --- | --- | --- | --- |
| ![客服联系](https://rtsp.flyfish.dev/images/contact.jpg) | ![微信打赏](https://rtsp.flyfish.dev/images/donate-wx.jpg) | ![支付宝打赏](https://rtsp.flyfish.dev/images/donate-alipay.jpg) | ![公众号](https://rtsp.flyfish.dev/images/mp.png) |
