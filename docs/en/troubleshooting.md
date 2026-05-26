# Troubleshooting

## Native Runtime Missing

Check the Native Messaging manifest.

macOS:

```txt
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.rtspweb.player.json
```

Linux:

```txt
~/.config/google-chrome/NativeMessagingHosts/com.rtspweb.player.json
```

The manifest must allow the fixed extension ID:

```txt
chrome-extension://giegomfhcmgebjhdiihnjohoinkbcjbh/
```

## VLC Works but Browser Does Not

Open the extension popup:

1. Click Refresh logs.
2. Click Copy logs.
3. Send the copied bundle to support.

Logs include extension events, Native Runtime health, Gateway PID/port, RTSP handshake, selected track, WebRTC negotiation, WebSocket fallback, decoder recovery, and auto-restart attempts. Credentials and tokens are redacted.

## Stale Gateway After Upgrade

Click Restart Native in the extension popup. The current Native Host will clear stale state, stop identifiable old Gateway processes, and start the installed runtime version.

## Origin Not Allowed

Add the exact page origin in the extension popup:

```txt
http://localhost:5173
https://your-app.example.com
```

Production demo origins:

```txt
https://rtsp.flyfish.dev
https://rtsp-roan.vercel.app
```

## Black Screen or Decode Error

Recoverable errors are handled automatically. The player first rebuilds the WebCodecs decoder; repeated failures clean the current `streamId` and restart the stream.

Useful log keywords:

```txt
RTSP_PLAYER_RECOVERING
decoder-error-loop
video-stall
websocket-closed
gateway-error
```

If recovery keeps failing, use an H.264 substream, set GOP to 1-2 seconds, and reduce bitrate.
