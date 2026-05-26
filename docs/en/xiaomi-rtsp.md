# Xiaomi / Mi Camera RTSP Bridge

Most Xiaomi / Mi cameras do not expose standard RTSP directly. Use [miiot/micam](https://github.com/miiot/micam) to bridge the camera stream to local RTSP through Docker Compose, Miloco, go2rtc, and micam.

Recommended path:

```txt
Xiaomi camera
  -> Xiaomi account / Miloco
  -> miiot/micam
  -> go2rtc RTSP
  -> rtsp://bridge-host:8554/stream_name
  -> RTSP Player
```

## Requirements

- Always-on host such as NAS, Linux box, Home Assistant, or server.
- Docker and Docker Compose.
- Same LAN as the camera.
- Xiaomi account with the target camera bound.

## Deploy micam

```bash
mkdir -p /opt/micam
cd /opt/micam
wget https://raw.githubusercontent.com/miiot/micam/refs/heads/main/docker-compose.yml
docker compose up -d
```

## Configure

1. Open Miloco at `https://bridge-host:8000`.
2. Bind the Xiaomi account.
3. Find the target camera DID.
4. Open go2rtc config at `http://bridge-host:1984/config.html`.
5. Add a stream name such as `mi_camera_1`.
6. Configure micam to push that camera into the go2rtc stream.

RTSP URL:

```txt
rtsp://bridge-host:8554/mi_camera_1
```

Use H.264 first for broad browser compatibility.
