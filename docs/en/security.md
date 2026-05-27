# Security Model

RTSP keeps the trust boundary small and local.

## Local Gateway

- Binds only to `127.0.0.1`.
- Uses a random per-Gateway secret for control APIs.
- Uses one-time stream tokens for playback sessions.
- Validates WebSocket token and origin.
- Cleans pending and active state on stop.

## Native Messaging

The native host handles one length-prefixed JSON request and exits. The long-running process is the local Gateway daemon. Video frames do not travel through Native Messaging.

## RTSP URL Handling

- RTSP URLs are not placed in iframe query strings.
- Logs redact credentials.
- Authorized pages send URLs to the extension iframe by `postMessage`.
- The extension passes control messages through Chrome APIs.

## Production Advice

- Restrict `content_scripts.matches` to business domains.
- Avoid wildcard allowed origins.
- Keep the extension ID stable.
- Register Native Messaging manifests only for trusted extension IDs.
