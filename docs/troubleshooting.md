# 排障指南

## Popup 显示 Native Runtime 未检测到

检查 Native Messaging manifest 路径。

macOS：

```txt
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.rtspweb.player.json
```

Linux：

```txt
~/.config/google-chrome/NativeMessagingHosts/com.rtspweb.player.json
```

manifest 里的 `allowed_origins` 必须包含固定扩展 ID：

```json
{
  "allowed_origins": [
    "chrome-extension://giegomfhcmgebjhdiihnjohoinkbcjbh/"
  ]
}
```

macOS 推荐使用当前图形安装器，或通过 `scripts/install-host.sh` 安装。脚本会把二进制复制到 `~/Library/Application Support/rtsp-web-player/`。

## VLC 能播放，浏览器不能播放

先收集日志：

1. 打开 RTSP Web Player 扩展 popup。
2. 点击 **刷新日志**。
3. 点击 **复制日志**，发送给支持人员。

日志包含扩展事件、Native Runtime 健康状态、Gateway PID/端口、RTSP 握手、选中的 H.264/H.265 track、WebRTC 协商、WebSocket 回退、解码恢复和自动重启记录。用户名、密码、token 和 secret 会自动遮蔽。

常见日志解释：

- `PLAY: not RTSP response: "$..."`：部分摄像头会在 PLAY 响应前先发送 RTCP interleaved 包。`0.1.6` 已兼容跳过这些包并继续读取真正的 RTSP 响应。
- `FU-A continuation without start`：播放器从 H.264 分片帧中段接入，属于实时流常见现象。播放器会等待下一个 IDR 关键帧，不再在首帧前过早重启。
- `non-existing PPS 0 referenced` / `decode_slice_header error` / `no frame!`：源端在当前 GOP 里发来了引用 PPS 的 slice，但起播点没有提供完整 PPS。`0.1.12` 会在 WebRTC/WS 起播前强制等待完整 SPS/PPS，并通过 RTCP PLI/FIR 主动请求摄像头输出新的关键帧和参数集；如果仍长期缺失，说明源端没有向客户端提供可解码参数集，需要在摄像头或转推端开启关键帧携带 SPS/PPS。
- `first access unit ... key=false bytes=...` 但 VLC 能播放：部分摄像头会把可起播帧编码为 non-IDR I-slice，或把 SPS/PPS 参数集拆成独立 RTP marker 包。`0.1.9` 会把 I/SI slice、AUD intra、拆包 SPS/PPS 后的 VCL、以及带 SDP 参数集的首个 VCL 都作为关键帧/起播帧候选处理。
- `DESCRIBE/SETUP/PLAY status 401`：摄像头拒绝 RTSP 鉴权。先确认 URL 中用户名密码正确，再检查账号是否有实时预览权限。`0.1.9` 已增加 Digest URI 兼容重试；如果仍是 401，优先尝试去掉 `?transportmode=...&profile=...` 这类 URL 参数。
- `正在等待摄像头关键帧/起播帧`：RTSP 链路已通，浏览器正在等可解码首帧。建议把摄像头 GOP 设置为 1-2 秒，首屏会明显更快。

## 升级后旧进程影响播放

打开扩展 popup，点击 **重启 Native**。当前 Native Host 会清理旧 Gateway 状态，停止可识别的旧 Gateway 进程，并启动已安装的新版本。

## macOS 提示无法验证 rtsp-web-native

使用当前 `rtsp-macos-installer.dmg`。如果首次启动被系统拦截，请右键 `RTSP Installer.app`，选择 **打开**，再确认打开。

## 页面提示 Origin not allowed

打开扩展 popup，添加页面 origin，必须包含协议和端口：

```txt
http://localhost:5173
https://your-app.example.com
```

在线 Demo 需要：

```txt
https://rtsp.flyfish.dev
https://rtsp-roan.vercel.app
```

如果安装助手显示已授权，但播放器仍提示未授权，请重新加载 unpacked 扩展，或重新运行当前安装器。

## 播放中途黑屏或解码报错

当前版本会自动恢复可恢复错误：先重建 WebCodecs 解码器，连续失败时清理当前 `streamId` 并重新拉流。

重点查看日志关键词：

```txt
RTSP_PLAYER_RECOVERING
decoder-error-loop
video-stall
websocket-closed
gateway-error
```

如果反复恢复失败，通常是源端问题：关键帧间隔过长、码流缺少 SPS/PPS、H.265 平台不可解、摄像头连接数满，或 RTSP over TCP 被网络中断。建议先切 H.264 子码流，GOP 设置为 1-2 秒，并限制码率。

如果使用 FFmpeg 中转，避免只做裸 `-vcodec copy` 后仍缺参数集。推荐让源端每个关键帧携带 SPS/PPS；无法配置摄像头时，中转端应在关键帧补充 extradata，例如按业务链路评估 `dump_extra=freq=keyframe` 这类 H.264 bitstream filter。

## VLC 能播但浏览器一直无画面

部分摄像头或 RTSP 中转器会把 Annex-B H.264 字节流直接塞进 RTP payload，甚至放在 FU-A 外壳里。这不是标准 RFC6184 包法，但 VLC/FFmpeg 会宽容处理。

`0.1.14` 已兼容这类流：Gateway 会识别 `Annex-B-in-RTP`，WebSocket/WebCodecs 路径会正确拆 NALU；WebRTC 路径会尽量把 Annex-B 重新打包成浏览器可接收的 H.264 RTP，失败时再回退 WebSocket。

日志关键词：

```txt
h264 annexb-in-rtp
h264 fu-a annexb-fragment
webrtc repacketize
first access unit
```

## WebRTC 能播但画面一卡一卡

`0.1.13` 增加了两层处理：Gateway 会按 RTP timestamp 做轻量 pacing，避免 RTSP/TCP 突发包直接冲击浏览器 WebRTC jitter buffer；播放器会用真实视频帧回调检测 WebRTC 平滑度，若连续窗口内帧率过低或帧间隔过大，会自动切换到 WebSocket/WebCodecs 低延迟链路。

日志关键词：

```txt
WebRTC smoothness sample
webrtc-poor-smoothness
falling back to WebSocket transport
```

## H.265 无画面

H.265 依赖平台能力。Chrome、Electron、Tauri 和系统 WebView 并不保证都能硬解 HEVC。生产建议默认 `codec="auto"`，无法播放时提示客户切换摄像头到 H.264 子码流。
