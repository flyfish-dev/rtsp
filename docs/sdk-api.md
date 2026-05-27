# SDK API

## `configureRTSP(options)`

设置 SDK 全局默认值。

```js
configureRTSP({
  extensionId: "YOUR_CHROME_EXTENSION_ID",
  tagName: "rtsp-player",
  runtime: "extension",
});
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `extensionId` | `string` | 暴露 `player/player.html` 的 Chrome 扩展 ID |
| `tagName` | `string` | 自定义元素标签名，默认 `rtsp-player` |
| `runtime` | `extension` / `desktop` / `auto` | 运行时。桌面模式需要 `window.rtspNative` 或 `window.__RTSP_DESKTOP__` |

## `defineRTSPPlayer(tagName?, options?)`

注册 Web Component。可以重复调用；如果标签已注册，会返回已有构造器。

```js
defineRTSPPlayer();
```

## `createRTSPPlayer(options)`

创建并配置播放器元素。

```js
const player = createRTSPPlayer({
  extensionId: "YOUR_CHROME_EXTENSION_ID",
  url: "rtsp://camera/stream",
  width: 960,
  height: 540,
  autoplay: true,
  controls: true,
  transport: "auto",
  codec: "auto",
});
```

## `updateRTSPPlayer(element, options)`

更新已有播放器属性。

```js
updateRTSPPlayer(player, {
  url: "rtsp://camera/stream2",
  autoplay: true,
});
```

## 元素属性

| 属性 | 说明 |
| --- | --- |
| `url` | RTSP 地址 |
| `src` | `url` 的别名 |
| `width` | CSS 宽度或数字 px |
| `height` | CSS 高度或数字 px |
| `autoplay` | 初始化后自动播放 |
| `controls` | 保留播放器控制能力 |
| `muted` | 预留给未来音频 |
| `runtime` | `extension`、`desktop` 或 `auto` |
| `transport` | 媒体传输，默认 `auto`，表示 WebRTC 优先、WebSocket 回退 |
| `media-transport` | 显式媒体传输：`auto`、`webrtc`、`ws-annexb` |
| `rtsp-transport` | RTSP 传输；当前原生实现支持 `tcp` |
| `codec` | `auto`、`h264` 或 `h265` |
| `extension-id` | 单个元素覆盖扩展 ID |

## `probeRTSPCapabilities(codec?)`

探测当前运行时的视频能力。

```js
const caps = await probeRTSPCapabilities("h265");
console.log(caps.h265WebRTC, caps.h265WebCodecs);
```

## 元素方法

```js
player.play("rtsp://camera/stream");
player.stop();
```

`stop()` 会关闭当前媒体路径，并通知本地 Gateway 停止对应 `streamId`。播放中发生可恢复错误时，组件会发出 `recovering`，恢复成功后发出 `recovered`；超过重试预算才发出最终 `error`。

## 全局脚本 API

使用 `rtsp-player.global.js` 时，SDK 会暴露 `window.RTSP`：

```js
window.RTSP.configure({ extensionId: "YOUR_CHROME_EXTENSION_ID" });
window.RTSP.definePlayer();

const player = window.RTSP.createPlayer({
  url: "rtsp://camera/stream",
  autoplay: true,
});
```
