# SDK API

## `configureRTSP(options)`

Sets global defaults.

```js
configureRTSP({
  extensionId: "YOUR_CHROME_EXTENSION_ID",
  tagName: "rtsp-player",
  runtime: "extension",
});
```

| Option | Type | Description |
| --- | --- | --- |
| `extensionId` | `string` | Chrome extension ID |
| `tagName` | `string` | Custom element name |
| `runtime` | `extension` / `desktop` / `auto` | Runtime bridge |

## `defineRTSPPlayer(tagName?, options?)`

Registers the Web Component. It is safe to call multiple times.

## `createRTSPPlayer(options)`

```js
const player = createRTSPPlayer({
  extensionId: "YOUR_CHROME_EXTENSION_ID",
  url: "rtsp://camera/stream",
  autoplay: true,
  controls: true,
  transport: "auto",
  codec: "auto",
});
```

## Attributes

| Attribute | Description |
| --- | --- |
| `url` / `src` | RTSP URL |
| `runtime` | `extension`, `desktop`, or `auto` |
| `transport` | `auto`, `webrtc`, `ws-annexb`, or legacy `tcp` |
| `rtsp-transport` | RTSP transport, currently `tcp` |
| `codec` | `auto`, `h264`, or `h265` |
| `extension-id` | Per-element extension ID |

## Methods

```js
player.play("rtsp://camera/stream");
player.stop();
```

Recoverable failures emit `recovering`; successful recovery emits `recovered`; final failure emits `error`.
