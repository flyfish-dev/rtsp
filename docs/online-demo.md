# 在线 Demo

在线体验入口：

```txt
https://rtsp.flyfish.dev/#demo
```

## 两种体验模式

页面会自动检测本机是否已经安装 RTSP Chrome 扩展、Native Runtime，以及当前站点是否已在扩展 popup 中授权。如果检测不完整，会自动弹出安装助手并推荐当前系统的安装包。
真实 RTSP 播放默认 WebRTC first；如果浏览器、系统或 codec 不满足条件，会自动回退 WebSocket + WebCodecs。

### 1. 无安装预览

页面左侧的 Canvas 预览不连接摄像头，用于快速体验播放器布局、状态统计、暂停/继续和低延迟监控画面效果。它可以直接在任意现代浏览器中打开。

### 2. 真实 RTSP 播放

页面右侧的真实体验台会动态挂载扩展播放器 iframe。使用前需要完成：

1. 加载 `release/chrome-extension/unpacked` Chrome 扩展。
2. 注册对应系统的 Native Host。
3. 在扩展 popup 中授权当前站点 origin：

```txt
https://rtsp.flyfish.dev
```

4. 在体验台中填写 RTSP URL。扩展 ID 默认固定为 `giegomfhcmgebjhdiihnjohoinkbcjbh`。
5. 点击“启动真实播放”。

更顺滑的方式是直接使用安装包：

- `release/installers/rtsp-macos-installer.dmg`
- `release/installers/rtsp-macos-installer.zip`
- `release/installers/rtsp-windows-installer.zip`
- `release/installers/rtsp-linux-installer.tar.gz`

安装包都提供图形入口，并会根据系统语言显示中文或英文。安装器会准备 runtime、复制扩展目录、按固定扩展 ID 注册 Native Host，并打开 Chrome 扩展页。

## 可用公开测试流

如果只是验证链路，可以使用之前端到端验证过的公开 H.264 RTSP 源：

```txt
rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1
```

公开源可能受服务方限流、地区网络或临时下线影响。生产验收建议使用自己的摄像头或 NVR，并保留 H.264 子码流作为 WebRTC/H.265 失败时的回退。

## 常见问题

### 页面提示仍在等待扩展响应

通常是下面几类原因：

- 扩展 ID 被旧版本覆盖；新安装器的固定 ID 是 `giegomfhcmgebjhdiihnjohoinkbcjbh`。
- 扩展没有加载或被 Chrome 禁用。
- popup 中没有授权 `https://rtsp.flyfish.dev`。
- Native Messaging Host 没有注册成功。
- 如果使用过旧安装包，建议下载当前图形安装器重新安装。

### iframe 出现但没有画面

检查 RTSP URL、用户名密码、网络连通性和摄像头编码。推荐先用 H.264 + RTSP over TCP 验证，再切 H.265/WebRTC。

### 想放到自己的文档站

复制主页中的 `#demo` section、`site/src/main.js` 里的 demo 逻辑和 `site/src/styles.css` 中的 demo 样式即可。真实播放部分仍需要 Chrome 扩展与 Native Runtime。
