# Universal Components SDK

The SDK path is for app teams that want explicit framework-level integration
instead of relying on the extension content script. In web pages it uses the
Chrome Runtime extension and Go native runtime. In Electron/Tauri it can switch
to `runtime="desktop"` and talk to the bundled Go sidecar directly.

Package path:

```txt
packages/rtsp-sdk
```

Prebuilt browser file:

```txt
web-sdk/rtsp-player-sdk.js
```

## Plain HTML

```html
<script
  src="/rtsp-player-sdk.js"
  data-extension-id="YOUR_CHROME_EXTENSION_ID"></script>

<rtsp-player
  url="rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101"
  width="960"
  height="540"
  autoplay
  controls></rtsp-player>
```

## JavaScript Module

```js
import {
  configureRTSP,
  createRTSPPlayer,
  defineRTSPPlayer,
} from "@rtsp/player";

configureRTSP({ extensionId: "YOUR_CHROME_EXTENSION_ID" });
defineRTSPPlayer();

const player = createRTSPPlayer({
  url: "rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101",
  width: "100%",
  height: 540,
  autoplay: true,
  controls: true,
  transport: "auto",
  codec: "auto",
});

player.addEventListener("ready", () => console.log("ready"));
player.addEventListener("error", (event) => console.error(event.detail.error));

document.querySelector("#camera").append(player);
```

## React

```jsx
import { RtspPlayer } from "@rtsp/player/react";

export function CameraCard() {
  return (
    <RtspPlayer
      extensionId="YOUR_CHROME_EXTENSION_ID"
      url="rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101"
      width="100%"
      height={540}
      autoplay
      controls
      transport="auto"
      codec="auto"
      onReady={() => console.log("ready")}
      onError={(event) => console.error(event.detail.error)}
    />
  );
}
```

## Vue

```vue
<script setup>
import { RtspPlayer } from "@rtsp/player/vue";
</script>

<template>
  <RtspPlayer
    extension-id="YOUR_CHROME_EXTENSION_ID"
    url="rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101"
    width="100%"
    :height="540"
    autoplay
    controls
    transport="auto"
    codec="auto"
    @ready="() => console.log('ready')"
    @error="(event) => console.error(event.detail.error)"
  />
</template>
```

## Package Exports

```txt
@rtsp/player          Web Component helpers
@rtsp/player/web      Same as root export
@rtsp/player/react    React component
@rtsp/player/vue      Vue 3 component
@rtsp/player/global   Prebuilt global script
```

## Runtime Requirements

Web page:

1. Chrome Runtime extension is installed.
2. Native Messaging host is registered for that extension ID.
3. The page origin is allowed in the extension popup.

Desktop app:

1. Electron/Tauri exposes `window.rtspNative` or `window.__RTSP_DESKTOP__`.
2. The Go sidecar binary is bundled with the app.
3. The app uses `runtime="desktop"` or `runtime="auto"`.

RTSP source should support TCP interleaved transport. H.264 is the safest baseline; H.265 is supported through WebRTC/WebCodecs when the platform advertises the codec.

## Events

| Event | Meaning |
| --- | --- |
| `starting` | Extension iframe is starting the native stream. |
| `ready` | WebRTC track or WebCodecs decoder is ready. |
| `recovering` | Playback hit a recoverable failure and is restarting automatically. |
| `recovered` | Playback rendered frames again after automatic recovery. |
| `error` | Native, RTSP, WebRTC, WebSocket, or decoder error. |

The `detail` field contains the message from the extension iframe.
