# 小米 / 米家摄像头 RTSP 桥接指南

小米、米家摄像头多数型号不直接开放标准 RTSP。推荐使用
[miiot/micam](https://github.com/miiot/micam) 做本地桥接：它通过 Docker
Compose 部署 Miloco、go2rtc 和 micam，把小米摄像头视频流转推成局域网 RTSP。

推荐链路：

```txt
小米摄像头
  ↓ 小米账号 / Miloco 获取设备流
miiot/micam
  ↓ 写入 go2rtc
rtsp://桥接主机:8554/your_stream
  ↓
RTSP Player WebRTC first / WebSocket fallback
```

## 准备条件

- 一台常开主机：NAS、Linux 小主机、Home Assistant 主机或服务器。
- 已安装 Docker 和 Docker Compose。
- 主机与摄像头在同一局域网，且能访问外网拉取镜像。
- 小米账号中已经绑定目标摄像头。

## 1. 部署 micam

在桥接主机上执行：

```bash
mkdir -p /opt/micam
cd /opt/micam
wget https://raw.githubusercontent.com/miiot/micam/refs/heads/main/docker-compose.yml
docker compose up -d
```

该 Compose 会启动三个核心服务：

| 服务 | 作用 |
| --- | --- |
| Miloco | 绑定小米账号，获取摄像头设备与视频流 |
| go2rtc | 提供 RTSP 服务，默认 RTSP 端口 `8554` |
| micam | 从 Miloco 拉取摄像头流，并转推到 go2rtc |

## 2. 配置 Miloco

打开 Miloco WebUI：

```txt
https://桥接主机IP:8000
```

Miloco 使用自签证书，浏览器首次访问时需要允许继续访问。

操作流程：

1. 设置 Miloco 管理密码。
2. 绑定小米账号。
3. 确认目标摄像头在线。
4. 记录摄像头 DID，也就是 `CAMERA_ID`。如果页面没有直接显示，可以按 micam 文档提示，通过浏览器开发者工具的网络请求查看。

## 3. 在 go2rtc 创建 RTSP 流名

打开 go2rtc 配置页：

```txt
http://桥接主机IP:1984/config.html
```

添加一个空流名，例如：

```yaml
streams:
  mi_camera_1:
```

保存并重启 go2rtc。后续 micam 会把摄像头视频推到这个流名，对外 RTSP 地址就是：

```txt
rtsp://桥接主机IP:8554/mi_camera_1
```

## 4. 配置 micam 环境变量

在 `/opt/micam/.env` 中写入：

```env
MILOCO_PASSWORD=your_miloco_password_md5_lowercase
CAMERA_ID=1234567890
RTSP_URL=rtsp://桥接主机IP:8554/mi_camera_1
VIDEO_CODEC=h264
STREAM_CHANNEL=0
```

说明：

| 变量 | 说明 |
| --- | --- |
| `MILOCO_PASSWORD` | Miloco WebUI 密码的 MD5，小写 |
| `CAMERA_ID` | 小米摄像头 DID |
| `RTSP_URL` | micam 转推到 go2rtc 的目标 RTSP 地址 |
| `VIDEO_CODEC` | `h264` 或 `hevc`；网页兼容优先建议先用 `h264` |
| `STREAM_CHANNEL` | 摄像头通道，默认 `0` |

让配置生效：

```bash
cd /opt/micam
docker compose up -d
docker compose restart micam1
```

多摄像头可以在 `docker-compose.yml` 中按 micam 的 `micam2` 示例扩展服务，并为每路配置独立的 `CAMERA_ID` 与 `RTSP_URL`。

## 5. 用 RTSP Player 播放

在本项目在线 Demo、Chrome 扩展或桌面应用里填写：

```txt
rtsp://桥接主机IP:8554/mi_camera_1
```

网页组件示例：

```html
<rtsp-player
  runtime="auto"
  transport="auto"
  codec="auto"
  url="rtsp://192.168.31.10:8554/mi_camera_1"
  autoplay
  controls>
</rtsp-player>
```

如果你在 micam 中使用 `VIDEO_CODEC=hevc`，可以显式尝试 H.265：

```html
<rtsp-player
  runtime="auto"
  transport="auto"
  codec="h265"
  url="rtsp://192.168.31.10:8554/mi_camera_1"
  autoplay
  controls>
</rtsp-player>
```

H.265 播放依赖浏览器、系统 codec 和硬件能力。生产建议保留一条 H.264 流作为回退。

## 推荐配置

| 目标 | 建议 |
| --- | --- |
| 最稳网页播放 | `VIDEO_CODEC=h264`，播放器 `codec="auto"` |
| 尝试更低带宽 | `VIDEO_CODEC=hevc`，播放器 `codec="h265"`，失败回 H.264 |
| 低延迟 | 保持局域网桥接，RTSP 地址使用桥接主机内网 IP |
| 多摄像头 | 每路独立 go2rtc stream name，例如 `mi_front_door`、`mi_living_room` |

## 排障

- Miloco 页面打不开：确认 `docker compose ps` 正常，防火墙允许 `8000`。
- 摄像头不在线：先在米家 App 确认摄像头在线，再检查 Miloco 小米账号绑定状态。
- `CAMERA_ID` 不确定：在 Miloco WebUI 的设备列表或浏览器开发者工具网络请求里查 DID。
- go2rtc 没有流：确认 `streams:` 中的流名与 `.env` 里的 `RTSP_URL` 路径一致。
- RTSP 连接超时：确认播放器所在机器能访问桥接主机 `8554` 端口。
- 有声音没画面或黑屏：先把 `VIDEO_CODEC` 改为 `h264`，再重新 `docker compose restart micam1`。
- WebRTC/H.265 协商失败：这是平台能力限制，使用 H.264 或等待浏览器/系统支持。

## 安全建议

- 只在可信局域网暴露 `8000`、`1984`、`8554`。
- 不要把 Miloco、go2rtc 或 RTSP 端口直接暴露到公网。
- 生产环境建议在路由器或防火墙中限制访问来源。
- 如需远程访问，优先通过 VPN、Zero Trust 隧道或内网穿透鉴权层进入局域网。

## 参考

- [miiot/micam](https://github.com/miiot/micam)
- [AlexxIT/go2rtc](https://github.com/AlexxIT/go2rtc)
