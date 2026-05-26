# SDK API

## `configureRTSP(options)`

Sets global SDK defaults.

```js
configureRTSP({
  extensionId: "YOUR_CHROME_EXTENSION_ID",
  tagName: "rtsp-player",
  runtime: "extension",
});
```

| Option | Type | Description |
| --- | --- | --- |
| `extensionId` | `string` | Chrome extension ID that exposes `player/player.html`. |
| `tagName` | `string` | Custom element tag name. Default: `rtsp-player`. |
| `runtime` | `"extension" \| "desktop" \| "auto"` | Runtime bridge. Desktop requires Electron/Tauri exposing `window.rtspNative` or `window.__RTSP_DESKTOP__`. |

## `defineRTSPPlayer(tagName?, options?)`

Defines the Web Component.

```js
defineRTSPPlayer();
```

The element is safe to call multiple times. If the tag is already registered,
the existing constructor is returned.

## `createRTSPPlayer(options)`

Creates and configures a player element.

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

Updates attributes on an existing element.

```js
updateRTSPPlayer(player, {
  url: "rtsp://camera/stream2",
  autoplay: true,
});
```

## Element Attributes

| Attribute | Description |
| --- | --- |
| `url` | RTSP URL. |
| `src` | Alias for `url`. |
| `width` | CSS width or numeric px value. |
| `height` | CSS height or numeric px value. |
| `autoplay` | Start after initialization. |
| `controls` | Keep player controls enabled. |
| `muted` | Reserved for future audio support. |
| `runtime` | `extension`, `desktop`, or `auto`. |
| `transport` | Media transport. Defaults to `auto`, meaning WebRTC first and WebSocket fallback. |
| `media-transport` | Explicit media transport: `auto`, `webrtc`, or `ws-annexb`. |
| `rtsp-transport` | RTSP transport. Current native implementation supports `tcp`. |
| `codec` | `auto`, `h264`, or `h265`. |
| `extension-id` | Per-element extension ID override. |

## `probeRTSPCapabilities(codec?)`

Detects runtime video capabilities.

```js
const caps = await probeRTSPCapabilities("h265");
console.log(caps.h265WebRTC, caps.h265WebCodecs);
```

## Element Methods

```js
player.play("rtsp://camera/stream");
player.stop();
```

`stop()` posts a stop message to the iframe. The current player runtime closes
streams when the WebSocket is closed; explicit stop is kept as a stable SDK API.
During playback, recoverable decoder, WebRTC, WebSocket, or stream-stall errors
emit `recovering` and then `recovered` if frames resume. A final `error` is only
emitted after the retry budget is exhausted.

## Global Script API

When using `rtsp-player.global.js`, the SDK exposes `window.RTSP`:

```js
window.RTSP.configure({ extensionId: "YOUR_CHROME_EXTENSION_ID" });
window.RTSP.definePlayer();

const player = window.RTSP.createPlayer({
  url: "rtsp://camera/stream",
  autoplay: true,
});
```
