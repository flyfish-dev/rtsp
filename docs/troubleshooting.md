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
https://rtsp-roan.vercel.app
https://doc.flyfish.dev
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
