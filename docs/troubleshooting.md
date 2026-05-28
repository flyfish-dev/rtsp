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

`0.1.15` 继续补齐一类更偏现场的流：摄像头会先输出大量非 IDR VCL，PPS 又在运行中才出现。Gateway 会把运行中识别到的 SPS/PPS 同步给 WebSocket 组帧器；WebRTC 在参数集齐全但关键帧标识长期不可判定时，会按 VLC/FFmpeg 的容错策略软启动并注入参数集，避免一直等待到自动恢复。

`0.1.16` 兼容一类把厂商私有元数据塞进 H.264 SPS NAL（type 7）的国产摄像头：这种伪 SPS 通常超过 80KB，会通过 FU-A 分片紧跟 IDR 一起送来。Gateway 会丢弃任何大于 512 字节的 SPS 单元（合法 SPS 一般只有 10–30 字节），保留摄像头同帧附带的标准小 SPS 用于解码器配置。表现上：起播由 ~17 秒缩短到 1 秒内、关键帧从 ~85KB 回到 ~1KB、周期性卡顿/帧回退消失、WebRTC 不再因解码器拒绝超大 SPS 而失败。同时把 WebRTC 首帧等待超时从 15 秒下调到 5 秒，缩短 WebRTC 失败时回退 WebSocket 的等待时间。

`0.1.17` 修复 Native Messaging 端"`gateway startup lock timeout`"频繁报错：

- 在抢启动锁之前先做一次 read-only 健康检查，已经有健康 gateway 时直接复用，绝大多数请求不再竞争锁。
- 锁文件改为记录持有者 PID，新进程等待时会校验持有者是否仍在运行；如果 Chrome 把 native messaging host 进程在持锁后强行关闭，下一个请求会立刻清理孤儿锁，而不是傻等到超时。
- 修正了 Windows 上 `processExists` 始终返回 false 的旧 bug，现在用 `OpenProcess + GetExitCodeProcess` 检查存活，stale gateway 进程也能被正确发现和清理。
- 锁等待超时从 7 秒延长到 20 秒、stale 阈值从 12 秒拉到 30 秒，配合上面的孤儿回收机制覆盖 Windows Defender 冷扫描等慢启动场景。

`0.1.18` 修复 1.11 等摄像头经过 RTSP 透传（如 natapp、内网穿透）后完全无画面：0.1.16/0.1.17 在丢掉超大 vendor SPS 时也会一并丢掉摄像头同一帧附带的真 SPS/PPS/IDR——透传链路会把这些真单元打包在 vendor SPS 的 FU-A 分片中间，作为 Annex-B 数据嵌入。0.1.18 在丢弃超大 vendor SPS NAL 之前会先扫描其内部的 Annex-B 起始码，把真实的 SPS/PPS/SEI/IDR 单元抢救出来作为独立 NAL 输出（日志 `h264 sps salvaged inline nalus`），WebSocket 和 WebRTC 两条路径都走同一逻辑。表现：之前一直 `dropping delta frame before first keyframe` 卡死的流，0.1.18 能正常解出关键帧并显示画面。

`0.1.20` 把 WebRTC 路径切换到 `deepch/vdk`（与 `deepch/RTSPtoWeb` 同源的 Go 流媒体库），从根本上解决"VLC 能播浏览器不能播"的兼容性问题：

- 之前的 WebRTC 是我们自己手写的 RTSP demuxer + Pion v4 + 手工 RTP 重打包。摄像头一旦出现 oversized vendor SPS、Annex-B-in-RTP、FU-A 错误标记 NAL 类型这类怪行为，手写实现就要追着每一个怪流写补丁（0.1.16/0.1.17/0.1.18/0.1.19 都是这么打的补丁）。
- 0.1.20 改用 vdk 的 `format/rtspv2` 做 RTSP demux、`format/webrtcv3` 做 WebRTC muxer。这两个库已经被 RTSPtoWeb 在生产环境里跑了多年，对国产摄像头、natapp 透传、各种厂商 SPS 扩展有非常成熟的处理：demuxer 把干净的 SPS/PPS 单独抽到 CodecData，muxer 在每个 IDR 前重新注入 CodecData 里的干净参数集，浏览器解码器即使遇到 vendor SPS 也会直接跳过用干净的那份。
- RTP 重打包完全交给 Pion 的 `TrackLocalStaticSample`，告别我们手写的 FU-A 循环（更标准的 packetization-mode=1 分片、更稳的 sequence number / timestamp 管理）。
- 默认 backend 改为 vdk；如果某个怪流恰好在 vdk 路径上跑不通，可以通过启动 Chrome 时设置环境变量 `RTSP_WEBRTC_BACKEND=pion` 回滚到 0.1.19 的手写实现做兜底（仅用于调试）。

Native gateway 启动日志会写明当前 backend：`webrtc backend: vdk` 或 `webrtc backend: pion`。

`0.1.19` 让 WebRTC 真正能播 baseline 4.0/4.1/4.2 等高 level 码流：

- Chrome 在 SDP offer 里把 H.264 `profile-level-id` 写死成 `42001f`（baseline level 3.1），过去 Gateway 直接 echo 回 answer 导致浏览器按 3.1 解码器规格配置缓冲/DPB，遇到 4.x 摄像头码流会静默丢帧。`0.1.19` 在生成 answer 时把所有 H.264 `profile-level-id` 升级到 `42c033`（baseline level 5.1）并保留 `level-asymmetry-allowed=1`，让浏览器按高 level 配置解码器接受真实 SPS（日志 `webrtc answer profile-level-id upgraded to 42c033`）。
- 浏览器侧解码失败或丢帧时会发 RTCP PLI/FIR 请求重发关键帧，旧版 Gateway 把这些反馈直接丢掉。`0.1.19` 在 `drainRTCP` 中解析 PLI（PT=206 FMT=1）/FIR（PT=206 FMT=4）并通过新的 `Client.RequestKeyframe()` 接口转发为 RTSP RTCP keyframe 请求（日志 `webrtc rtcp browser PLI/FIR forwarded to RTSP source`），与摄像头之间形成真正的端到端反馈回路，可以避免一次解码失败后永久卡黑屏。
- WebRTC 重打包时把关键帧前的 SPS/PPS/SEI 用单个 STAP-A 聚合下发，浏览器一次就能拿到完整解码配置，不再因为参数集分散在多个 RTP 包而提高丢失概率，加快首帧出图（日志 `webrtc repacketize forward ... nalus=[7,8,6,5]`）。
- WebRTC 首帧等待从 5 秒延长到 8 秒：当摄像头 GOP 是 1.4 秒级别（部分国产摄像头默认配置）时 5 秒只够 3 个 GOP 机会，新阈值给浏览器最多 5 个 GOP 触发解码，再加上上面的 PLI 反馈通常 2 秒内即可起播；如果仍超时再回退 WebSocket。

日志关键词：

```txt
h264 annexb-in-rtp
h264 fu-a annexb-fragment
h264 sps oversized dropped
h264 sps salvaged inline nalus
webrtc repacketize
webrtc repacketize soft-starting h264 after parameters
h264 runtime parameter sync
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
