# 多路播放与生命周期

支持多路同时播放。每一个 `<rtsp-player>` 实例都会拥有独立的 `streamId`、媒体连接、解码器和清理流程，生命周期如下：

```txt
created -> connecting -> playing -> stopping -> stopped
                         -> error
```

## 多路模型

每次播放请求都会在本地 Go gateway 中创建一个唯一 `streamId`：

- Chrome 扩展模式：每个 iframe 播放器都有自己的 `streamId`、WebRTC PeerConnection 或 WebSocket、解码器、Canvas 和 RTSP client。
- Electron / Tauri 桌面模式：使用同一套 gateway API，也会拿到独立 `streamId`。
- Gateway 状态拆成 `pendingStreams` 和 `activeStreams`，单路失败、停止或重试不会影响其他正在播放的路。

实际上限取决于摄像头码率、CPU/GPU 解码能力、浏览器标签页调度和网络带宽。生产看板建议使用摄像头的 H.264/H.265 硬解友好档位，并按画面 tile 的实际尺寸选择主码流或子码流。

## 生命周期保证

runtime 会对每路流做显式清理：

- `startStream` 创建 pending session，并生成一次性 `streamToken`。
- WebSocket 播放会在媒体 socket 连接时 claim 这条 session。
- WebRTC 播放会在 offer 创建时 claim 这条 session。
- `stopStream` 会取消对应 RTSP 拉流，关闭 WebRTC / WebSocket 媒体路径，并删除 gateway 状态。
- 浏览器侧 `stop()` 会关闭 decoder、PeerConnection、media element、WebSocket，然后通知 Native 停止这一路流。
- 播放器断开、WebRTC 协商失败、WebSocket 关闭都会移除 active stream 记录。
- 扩展 popup 和 Native diagnostics 会同时展示 `pendingStreams` 与 `activeStreams`。

## 推荐用法

```html
<rtsp-player id="cam-a" url="rtsp://camera-a/stream" autoplay></rtsp-player>
<rtsp-player id="cam-b" url="rtsp://camera-b/stream" autoplay></rtsp-player>
```

```js
const a = document.querySelector("#cam-a");
const b = document.querySelector("#cam-b");

await a.play();
await b.play();

// 停止一路，不影响另一路。
a.stop();
```

## 验证结论

当前版本已用本机 H.264/AAC 720p RTSP 源完成 4 路并发实测：

```txt
activeStreams = 4
每路均收到 H.264 Annex-B 二进制帧
逐路 stopStream 后 pendingStreams = 0, activeStreams = 0
```

## 运行建议

- 每个摄像头 tile 使用一个组件实例。
- 切换某个 tile 的摄像头时复用同一个元素；设置新 `url` 并调用 `play()` 会先停止旧流。
- 不要创建隐藏的 autoplay 大屏。浏览器调度、GPU 和摄像头连接数都不是无限资源。
- 排障时先看扩展 popup 的日志和 diagnostics：停止后 `pendingStreams` 应回到 `0`，`activeStreams` 应等于当前正在播放的 tile 数。
