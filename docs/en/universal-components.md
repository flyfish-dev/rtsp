# Universal Components

The SDK provides Web Component, React, Vue, and script-tag APIs.

Important boundary: **a normal browser page cannot play RTSP without installing a runtime**. Browsers cannot open RTSP sockets or start local executables. Without the Chrome extension, use Electron/Tauri or another trusted host that exposes a Gateway bridge.

## Plain HTML

```html
<script
  src="/rtsp-player-sdk.js"
  data-extension-id="YOUR_CHROME_EXTENSION_ID"></script>

<rtsp-player
  url="rtsp://user:pass@camera/stream"
  transport="auto"
  codec="auto"
  autoplay
  controls>
</rtsp-player>
```

## JavaScript

```js
import { configureRTSP, createRTSPPlayer, defineRTSPPlayer } from "@rtsp/player";

configureRTSP({ extensionId: "YOUR_CHROME_EXTENSION_ID" });
defineRTSPPlayer();

const player = createRTSPPlayer({
  url: "rtsp://camera/stream",
  autoplay: true,
  controls: true,
  transport: "auto",
  codec: "auto",
});

player.addEventListener("ready", () => console.log("ready"));
player.addEventListener("recovering", (event) => console.log(event.detail));
player.addEventListener("recovered", () => console.log("recovered"));
player.addEventListener("error", (event) => console.error(event.detail.error));
```

## React

```jsx
import { RtspPlayer } from "@rtsp/player/react";

<RtspPlayer
  extensionId="YOUR_CHROME_EXTENSION_ID"
  url="rtsp://camera/stream"
  transport="auto"
  codec="auto"
  autoplay
  controls
/>;
```

## Vue

```vue
<RtspPlayer
  extension-id="YOUR_CHROME_EXTENSION_ID"
  url="rtsp://camera/stream"
  transport="auto"
  codec="auto"
  autoplay
  controls
/>
```

## Extension-free Usage

Use desktop mode:

```html
<rtsp-player runtime="desktop" url="rtsp://camera/stream" autoplay controls></rtsp-player>
```

The host must expose `window.rtspNative` or `window.__RTSP_DESKTOP__` with `startStream`, `stopStream`, and optionally `createWebRTCOffer`.

See [Gateway for Web Components](web-component-gateway.md).
