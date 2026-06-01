# Online Demo

Demo URL:

```txt
https://rtsp.flyfish.dev/#demo
```

## Two Modes

The left preview is a simulated low-latency canvas view. It does not require a camera or local runtime.

The real RTSP lab mounts the extension player iframe. The install detector asks the extension to add the current `origin` to the allowlist automatically. It requires:

1. Chrome Runtime extension.
2. Native Runtime registration.
3. Current site origin authorized automatically or visible in the extension popup.

Allowed production origins:

```txt
https://rtsp.flyfish.dev
https://rtsp-roan.vercel.app
```

## Plain HTML Integration Demo

Standalone page:

```txt
https://rtsp.flyfish.dev/docs/demo-page/index.html
```

It uses plain HTML/CSS/JavaScript only:

- `rtsp-install-detector.js`: extension detection, Native Runtime detection, and current-origin auto allowlist.
- `window.RTSPDemo.checkInstall()`: recheck and authorize the current page.
- `window.RTSPDemo.play(url)`: create the extension player iframe and start playback.
- `window.RTSPDemo.stop()`: stop playback.

Installer links are local to the same site:

```txt
/docs/demo-page/downloads/rtsp-macos-installer.dmg
/docs/demo-page/downloads/rtsp-macos-installer.zip
/docs/demo-page/downloads/rtsp-windows-installer.zip
/docs/demo-page/downloads/rtsp-linux-installer.tar.gz
```

## Public Test Stream

```txt
rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1
```

Public streams may be rate-limited or temporarily unavailable. Production validation should use your own camera or NVR, preferably with an H.264 substream.

## If the Page Keeps Waiting

- The extension is not loaded or disabled.
- The extension ID is not the fixed ID.
- The extension is old and does not support current-origin auto authorization.
- Native Messaging Host registration failed.
- An older installer is still installed.
