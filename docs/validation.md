# 验证记录

## 基础检查

```bash
npm run check
```

覆盖：

- SDK 构建。
- JS 语法检查。
- Go 单元测试。
- 文档站构建。

Go 测试：

```bash
cd native
go test ./...
```

安装包构建：

```bash
npm run build:installers
```

Tauri 检查：

```bash
cd apps/tauri/src-tauri
cargo check
```

## Native Messaging Ping

native host 每次读取一条 Chrome Native Messaging 消息，返回后退出。Gateway daemon 独立常驻，并写入状态文件。

期望响应：

```json
{
  "ok": true,
  "type": "ping",
  "port": 53745,
  "version": "0.1.8"
}
```

## 公开 RTSP E2E

公开测试源：

```txt
rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1
```

完整路径：

```txt
demo page -> content script -> extension iframe -> service worker
-> Chrome Native Messaging -> Go host -> Go gateway
-> RTSP over TCP -> WebRTC first
-> WebSocket/WebCodecs fallback -> Canvas
```

公开源可能临时限流或返回 403，因此生产验收建议使用自己的摄像头或 NVR。

截图：

![公开 RTSP 验证](assets/public-rtsp-e2e.png)

## 本机回放源验证

本机循环 RTSP 源：

```txt
rtsp://127.0.0.1:8554/local
```

已验证：

```txt
4 路同时 startStream
每路收到 H.264 Annex-B 二进制帧
diagnostics activeStreams = 4
逐路 stopStream
diagnostics pendingStreams = 0, activeStreams = 0
```

## 安装包验证

- macOS DMG 可下载，Content-Type 为 `application/x-apple-diskimage`。
- Windows ZIP 和 Linux tar.gz 已复制到站点 `/downloads/`。
- 安装器会清理旧 Gateway 进程，复制最新 runtime，并写入固定扩展 ID。

## 已知边界

- 音频暂不支持。
- UDP RTP 暂不支持。
- H.265 依赖浏览器、系统和硬件能力。
- 普通网页免扩展时不能自行启动 Gateway，必须通过桌面 bridge。
