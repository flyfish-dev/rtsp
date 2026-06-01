# Chrome 扩展方案

Chrome 扩展方案适合业务网页、内网控制台、NVR 管理台和 SaaS 页面。用户安装 Runtime 后，页面可以直接使用 `<rtsp-player>`，扩展负责启动本地 Gateway、校验页面来源、转发播放控制和收集日志。

## 提供能力

- Chrome MV3 扩展。
- content script 自动挂载 `<rtsp-player>`。
- 扩展内 iframe 播放器。
- service worker 通过 Native Messaging 控制本地 host。
- popup 管理授权来源、日志、诊断和 Native Gateway 重启。
- 默认 WebRTC 优先，失败自动回退 WebSocket + WebCodecs。

## 推荐安装

普通用户建议直接使用图形安装器：

```txt
https://rtsp.flyfish.dev/#demo
```

安装器会复制本地 Runtime、准备扩展目录、注册 Native Messaging Host，并打开 Chrome 扩展页。

固定扩展 ID：

```txt
giegomfhcmgebjhdiihnjohoinkbcjbh
```

## 开发安装

构建 Native Runtime：

```bash
./scripts/build.sh
```

Windows：

```powershell
./scripts/build.ps1
```

加载扩展：

1. 打开 `chrome://extensions`。
2. 开启 **Developer mode**。
3. 点击 **Load unpacked**。
4. 选择仓库中的 `extension/` 目录。

注册 Native Host：

```bash
./scripts/install-host.sh giegomfhcmgebjhdiihnjohoinkbcjbh ./dist/rtsp-web-native-darwin-arm64
```

Windows：

```powershell
./scripts/install-host.ps1 `
  -ExtensionId giegomfhcmgebjhdiihnjohoinkbcjbh `
  -BinaryPath .\dist\rtsp-web-native-windows-amd64.exe
```

## 授权页面来源

打开扩展 popup，添加业务页面 origin：

```txt
http://localhost:5173
https://your-app.example.com
```

不要只写域名，必须包含协议和端口。

新版 content script 也支持页面显式请求自动授权当前来源。页面发送：

```js
window.postMessage({ type: "RTSP_ALLOW_ORIGIN_REQUEST" }, location.origin);
```

或在安装检测请求中携带：

```js
window.postMessage({ type: "RTSP_INSTALL_STATUS_REQUEST", autoAllowOrigin: true }, location.origin);
```

扩展只会保存当前页面的 `location.origin`，不会接受页面传入任意第三方 origin。

## 页面使用

```html
<rtsp-player
  url="rtsp://user:pass@camera/stream"
  width="960"
  height="540"
  autoplay
  controls>
</rtsp-player>
```

## 日志与诊断

客户无法播放时，先打开扩展 popup：

1. 点击 **刷新日志**。
2. 点击 **复制日志**。
3. 把日志发给支持人员。

日志会包含扩展事件、Native Runtime 状态、Gateway PID/端口、RTSP 握手、WebRTC 回退、WebSocket 状态、解码错误和自动恢复记录，并自动遮蔽用户名、密码、token 和 secret。

## 生产建议

- 将 `extension/manifest.json` 的 `content_scripts.matches` 改成业务域名。
- 企业环境建议通过 Chrome Enterprise policy 分发扩展。
- Native Messaging manifest 只允许固定扩展 ID。
- 业务页面只授权可信 origin。
