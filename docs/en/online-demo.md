# Online Demo

Demo URL:

```txt
https://rtsp.flyfish.dev/#demo
```

## Two Modes

The left preview is a simulated low-latency canvas view. It does not require a camera or local runtime.

The real RTSP lab mounts the extension player iframe. It requires:

1. Chrome Runtime extension.
2. Native Runtime registration.
3. Current site origin authorized in the extension popup.

Allowed production origins:

```txt
https://rtsp.flyfish.dev
https://rtsp-roan.vercel.app
```

## Public Test Stream

```txt
rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1
```

Public streams may be rate-limited or temporarily unavailable. Production validation should use your own camera or NVR, preferably with an H.264 substream.

## If the Page Keeps Waiting

- The extension is not loaded or disabled.
- The extension ID is not the fixed ID.
- The current site origin is not allowed.
- Native Messaging Host registration failed.
- An older installer is still installed.
