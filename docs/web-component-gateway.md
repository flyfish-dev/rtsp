# Web 组件免扩展 Gateway 指引

这篇文档面向“不想让客户安装 Chrome 扩展，只想用 Web 组件接入”的场景。

结论先说清楚：

- **普通浏览器网页不能只靠 Web 组件直接播放 RTSP。**
- 如果不安装 Chrome 扩展，必须让宿主应用安装并启动本地 Gateway，并向页面暴露安全 bridge。
- 最推荐的免扩展方案是 Electron 或 Tauri 桌面应用。

## 为什么不能纯网页直连

浏览器有安全沙箱：

- 不能直接打开 `rtsp://`。
- 不能创建任意 RTSP TCP socket。
- 不能自行启动本地可执行文件。
- 不能读取本地 Gateway 的 secret。

因此，普通网页要播放 RTSP 必须有一个受信任的本地运行时。Chrome 方案用扩展 + Native Messaging；免扩展方案用桌面宿主进程。

## 客户安装路径

### 路径 A：桌面应用免扩展

适合希望客户“安装一个应用后直接播放”的产品。

1. 使用 Electron 或 Tauri 打包应用。
2. 将 `rtsp-web-native` 作为 sidecar 放入安装包。
3. 应用启动时启动 Go Gateway。
4. 渲染层挂载 `<rtsp-player runtime="desktop">`。
5. 通过 `window.rtspNative` 或 `window.__RTSP_DESKTOP__` 暴露 Gateway bridge。

组件写法：

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

详见 [Electron / Tauri 免插件桌面方案](desktop-native.md)。

### 路径 B：浏览器网页 + Chrome Runtime

适合客户必须在 Chrome 中打开业务网页的场景。

1. 下载图形安装器。
2. 安装 Native Runtime。
3. 加载固定 ID 的 Chrome 扩展。
4. 在扩展 popup 中授权业务页面 origin。
5. 页面使用 Web Component、React 或 Vue 组件。

这是浏览器中最清晰、最安全的方案。详见 [一键安装器](installers.md)。

## Gateway bridge 需要实现什么

免扩展桌面模式下，SDK 会调用以下方法：

```ts
window.rtspNative = {
  startStream(input): Promise<{
    ok: boolean;
    streamId: string;
    streamToken?: string;
    wsUrl?: string;
    webRTCUrl?: string;
    codec?: string;
    error?: string;
  }>,

  stopStream(input): Promise<{ ok: boolean; stopped?: boolean }>,

  createWebRTCOffer?(input): Promise<{
    ok: boolean;
    streamId?: string;
    answer?: string;
    codec?: string;
    fallback?: string;
    error?: string;
  }>
};
```

最小可用版本只需要 `startStream` 和 `stopStream`，播放会走 WebSocket + WebCodecs。需要 WebRTC/H.265 优先链路时，再实现 `createWebRTCOffer`。

## Gateway 安装检查

安装后应确认：

```txt
rtsp-web-native --version
```

输出版本应与当前 SDK/安装包一致。

如果是桌面 sidecar，由应用主进程负责健康检查：

```txt
GET http://127.0.0.1:<port>/health
```

如果是 Chrome Runtime，由扩展 popup 检测 Native Runtime、Gateway 端口和当前页面授权状态。

## 给客户的推荐话术

如果客户问“为什么网页组件还要装东西”，可以这样解释：

> 浏览器本身不支持 RTSP，也不能直接启动本地程序。RTSP Gateway 是本机视频运行时，负责连接摄像头并把视频转成浏览器能播放的 WebRTC/WebSocket。若不安装 Chrome 扩展，请使用桌面安装包；桌面应用会内置并自动启动 Gateway。

## 常见错误

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 页面提示缺少 Gateway bridge | 使用了 `runtime="desktop"`，但没有 `window.rtspNative` | 检查 Electron preload 或 Tauri command |
| 只安装了 Gateway 但普通网页仍不能播放 | 网页无法读取 Gateway secret，也无法启动本地程序 | 使用 Chrome Runtime 或桌面应用 |
| VLC 能播但组件不能播 | 编码、GOP、鉴权或 RTSP TCP 兼容问题 | 先切 H.264 子码流，查看 Gateway 日志 |
| 播放一会儿黑屏 | 源端断流或解码错误 | 当前版本会自动恢复；若反复失败，检查码流和网络 |
