# Security Model

RTSP intentionally keeps the trust boundary small.

## Local Gateway

- Binds only to `127.0.0.1`.
- Uses a random per-gateway secret for HTTP control APIs.
- Uses one-time stream tokens for WebSocket playback sessions.
- Rejects WebSocket origins that do not match the extension iframe origin.

## Native Messaging

Chrome starts the native host and passes one length-prefixed JSON request over
stdio. The native host handles a single message and exits. The long-running
process is the local gateway daemon, not the Native Messaging host process.

This matches `chrome.runtime.sendNativeMessage` and avoids callbacks hanging on
an open stdio pipe.

## RTSP URL Handling

- RTSP URLs are never placed in iframe query strings.
- Gateway logs redact credentials.
- Browser pages send the RTSP URL to the extension iframe by `postMessage`.
- Extension pages pass the URL to the native runtime over Chrome extension APIs.

## Page Authorization

The extension popup stores allowed web origins. The iframe refuses initialization
from pages that are not on the list.

Production systems should:

1. Restrict `content_scripts.matches` to exact business domains.
2. Avoid wildcard allowed origins.
3. Keep the fixed extension ID stable, or publish through Chrome Web Store / enterprise policy.
4. Register Native Messaging manifests only for trusted extension IDs.

## Network Scope

The gateway does not expose a LAN or public port. It only listens on localhost
and opens outbound RTSP connections to the camera/NVR address supplied by the
authorized page.
