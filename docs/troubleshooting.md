# Troubleshooting

## Popup Shows Native Runtime Missing

Check the Native Messaging manifest path:

macOS:

```txt
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.rtspweb.player.json
```

Linux:

```txt
~/.config/google-chrome/NativeMessagingHosts/com.rtspweb.player.json
```

The manifest `allowed_origins` must contain the exact extension ID:

```json
{
  "allowed_origins": [
    "chrome-extension://giegomfhcmgebjhdiihnjohoinkbcjbh/"
  ]
}
```

On macOS, use `scripts/install-host.sh`; it copies the binary into
`~/Library/Application Support/rtsp-web-player/` before registration.

## Collect Logs for Playback Failures

When VLC can play the RTSP source but the browser cannot, collect the extension
diagnostics first:

1. Open the RTSP Web Player extension popup.
2. Click **刷新日志**.
3. Click **复制日志** and send the copied text to support.

The log bundle includes extension events, Native Runtime health, Gateway PID and
port, RTSP handshake stages, selected H.264/H.265 track, WebRTC negotiation,
WebSocket fallback, and decoder errors. RTSP usernames, passwords, tokens, and
secrets are automatically redacted.

If playback behaves strangely after upgrading, click **重启 Native** in the same
popup. The current Native Host will stop stale Gateway processes recorded in the
state file, remove old state, and start the installed runtime version again.

## macOS Says Apple Cannot Verify rtsp-web-native

Use the current `rtsp-macos-installer.dmg` and run `RTSP Installer.app`. If
macOS blocks the first launch, right-click the app, choose Open, then confirm
Open.

## Page Says Origin Not Allowed

Open the extension popup and add the page origin. Include the scheme and port:

```txt
http://localhost:5173
https://your-app.example.com
```

For the online demo, the origin must include the exact production host:

```txt
https://rtsp.flyfish.dev
https://rtsp-roan.vercel.app
```

If the installer status says the origin is allowed but the player still shows
`Origin not allowed`, reload the unpacked extension or reinstall the current
installer package. Older extension builds used a shorter default origin list in
the iframe player.

## Decoder Ready But No Picture

With `transport="auto"`, first check whether WebRTC negotiated but did not
receive video. The SDK will fall back to WebSocket/WebCodecs after a short
timeout. If both paths fail, test a H.264 sub stream before trying H.265 again.

Also check:

- RTSP over TCP is enabled.
- The source uses a reasonable GOP interval.
- Browser/Electron/Tauri WebView supports the selected H.264/H.265 codec.
- The page is not hidden or throttled by background tab behavior.

## RTSP Authentication Fails

Use a full URL with credentials:

```txt
rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101
```

The native runtime supports Basic and Digest authentication. Logs redact
credentials, so inspect camera/NVR logs if the server still returns `401`.

## Public Stream Works But Camera Does Not

Most camera failures are one of:

- Camera is set to H.265 but the browser/system cannot decode it.
- Camera only allows UDP RTP.
- Firewall blocks RTSP port `554`.
- User account does not have live-view permission.
- Vendor URL path is different from the model documentation.

Start with the camera sub stream configured as H.264, RTSP over TCP, lower
bitrate, and a simple password without URL-special characters. Once stable,
switch `codec="h265"` for H.265-capable desktop/browser targets.
