# 通用组件方案

通用组件适合前端团队显式接入，不依赖 content script 自动扫描。SDK 提供 Web Component、React、Vue 和免构建脚本。

重要边界：**普通浏览器网页不安装 Chrome 扩展时，不能直接播放 RTSP。** 浏览器无法直接打开 RTSP socket，也不能自行启动本地 Gateway。免扩展接入需要 Electron/Tauri 这类桌面容器，或由宿主页面提供 `window.rtspNative` / `window.__RTSP_DESKTOP__` Gateway bridge。

## 安装

```bash
npm install @flyfish-dev/rtsp-player
```

## Plain HTML

```html
<script
  src="/rtsp-player-sdk.js"
  data-extension-id="YOUR_CHROME_EXTENSION_ID"></script>

<rtsp-player
  url="rtsp://user:pass@camera/stream"
  width="960"
  height="540"
  transport="auto"
  codec="auto"
  autoplay
  controls>
</rtsp-player>
```

## JavaScript Module

```js
import {
  configureRTSP,
  createRTSPPlayer,
  defineRTSPPlayer,
} from "@flyfish-dev/rtsp-player";

configureRTSP({ extensionId: "YOUR_CHROME_EXTENSION_ID" });
defineRTSPPlayer();

const player = createRTSPPlayer({
  url: "rtsp://user:pass@camera/stream",
  width: "100%",
  height: 540,
  autoplay: true,
  controls: true,
  transport: "auto",
  codec: "auto",
});

player.addEventListener("ready", () => console.log("ready"));
player.addEventListener("recovering", (event) => console.log(event.detail));
player.addEventListener("recovered", () => console.log("recovered"));
player.addEventListener("error", (event) => console.error(event.detail.error));

document.querySelector("#camera").append(player);
```

## React

```jsx
import { RtspPlayer } from "@flyfish-dev/rtsp-player/react";

export function CameraCard() {
  return (
    <RtspPlayer
      extensionId="YOUR_CHROME_EXTENSION_ID"
      url="rtsp://user:pass@camera/stream"
      width="100%"
      height={540}
      autoplay
      controls
      transport="auto"
      codec="auto"
    />
  );
}
```

## Vue

```vue
<script setup>
import { RtspPlayer } from "@flyfish-dev/rtsp-player/vue";
</script>

<template>
  <RtspPlayer
    extension-id="YOUR_CHROME_EXTENSION_ID"
    url="rtsp://user:pass@camera/stream"
    width="100%"
    :height="540"
    autoplay
    controls
    transport="auto"
    codec="auto"
  />
</template>
```

## 免扩展接入

如果客户明确不安装 Chrome 扩展，请使用桌面 Gateway 模式：

```html
<rtsp-player
  runtime="desktop"
  transport="auto"
  codec="auto"
  url="rtsp://camera/stream"
  autoplay
  controls>
</rtsp-player>
```

前提条件：

1. 已安装或打包 Go Gateway。
2. 页面宿主暴露 `window.rtspNative` 或 `window.__RTSP_DESKTOP__`。
3. bridge 至少实现 `startStream`、`stopStream`，WebRTC 模式还需要 `createWebRTCOffer`。

普通公网网页无法只靠 `<script>` 启动本地 Gateway。客户需要安装 Chrome Runtime，或者使用 Electron/Tauri 桌面应用。详细步骤见 [Web 组件免扩展 Gateway 指引](web-component-gateway.md)。

## 事件

| 事件 | 含义 |
| --- | --- |
| `starting` | 开始启动本地 runtime 或创建播放会话 |
| `ready` | WebRTC track 或 WebCodecs decoder 已就绪 |
| `recovering` | 播放发生可恢复错误，正在自动重启 |
| `recovered` | 自动恢复后重新渲染视频帧 |
| `error` | Native、RTSP、WebRTC、WebSocket 或解码最终失败 |

## 运行要求

浏览器网页：

1. 安装 Chrome Runtime 扩展。
2. 注册 Native Messaging Host。
3. 在扩展 popup 中授权页面 origin。

桌面应用：

1. Electron/Tauri 打包 Go sidecar。
2. 主进程启动 Gateway。
3. 渲染层暴露桌面 bridge。

RTSP 源建议支持 TCP interleaved。H.264 是最稳基线；H.265 依赖 WebRTC/WebCodecs 和系统 codec 能力。
