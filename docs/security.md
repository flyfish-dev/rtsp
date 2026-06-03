# 安全模型

RTSP 尽量把信任边界收窄在本机和已授权页面之间。

## 本地 Gateway

- 只监听 `127.0.0.1`。
- HTTP 控制 API 使用每次启动随机生成的 gateway secret。
- 每路播放使用一次性 `streamToken`。
- WebSocket 会校验来源和 token。
- 停止播放时会清理 pending / active 状态。

## Native Messaging

Chrome 通过 Native Messaging 启动 native host，并传入一条带长度前缀的 JSON 消息。native host 处理一次请求后退出；真正常驻的是本地 Gateway daemon。

这样可以避免 `sendNativeMessage` 因 stdio 长时间打开而挂起，也能让视频帧避开 JSON 通道的性能限制。

## RTSP URL 处理

- RTSP URL 不放进 iframe query string。
- Gateway 日志会遮蔽用户名和密码。
- 页面通过 `postMessage` 把 RTSP URL 发给扩展 iframe。
- 扩展再通过 Chrome API 将控制请求交给 Native Runtime。

## 页面授权

扩展 popup 保存允许访问的网页 origin。未授权页面无法初始化 iframe 播放器。

生产环境建议：

1. 将 `content_scripts.matches` 限定为业务域名。
2. 避免使用 `*` 作为 allowed origin。
3. 固定扩展 ID，或通过 Chrome Web Store / 企业策略分发。
4. Native Messaging manifest 只允许可信扩展 ID。

## 网络范围

Gateway 不暴露局域网或公网端口，只在本机监听。它只会向授权页面提供的摄像头或 NVR 地址发起出站 RTSP 连接。
