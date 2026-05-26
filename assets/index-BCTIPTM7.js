(function(){const u=document.createElement("link").relList;if(u&&u.supports&&u.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))t(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&t(i)}).observe(document,{childList:!0,subtree:!0});function n(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function t(r){if(r.ep)return;r.ep=!0;const o=n(r);fetch(r.href,o)}})();const Ln=`---
title: "把 RTSP 摄像头请进浏览器：一个免费组件背后的低延迟旅程"
author: "flyfish-dev"
description: "RTSP Player 最新实现：WebRTC 优先、WebCodecs 回退、Chrome 扩展、Web/React/Vue 组件、Electron/Tauri 原生应用，以及三端图形安装包。"
cover: "../assets/rtsp-player-latest-cover.png"
---

# 把 RTSP 摄像头请进浏览器：一个免费组件背后的低延迟旅程

![RTSP Player 最新封面](../assets/rtsp-player-latest-cover.png)

有些需求，听起来轻得像一句话。

“能不能把摄像头画面放进网页里？”

真正落到项目中，它立刻变成一片辽阔的水域：RTSP、RTP、H.264、H.265、浏览器权限、本地进程、硬件解码、跨平台安装、企业内网、桌面应用，以及最终用户眼前那一块必须自然流动的画面。

这正是 **RTSP Player** 诞生的地方。

它希望把一件长久以来并不轻松的事情，重新变得优雅：让网页像写普通组件一样播放 RTSP 摄像头，让桌面应用不用插件也能原生播放，让业务系统不必为了“一路画面”搭起庞大的媒体平台。

更重要的是，它完全免费使用。  
如果你希望获得全部源码、完整仓库权限，以及后续永久更新，任意捐赠即可自助开通。没有固定金额，也不需要反复沟通，支持之后即可进入仓库，后续更新自然跟随。

## 那个长期存在的空白

RTSP 在现实世界里无处不在。

门店、仓库、园区、工厂、学校、物业、NVR 管理台、AI 标注系统、边缘设备控制台，都能看到它的身影。摄像头早已铺在现场，业务页面也早已运行在浏览器里，可两者之间，却始终隔着一道并不温柔的门槛。

浏览器不直接认识 \`rtsp://\`。  
网页不能随意打开 TCP 长连接去收 RTP 包。  
传统插件渐渐离场，旧式控件难以再进入现代系统。  
把 RTSP 转成 HLS，延迟会被拉长。  
搭建完整 WebRTC 媒体服务，链路、部署和维护又会变得沉重。  
引入 FFmpeg，能力固然丰盛，却也带来更大的安装包、更多进程管理和更复杂的跨平台细节。

市场中真正缺少的，是一种更贴近业务的答案：

页面仍然是页面，组件仍然是组件，本地只做靠近摄像头的薄薄一层桥接，浏览器负责最终解码与绘制。视频不用绕远路，内网画面不必送去云端，前端也不用背负一整座媒体系统。

RTSP Player 就是在这个空白里一点点长出来的。

## 最新版，已经不只是一个网页播放器

最初的版本聚焦在 Chrome 扩展与 WebCodecs。现在，它已经扩展成三条完整的落地路径。

![RTSP Player 三条落地路径](../assets/rtsp-player-latest-architecture.png)

第一条，是 **Chrome 扩展版**。

它适合企业内网、NVR 管理台、SaaS 控制台和需要统一管控的业务页面。页面写下 \`<rtsp-player>\`，Chrome 扩展负责加载播放器 iframe、唤起本地 Runtime、管理允许访问的业务域名。

第二条，是 **通用组件 SDK**。

它面向前端工程。Plain JS、Web Component、React、Vue 都已经准备好，预构建 SDK 也随包提供。你可以把它放进看板、弹窗、大屏、九宫格和设备详情页中，像使用普通 UI 组件那样组织视频画面。

第三条，是 **Electron / Tauri 原生桌面应用**。

它面向桌面监控台、内网工具和离线部署。应用内启动打包好的 Go sidecar，播放器走 \`runtime="desktop"\`，无需安装 Chrome 扩展，也不依赖浏览器外部环境。对于希望“一次安装，打开即用”的团队，这条路径尤其清爽。

## WebRTC 优先，WebCodecs 回退

这一版最大的变化，是默认选择了更短的视频道路。

RTSP Player 现在采用 **WebRTC 优先** 的传输策略。摄像头的 RTP 视频包进入本地 Go Gateway 后，优先通过 Pion WebRTC 走标准 WebRTC Track 转发给浏览器或桌面 WebView。浏览器能够处理 H.264，也在越来越多平台上开始具备 H.265 / HEVC 能力。

当 WebRTC 协商失败，或者短时间内没有收到可播放的视频轨道时，播放器会自动回到原先的 WebSocket + WebCodecs 路径。这个回退路径依旧保留：Go Gateway 将 H.264/H.265 整理为 Annex-B access unit，浏览器用 \`VideoDecoder\` 硬件优先解码，再绘制到 Canvas。

也就是说，新的默认策略并不是押宝某一种环境，而是先走最短路径，再根据能力自然切换：

\`\`\`txt
优先：RTSP RTP → Go Gateway → WebRTC → 浏览器硬件解码

回退：RTSP RTP → Go Gateway → WebSocket Annex-B → WebCodecs → Canvas
\`\`\`

这对于低延迟画面非常关键。每少一次封装，每少一层转码，每少一段排队，画面就离现场更近一步。

## H.264 与 H.265，各自走在合适的位置

H.264 依旧是今天网页播放的兼容基线。它的浏览器支持广，摄像头和 NVR 中也普遍存在。RTSP Player 对 H.264 做了完整处理：SDP track 解析、RTP Single NALU、STAP-A、FU-A、SPS/PPS 缓存、IDR 前参数集补齐、Annex-B 输出。

H.265 则属于正在打开的门。Chrome 新版本已经开始让 WebRTC HEVC 成为可能，但它仍然依赖操作系统、硬件、浏览器版本与桌面 WebView 能力。RTSP Player 对 H.265 增加了 SDP 解析、RTP payload metadata、VPS/SPS/PPS 处理和 WebRTC RTP 转发路径，但不会承诺所有机器都必然可用。

这也是项目选择“能力探测优先”的原因。能走 H.265 时，它可以为高分辨率画面节省带宽；不能走时，系统会回到 H.264 这条更宽阔的道路。

生产环境里，建议同时准备：

- H.265 或高码率 H.264 主码流，用于桌面与新浏览器环境。
- H.264 子码流，用于兼容回退与弱网络场景。

## 为什么依然没有选择 FFmpeg

FFmpeg 当然强大。它像视频世界里一座恢弘的图书馆，几乎什么格式都能找到答案。

但这个项目追求的，不是把所有视频能力搬进安装包，而是为 RTSP 摄像头播放找到一条轻巧、清晰、可嵌入的路径。

如果为了一路 RTSP 画面引入完整 FFmpeg，随之而来的会是更大的体积、更复杂的授权考量、更多进程细节，以及跨平台分发中不必要的重量。对许多业务团队来说，他们真正需要的不是一套媒体帝国，而是一块可以自然出现在页面里的摄像头画面。

所以 RTSP Player 的 Go 核心保持了非常克制的边界：

- Go 端核心链路不依赖第三方库。
- RTSP 拉流、RTP/H.264、RTP/H.265、WebSocket 输出由项目原生实现。
- WebRTC 模块作为可选能力，引入 Pion 这一条标准而成熟的道路。
- 不做转码，不做软件解码，不把问题交给庞大的外部进程。

这种选择让安装包更轻，让链路更短，也让运行时的行为更容易被理解和掌控。

## 那些曲折，藏在最终的安静里

一开始，Native Messaging 看起来像天然通道。Chrome 官方允许扩展启动本地 Host，也允许通过标准输入输出交换 JSON 消息。可视频帧不是普通消息，它们持续、密集、二进制，对时间格外敏感。

于是 Native Messaging 最终只承担启动和控制。真正的视频数据，走本机 \`127.0.0.1\` 上的 WebSocket 或 WebRTC。控制面保持官方、安全、可管理；数据面则获得足够舒展的空间。

后来，Go Native Host 的生命周期也经历过反复。Chrome 的 \`sendNativeMessage\` 更适合一次请求与一次回应，如果本地 Host 长时间停留，浏览器侧就可能陷入等待。最后的结构变成了短进程 Host 唤起常驻 Gateway daemon，分工清楚，行为也更可预期。

再后来，是安装体验。

普通用户不应该被迫理解 Native Messaging manifest、扩展 ID、二进制路径和系统权限。于是项目做了 macOS、Windows、Linux 三端图形安装入口：macOS 打开 DMG 运行 \`RTSP Installer.app\`，Windows 解压后运行 \`RTSP Installer.hta\`，Linux 提供 \`.desktop\` 与 \`install-gui.sh\`。安装器按系统语言显示中文或英文，复制 Runtime，准备扩展目录，注册 Native Host，并打开 Chrome 扩展页。

这些曲折最后并不会出现在用户眼前。用户只会看到一个简洁的安装助手，以及一块开始流动的视频画面。

## 真实画面，不是想象中的演示

下面这张图来自公开 RTSP 源的真实端到端验证。页面收到播放器 ready 事件，解码器进入可用状态，H.264 画面被浏览器解码后绘制出来。

![公开 RTSP 源真实播放截图](../assets/public-rtsp-e2e.png)

验证中可以看到：

- H.264 codec 为 \`avc1.4D401E\`。
- 画面约 30 fps。
- 播放队列保持在 0 附近。
- Canvas 获得真实视频帧，而不是静态占位图。
- 当前公开源验证了 H.264 链路，H.265 建议使用自有摄像头或 NVR 做平台能力验收。

流畅度的秘密并不玄妙。它来自每一层的节制：RTSP 使用 TCP interleaved，避免复杂网络中的 UDP 不确定性；WebRTC 优先转发 RTP，不做转码；WebSocket 回退输出二进制 Annex-B，减少文本膨胀；WebCodecs 请求硬件优先；播放队列不让旧帧无止境堆积。

当系统不再把时间消耗在不必要的搬运和包装上，画面自然会轻盈许多。

## 一眼看见能做什么

如果你正在做下面这些系统，RTSP Player 很可能正好落在需求中央：

- 门店、仓库、园区、工厂的实时预览。
- NVR 管理台和设备运维后台。
- AI 标注平台、算法调试台和边缘设备控制台。
- 物业、安防、巡检、生产现场的大屏页面。
- SaaS 平台中需要访问客户本地摄像头的业务页面。
- React、Vue 前端工程中的多画面卡片、弹窗预览和详情页。
- Electron / Tauri 桌面监控台与离线交付工具。
- 小米、米家摄像头通过 miiot/micam 桥接为 RTSP 后进入统一播放页面。

对小米摄像头，最新文档已经改为推荐使用 [miiot/micam](https://github.com/miiot/micam) 做本地桥接。它通过 Miloco、go2rtc 和 micam，把摄像头画面转推为局域网 RTSP，例如：

\`\`\`txt
rtsp://桥接主机IP:8554/mi_camera_1
\`\`\`

随后就可以直接交给 RTSP Player：

\`\`\`html
<rtsp-player
  runtime="auto"
  transport="auto"
  codec="auto"
  url="rtsp://192.168.31.10:8554/mi_camera_1"
  autoplay
  controls>
</rtsp-player>
\`\`\`

## 它现在已经覆盖的能力

为了让读者快速判断是否适合自己的项目，这里把当前能力放在一起。

已经支持：

- Chrome MV3 扩展接入。
- \`<rtsp-player>\` Web Component。
- 独立 JS SDK。
- React 组件。
- Vue 组件。
- Electron 桌面打包方案。
- Tauri v2 sidecar 桌面打包方案。
- 三端图形安装器。
- RTSP over TCP interleaved。
- RTSP Basic / Digest 鉴权。
- H.264 SDP 与 RTP depay。
- H.265 SDP 与 RTP metadata。
- WebRTC-first 传输。
- Pion WebRTC 可选模块。
- WebSocket Annex-B 回退。
- WebCodecs 硬件优先解码。
- Canvas 渲染。
- 播放状态、fps、queue 统计。
- 本地 Gateway 只监听 \`127.0.0.1\`。
- Native Host secret、一次性 stream token、origin 授权。

当前边界：

- 不做转码。
- 不做软件解码。
- 暂不包含音频。
- UDP RTP 不是当前优先路径。
- H.265 依赖浏览器、系统和硬件能力，需要实际设备验证。

这些边界并不是退让，而是有意为之。项目希望把“播放 RTSP 摄像头”这件事做得轻盈、透明、可维护，而不是把所有视频平台能力一股脑塞进来。

## 免费使用，源码与更新自助开通

RTSP Player 会保持完全免费使用。你可以把它用于学习、验证、内网试点和业务集成。

如果你希望获得全部源码、私有源码仓库权限和后续永久更新，任意捐赠即可自助开通。支持后即可进入仓库，后续 WebRTC、桌面应用、安装器、文档与兼容性改进都会持续同步，省心，也坦然。

项目主页与在线 Demo：

[https://rtsp.flyfish.dev](https://rtsp.flyfish.dev)

公开仓库与安装包 Release：

[https://github.com/flyfish-dev/rtsp](https://github.com/flyfish-dev/rtsp)

小米 / 米家 micam 桥接教程：

[https://rtsp.flyfish.dev/docs/xiaomi-rtsp.md](https://rtsp.flyfish.dev/docs/xiaomi-rtsp.md)

| 客服联系 | 微信打赏 | 支付宝打赏 | 公众号 |
| --- | --- | --- | --- |
| ![客服联系](../assets/contact.jpg) | ![微信打赏](../assets/donate-wx.jpg) | ![支付宝打赏](../assets/donate-alipay.jpg) | ![公众号](../assets/mp.png) |

## 写在最后

许多工程难题，并不缺少宏大的答案。它们缺少的是恰到好处的答案。

RTSP Player 想做的，就是让一条摄像头画面从现场走进浏览器时，不必穿过漫长的云端转发，不必拖着沉重的转码进程，也不必回到旧式插件的年代。

它让业务页面重新变得清爽，让桌面应用获得原生交付的自由，让摄像头视频以一种现代、轻巧、可掌控的方式出现在用户眼前。

当画面终于在浏览器里自然展开，背后的协议、分片、鉴权、参数集、WebRTC 协商和解码队列都安静退场。

用户看到的是画面。  
开发者留下的是余裕。  
而这，正是一件好工具最动人的地方。
`,Mn=`---
title: "终于，可以把 RTSP 摄像头优雅地放进浏览器了"
author: "flyfish-dev"
description: "一个免费 RTSP Player 的诞生：Chrome 扩展、本地 Go 网关、WebCodecs，以及一套可直接用于 JS、Vue、React 的播放组件。"
cover: "../assets/rtsp-player-wechat-cover.png"
---

# 终于，可以把 RTSP 摄像头优雅地放进浏览器了

![RTSP Player 封面图](../assets/rtsp-player-wechat-cover.png)

有些需求，看起来只是“在网页里播放一路摄像头”。

真正落到项目里，才发现它像一条暗河，绕过浏览器、网络协议、视频封装、权限边界和跨平台安装，最后还要在用户面前呈现为一个安静的播放器：打开页面，画面出现，帧率自然，延迟轻盈，业务系统不必知道背后有多少水流奔涌。

这就是 **RTSP Player** 想解决的问题。

它不是一个把视频推到云端再转回来的中转系统，也不是让前端工程背上一整套媒体服务器。它把摄像头和 NVR 中最常见的 **H.264 RTSP** 拉到本机，在 Chrome 里以组件形式播放，并提供两种可以直接落地的接入方式：Chrome 扩展方案，以及 JS / Vue / React 通用组件方案。

项目完全免费使用。若你希望获得全部源码以及后续永久仓库更新，任意捐赠即可自助开通；没有固定门槛，也不需要漫长沟通，愿意支持多少，都可以从容开始。

## 为什么这件事一直让人头疼

RTSP 在摄像头、NVR、门店监控、园区管理、工业现场里太常见了。

但浏览器天生并不认识 RTSP。它不会直接打开 \`rtsp://\`，也不能随意连一条 TCP 长连接去收 RTP 包。于是许多团队在网页播放摄像头时，常常会被迫走向几条并不轻松的路：

把 RTSP 转成 HLS，延迟一下子被拉长；搭建 WebRTC 服务，链路和运维随之变重；引入 FFmpeg，在安装包、授权、进程、跨平台和资源占用之间反复权衡；继续依赖旧插件或私有控件，又很难适应今天的浏览器环境。

市场中真正空缺的，是这样一种形态：页面依旧像写普通组件一样写播放器，本机负责靠近摄像头的协议转换，浏览器负责最终解码与绘制；不绕远路，不把内网视频送去别处，也不让业务系统背负沉重的媒体基础设施。

RTSP Player 便是沿着这个空缺生长出来的。

## 它现在长什么样

页面中只需要一行标签：

\`\`\`html
<rtsp-player
  url="rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101"
  width="960"
  height="540"
  autoplay
  controls>
</rtsp-player>
\`\`\`

也可以在 React 中这样使用：

\`\`\`jsx
<RtspPlayer
  extensionId="你的扩展 ID"
  url="rtsp://user:pass@camera/stream"
  autoplay
  controls
/>
\`\`\`

Vue、原生 JS、Web Component、独立浏览器脚本都已经准备好。对业务系统来说，它不必理解 RTSP、RTP、H.264 分片，也不必关心 Native Messaging 如何启动本地程序；它只需要声明一个播放器，并给它一个地址。

## 两条交付路径，给不同团队选择

第一条路径，是 **Chrome 扩展方案**。

它适合企业内网、NVR 管理台、SaaS 控制台、门店和园区类系统。业务页面只放 \`<rtsp-player>\`，Chrome 扩展负责注入播放器、打开 iframe、唤起本地 Runtime，并通过弹窗管理允许访问的业务域名。

第二条路径，是 **通用组件 SDK**。

它适合已有前端工程显式接入。你可以在 plain HTML 里使用预构建脚本，也可以在 React 和 Vue 里像普通组件一样引入。SDK 内置了与扩展通信所需的封装，便于在实际业务界面里做列表、卡片、九宫格、弹窗预览和大屏展示。

换句话说，它既能进入一个由管理员统一安装扩展的内网系统，也能进入一个由前端团队精细组织的现代工程。

## 真实播放，不是概念图

下面这张图来自公开 RTSP 地址的完整联调。链路经过业务页面、Chrome 扩展、Native Messaging、本地 Go Gateway、RTSP over TCP、RTP/H.264 解析、WebSocket、WebCodecs，最后由 Canvas 渲染。

![公开 RTSP 源真实浏览器播放截图](../assets/public-rtsp-e2e.png)

验证时观察到的结果包括：

- 解码器进入 ready 状态。
- H.264 codec 为 \`avc1.4D401E\`。
- 画面约 30 fps。
- 播放队列保持在 0 附近。
- 视频帧由浏览器 WebCodecs 解码后绘制到 Canvas。

这意味着它不是停留在“协议打通”的阶段，而是已经穿过了真实视频播放最关键的路径：摄像头流进来，浏览器画面出来。

## 最难的部分，不是写一个播放器界面

播放器界面并不复杂，真正艰难的是让浏览器吃到一口正确的视频。

RTSP 过来的并不是浏览器可以直接播放的 MP4，也不是一个现成的 \`<video>\` 标签地址。摄像头会把 H.264 切成 RTP 包，有时是一颗完整 NALU，有时是多个 NALU 打包在一起，有时一个关键帧被切成许多片段。播放器必须理解 Single NALU、STAP-A、FU-A，重新拼出可以解码的 H.264 Access Unit。

还不止如此。

H.264 的关键帧需要 SPS/PPS 这些参数集，WebCodecs 在 Annex-B 模式下并不需要额外的 \`description\`，但 key chunk 必须携带解码所需的信息。于是 Go 端会缓存 SPS/PPS，并在 IDR 前自动补齐，让浏览器拿到一份完整而清晰的画面入口。

这一层如果处理得不细，结果往往不是黑屏，就是第一帧迟迟不来，或者画面在某些摄像头上才出现异常。

## 为什么没有选择 FFmpeg

FFmpeg 是强大的，甚至可以说是视频世界的群山之一。最开始，使用 FFmpeg 确实是最容易想到的答案。

但这个项目追求的是另一种质地：体积轻、链路短、依赖少、安装清楚、便于放进产品。为了播放一路 H.264 RTSP，如果引入完整 FFmpeg，随之而来的会是更大的分发包、更多进程管理细节、跨平台差异，以及业务团队未必愿意承受的复杂度。

也曾认真看过 gortsplib / MediaMTX 这一类成熟项目。它们方向可靠，能力丰厚。但当前目标并不是搭建完整媒体服务器，而是完成“拉一路 H.264 RTSP，并把它变成浏览器可以低延迟解码的二进制帧”。

最后选择了 Go 原生最小协议栈：只实现必要路径，不把系统带入不必要的庞大迷宫。

## Native Messaging 只做控制，视频走 WebSocket

Chrome Native Messaging 是官方通道，可以让扩展启动本地 Host，并通过 stdin/stdout 交换带长度前缀的 JSON 消息。

但视频帧不是温柔的小消息。它们持续、密集、二进制、对延迟敏感。如果把每一帧都塞进 Native Messaging 的 JSON 通道，性能和单消息大小都会成为枷锁。

因此 RTSP Player 做了一个清晰分工：

Native Messaging 只负责启动和控制；真正的视频帧，通过本机 \`127.0.0.1\` 上随机端口的 WebSocket 传输。

这让控制面保持官方、安全、可管；让数据面保持轻盈、二进制、低开销。浏览器最终拿到的是 Annex-B H.264 access unit，再交给 WebCodecs \`VideoDecoder\`，请求硬件优先解码，之后绘制到 Canvas。

## 为流畅度做的那些细节

画面是否顺滑，往往不取决于一句“用了硬解”，而取决于每一层是否少做无谓的事情。

RTSP Player 在这条路上做了几件关键选择：

- RTSP 使用 TCP interleaved，避免浏览器侧和复杂网络环境中的 UDP 不确定性。
- Go Gateway 输出二进制 WebSocket 帧，减少 JSON 编解码和文本膨胀。
- H.264 access unit 在本地整理好，再交给浏览器，不让前端猜测分片边界。
- WebCodecs 使用 \`hardwareAcceleration: "prefer-hardware"\`，优先调用浏览器已有的解码能力。
- 播放队列采用低延迟策略，旧帧不被无限堆积，画面尽量贴近实时。
- Canvas 负责最终渲染，便于在业务页面中做自定义 UI、统计信息和播放器状态。

这也是为什么真实测试里可以看到约 30 fps、队列接近 0 的表现。它不是靠堆硬件换来的，而是把每一段不必要的迂回都尽量拿掉。

## 当前已经覆盖的能力

如果你正在评估它是否适合自己的项目，可以先看这一组边界。

已经支持：

- H.264 RTSP 视频流。
- RTSP over TCP interleaved。
- RTSP Basic / Digest 鉴权。
- SDP 中 H.264 track 解析。
- RTP/H.264 Single NALU、STAP-A、FU-A。
- SPS/PPS 缓存与 IDR 前补齐。
- Annex-B H.264 access unit 输出。
- 本地 WebSocket 二进制传输。
- Chrome MV3 扩展。
- \`<rtsp-player>\` 网页组件。
- JS / React / Vue SDK。
- WebCodecs 硬件优先解码。
- Canvas 渲染。
- 播放状态、fps、queue 统计。
- \`ready\`、\`error\` 等组件事件。
- macOS、Linux、Windows 构建与 Native Host 注册脚本。

暂未包含：

- 音频。
- H.265 / HEVC。
- UDP RTP。
- FFmpeg 转码。
- Node 网关。

如果你的摄像头当前是 H.265，建议在 NVR 或摄像头后台把主码流或子码流切到 H.264。对大多数监控与工业摄像头而言，这是最容易获得兼容性的路径。

## 安全边界从一开始就被放在桌面上

视频是敏感数据，尤其是内网摄像头。这个项目没有把“能播放”放在安全之前。

它默认让 Gateway 只监听 \`127.0.0.1\`；Native Host 使用随机 secret 调用本地 API；每一路流都有一次性 token；WebSocket 会校验 \`chrome-extension://\` 来源；RTSP 地址不会被塞进 iframe query string；日志里会遮蔽用户名和密码；业务网页 origin 需要在扩展弹窗中授权。

生产环境中，还建议把扩展 \`manifest.json\` 里的 content script matches 从开发期的宽泛匹配收窄到你的业务域名。让播放器出现在哪里，应当由你决定，而不是由任何网页决定。

## 它能够支撑哪些场景

如果你做过这些系统，大概一眼就能明白它的价值：

- 门店、仓库、园区、工厂的摄像头预览。
- NVR 管理台和设备管理后台。
- AI 标注、算法调试、边缘设备控制台。
- 物业、安防、巡检、生产现场的内网大屏。
- SaaS 平台里需要嵌入客户本地摄像头的页面。
- 前端系统需要用 Vue、React 组件直接拼出多画面布局的场景。

它并不试图替代大型视频平台。它更像一把优雅的钥匙：当你的需求只是“把现有 RTSP 摄像头放进网页”，你不必为了开一扇门去建一座城。

## 那些绕路，也是它的一部分

这个项目并不是一次笔直的抵达。

Native Messaging 一开始看起来像天然通道，但它更适合控制，而不是视频洪流。于是视频被移到本地 WebSocket。

Go Native Host 最初如果作为长进程停留，会让 Chrome 的 \`sendNativeMessage\` 等不到应有的结束。于是它被调整为一次消息、一份回应、随即退出；真正需要常驻的是本地 Gateway daemon。

macOS 对用户文档目录有保护机制，如果让 Chrome 从某些位置直接启动 native host，可能出现令人困惑的等待。安装脚本因此改为把二进制放到 \`~/Library/Application Support/rtsp-web-player/\`，再写入 Native Messaging manifest。

这些细节不浪漫，却决定了一个方案能不能在别人电脑上被安心使用。

## 免费使用，任意捐赠

RTSP Player 会保持完全免费使用。你可以把它用于学习、验证、内网试点和业务集成。

如果你希望获得全部源码、完整仓库权限和后续永久更新，可以通过任意捐赠自助开通。没有固定金额，没有复杂流程，支持之后即可进入仓库，后续更新也会持续跟随，省去反复沟通和等待。

项目地址：

[https://github.com/flyfish-dev/rtsp](https://github.com/flyfish-dev/rtsp)

主页与文档：

[https://rtsp.flyfish.dev](https://rtsp.flyfish.dev)

## 写在最后

很多工程问题并不缺少庞大的答案，缺少的是刚好合适的答案。

RTSP Player 想做的，就是把摄像头播放这件事从沉重的部署、古老的插件和迟缓的转码中带出来，放回一个现代网页该有的样子：组件化、可嵌入、可授权、可本地运行，也足够安静。

当一条 RTSP 流终于在浏览器里自然呈现，背后那些复杂的协议、分片、鉴权、参数集和解码队列，都退到帷幕后面。

用户看到的，只是一块画面。

而开发者终于可以把注意力，重新交还给自己的业务。
`,On=`# Chrome Runtime Extension

The Chrome extension path is the recommended deployment model for controlled
business pages, intranet dashboards, NVR consoles, and SaaS products that can
ask users to install a runtime extension.

## What It Provides

- MV3 Chrome extension.
- Content script that mounts \`<rtsp-player>\` on allowed web pages.
- Extension-owned iframe player page.
- Service worker that talks to the native host.
- Popup for Native Runtime health checks, allowed origins, logs, diagnostics,
  and one-click Gateway restart.
- WebRTC-first player with WebSocket/WebCodecs fallback and low-latency queue management.

## Build

\`\`\`bash
./scripts/build.sh
\`\`\`

macOS output:

\`\`\`txt
dist/rtsp-web-native-darwin-arm64
\`\`\`

Windows output:

\`\`\`powershell
./scripts/build.ps1
\`\`\`

## Load the Extension

1. Open \`chrome://extensions\`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository \`extension/\` directory.
5. The extension ID is fixed by \`manifest.json\`:

\`\`\`txt
giegomfhcmgebjhdiihnjohoinkbcjbh
\`\`\`

## Register the Native Host

macOS:

\`\`\`bash
./scripts/install-host.sh giegomfhcmgebjhdiihnjohoinkbcjbh ./dist/rtsp-web-native-darwin-arm64
\`\`\`

Linux:

\`\`\`bash
./scripts/install-host.sh giegomfhcmgebjhdiihnjohoinkbcjbh ./dist/rtsp-web-native-linux-amd64
\`\`\`

Windows:

\`\`\`powershell
./scripts/install-host.ps1 \`
  -ExtensionId giegomfhcmgebjhdiihnjohoinkbcjbh \`
  -BinaryPath .\\dist\\rtsp-web-native-windows-amd64.exe
\`\`\`

On macOS the installer copies the binary to:

\`\`\`txt
~/Library/Application Support/rtsp-web-player/rtsp-web-native
\`\`\`

This is the recommended runtime location for the packaged installer.

## Authorize Page Origins

Open the extension popup and add your app origin:

\`\`\`txt
http://localhost:5173
https://your-app.example.com
\`\`\`

Use \`*\` only for local debugging. Production deployments should list exact
origins.

## Logs and Diagnostics

When a customer reports that VLC can play the RTSP source but the web player
cannot, open the extension popup and use **日志与诊断**:

- **刷新日志** reads extension logs and Native Gateway logs.
- **复制日志** copies a support-ready diagnostic bundle.
- **清空日志** resets local logs before reproducing a problem.
- **重启 Native** stops the current Gateway and starts the installed runtime
  again.

The diagnostic bundle includes RTSP OPTIONS/DESCRIBE/SETUP/PLAY status, selected
video track, WebRTC offer results, WebSocket fallback state, decoder errors,
Gateway PID/port/version, and redacted URLs.

## Page Usage

When the extension content script is enabled for your site, the page only needs:

\`\`\`html
<rtsp-player
  url="rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101"
  width="960"
  height="540"
  transport="auto"
  codec="auto"
  autoplay
  controls></rtsp-player>
\`\`\`

Events:

\`\`\`js
const player = document.querySelector("rtsp-player");

player.addEventListener("ready", () => {
  console.log("RTSP ready");
});

player.addEventListener("error", (event) => {
  console.error(event.detail.error);
});
\`\`\`

## Production Hardening

\`transport="auto"\` is the recommended default. It attempts WebRTC first for
H.264/H.265 and falls back to \`ws-annexb\` if negotiation fails or no video
track arrives quickly.

Before shipping, change \`extension/manifest.json\` content script matches from
the broad development defaults to your own business domains.

\`\`\`json
{
  "content_scripts": [
    {
      "matches": ["https://your-app.example.com/*"],
      "js": ["content/rtsp-component.js"]
    }
  ]
}
\`\`\`

For enterprise rollout, publish the fixed-ID extension through Chrome Web Store
or Chrome Enterprise policy, then install the native host manifest with the same
extension ID.
`,Hn=`# Deployment

## GitHub

The repository is intended to be published as \`rtsp\`.

Recommended release assets:

- Chrome extension directory or packaged CRX.
- Native runtime binaries for macOS, Linux, and Windows.
- One-click installers from \`release/installers/\`, including the macOS graphical DMG.
- SDK package from \`packages/rtsp-sdk\`.
- Documentation site from \`site/\`.

## Vercel Site

The project includes a Vite-powered documentation site:

\`\`\`txt
site/
\`\`\`

Vercel configuration:

\`\`\`json
{
  "buildCommand": "npm run build",
  "outputDirectory": "site/dist",
  "installCommand": "npm install",
  "framework": "vite"
}
\`\`\`

Local build:

\`\`\`bash
npm install
npm run build
\`\`\`

Production deployment:

\`\`\`bash
vercel deploy --prod
\`\`\`

The official domain \`rtsp.flyfish.dev\` is attached to the Vercel project named
\`rtsp\`. Deploy the already-built static site as a prebuilt static output so the
project's legacy install/build settings are bypassed:

\`\`\`bash
npm run build:site
rm -rf /tmp/rtsp-vercel-prebuilt
mkdir -p /tmp/rtsp-vercel-prebuilt/.vercel/output/static
rsync -a site/dist/ /tmp/rtsp-vercel-prebuilt/.vercel/output/static/
printf '{"version":3}\\n' > /tmp/rtsp-vercel-prebuilt/.vercel/output/config.json
vercel deploy /tmp/rtsp-vercel-prebuilt --prebuilt --prod --yes --project rtsp
\`\`\`

The legacy Vercel demo alias is still updated from the static directory:

\`\`\`bash
vercel deploy site/dist --prod --yes
vercel alias set <deployment-url> rtsp-roan.vercel.app
\`\`\`

## Public Artifact Repository

The public repository \`flyfish-dev/rtsp\` contains built artifacts only. Every
public update must also create a GitHub Release with installer assets.

Recommended command:

\`\`\`bash
npm run release:public
\`\`\`

The script force-publishes the artifact repository, creates a timestamped tag,
and attaches:

- \`rtsp-macos-installer.dmg\`
- \`rtsp-macos-installer.zip\`
- \`rtsp-windows-installer.zip\`
- \`rtsp-linux-installer.tar.gz\`

Use \`PUBLIC_RELEASE_TAG\` to pin the release tag:

\`\`\`bash
PUBLIC_RELEASE_TAG=v0.1.2-20260526 npm run release:public
\`\`\`

## Native Runtime Distribution

Build the native runtime:

\`\`\`bash
./scripts/build.sh
\`\`\`

Cross-build examples:

\`\`\`bash
GOOS=linux GOARCH=amd64 ./scripts/build.sh
GOOS=darwin GOARCH=arm64 ./scripts/build.sh
GOOS=windows GOARCH=amd64 ./scripts/build.sh
\`\`\`

## Versioning

Keep these versions aligned:

- \`extension/manifest.json\`
- \`packages/rtsp-sdk/package.json\`
- \`native/cmd/rtsp-web-native/main.go\`
- Docs site release notes
`,Nn=`# Electron / Tauri 免插件桌面方案

桌面方案把 Go runtime 作为应用 sidecar 打包进 Electron 或 Tauri。应用进程负责启动 \`127.0.0.1\` 本地 gateway，渲染层使用同一个 \`<rtsp-player>\`，不需要安装 Chrome 扩展或 Native Messaging Host。

## 默认链路

\`\`\`txt
Electron/Tauri UI
  ↓ window.rtspNative / Tauri invoke
Go sidecar gateway
  ↓ RTSP over TCP interleaved
Camera / NVR
  ↓ RTP passthrough
WebRTC PeerConnection
  ↓ browser/system hardware decoder
Canvas render
\`\`\`

默认使用 \`transport="auto"\`，播放器会优先尝试 WebRTC。WebRTC 协商失败、2.6 秒内没有视频 track、或系统 WebView 不支持当前 codec 时，自动回退到 \`ws-annexb\` + WebCodecs。

## Electron

目录：\`apps/electron\`

\`\`\`bash
npm run build:sdk
./scripts/build.sh
cd apps/electron
npm install
npm run start
\`\`\`

Electron 主进程会：

- 查找 \`dist/rtsp-web-native-<os>-<arch>\`。
- 以 \`--gateway\` 启动 Go sidecar。
- 通过 IPC 暴露 \`startStream\`、\`createWebRTCOffer\`、\`health\`。
- renderer 只拿一次性 stream token 或 WebRTC answer。

打包：

\`\`\`bash
cd apps/electron
npm run make
\`\`\`

macOS 可通过 \`RTSP_MAC_SIGN=1\`、\`APPLE_ID\`、\`APPLE_APP_SPECIFIC_PASSWORD\`、\`APPLE_TEAM_ID\` 接入 Electron Forge 的签名和公证。

## Tauri

目录：\`apps/tauri\`

\`\`\`bash
npm run build:sdk
./scripts/build.sh
npm run build:desktop
cd apps/tauri
npm install
npm run dev
\`\`\`

Tauri v2 使用 \`bundle.externalBin\` 打包 sidecar。\`npm run build:desktop\` 会把 \`dist/\` 里的 Go 二进制复制成 Tauri 需要的 target triple 命名。

Tauri command：

- \`gateway_health\`
- \`start_stream\`
- \`create_webrtc_offer\`
- \`stop_stream\`

## 平台差异

- Electron 跟随内置 Chromium，WebRTC/H.265 能力取决于 Electron 对应 Chromium 版本、系统 codec 和硬件。
- Tauri 跟随系统 WebView：Windows 是 WebView2，macOS 是 WKWebView，Linux 是 WebKitGTK。
- H.265 不做转码；如果 WebRTC/H.265 不可用，请把摄像头切到 H.264 或使用 \`codec="h264"\`。

## 组件用法

\`\`\`html
<rtsp-player
  runtime="desktop"
  transport="auto"
  codec="auto"
  url="rtsp://user:pass@camera/stream"
  autoplay
  controls>
</rtsp-player>
\`\`\`

React/Vue 同步支持 \`runtime\`、\`transport\`、\`rtspTransport\`、\`mediaTransport\`、\`codec\`。
`,Wn=`# 一键安装器

在线安装助手：

\`\`\`txt
https://rtsp.flyfish.dev/#demo
\`\`\`

安装助手会检测 Chrome 扩展、Native Runtime 和当前站点授权状态，并推荐当前系统的图形安装器。

固定 Chrome 扩展 ID：

\`\`\`txt
giegomfhcmgebjhdiihnjohoinkbcjbh
\`\`\`

## 下载

\`\`\`txt
https://rtsp.flyfish.dev/downloads/rtsp-macos-installer.dmg
https://rtsp.flyfish.dev/downloads/rtsp-macos-installer.zip
https://rtsp.flyfish.dev/downloads/rtsp-windows-installer.zip
https://rtsp.flyfish.dev/downloads/rtsp-linux-installer.tar.gz
\`\`\`

## 安装流程

### macOS

1. 打开 \`rtsp-macos-installer.dmg\`。
2. 双击 \`RTSP Installer.app\`。
3. 安装完成后，在 Chrome 扩展页开启 Developer mode。
4. 点击 Load unpacked，选择安装器打开的 extension 目录。
5. 回到在线 Demo，点击重新检测。

如果系统拦截首次启动，请右键 \`RTSP Installer.app\`，选择打开。

### Windows

1. 解压 \`rtsp-windows-installer.zip\`。
2. 打开 \`RTSP Installer.hta\`。
3. 安装完成后，在 Chrome 扩展页开启 Developer mode。
4. 点击 Load unpacked，选择安装器准备好的 extension 目录。
5. 回到在线 Demo，点击重新检测。

如果 Windows 阻止 HTA 文件，请运行 \`install.bat\` 作为备用入口。

### Linux

1. 解压 \`rtsp-linux-installer.tar.gz\`。
2. 打开 \`RTSP Installer.desktop\`，或运行 \`./install-gui.sh\`。
3. 安装完成后，在 Chrome 扩展页开启 Developer mode。
4. 点击 Load unpacked，选择安装器准备好的 extension 目录。
5. 回到在线 Demo，点击重新检测。

如果桌面环境阻止 launcher 文件，请运行 \`./install.sh\` 作为备用入口。

## 安装器会做什么

- 复制本地 RTSP Runtime。
- 准备 Chrome 扩展目录。
- 注册 Native Messaging Host。
- 打开 Chrome 扩展页。
- 将 extension 目录复制到剪贴板，或显示在完成提示中。

Chrome 仍要求用户点击 Load unpacked，这是浏览器安全限制。

## 企业分发

企业环境可以通过 Chrome Enterprise policy 预装扩展，并提前写入 Native Messaging Host manifest。这样终端用户打开页面时会直接进入“已就绪”状态。
`,Bn=`# 多路播放与生命周期

支持多路同时播放。每一个 \`<rtsp-player>\` 实例都会拥有独立的 \`streamId\`、媒体连接、解码器和清理流程，生命周期如下：

\`\`\`txt
created -> connecting -> playing -> stopping -> stopped
                         -> error
\`\`\`

## 多路模型

每次播放请求都会在本地 Go gateway 中创建一个唯一 \`streamId\`：

- Chrome 扩展模式：每个 iframe 播放器都有自己的 \`streamId\`、WebRTC PeerConnection 或 WebSocket、解码器、Canvas 和 RTSP client。
- Electron / Tauri 桌面模式：使用同一套 gateway API，也会拿到独立 \`streamId\`。
- Gateway 状态拆成 \`pendingStreams\` 和 \`activeStreams\`，单路失败、停止或重试不会影响其他正在播放的路。

实际上限取决于摄像头码率、CPU/GPU 解码能力、浏览器标签页调度和网络带宽。生产看板建议使用摄像头的 H.264/H.265 硬解友好档位，并按画面 tile 的实际尺寸选择主码流或子码流。

## 生命周期保证

runtime 会对每路流做显式清理：

- \`startStream\` 创建 pending session，并生成一次性 \`streamToken\`。
- WebSocket 播放会在媒体 socket 连接时 claim 这条 session。
- WebRTC 播放会在 offer 创建时 claim 这条 session。
- \`stopStream\` 会取消对应 RTSP 拉流，关闭 WebRTC / WebSocket 媒体路径，并删除 gateway 状态。
- 浏览器侧 \`stop()\` 会关闭 decoder、PeerConnection、media element、WebSocket，然后通知 Native 停止这一路流。
- 播放器断开、WebRTC 协商失败、WebSocket 关闭都会移除 active stream 记录。
- 扩展 popup 和 Native diagnostics 会同时展示 \`pendingStreams\` 与 \`activeStreams\`。

## 推荐用法

\`\`\`html
<rtsp-player id="cam-a" url="rtsp://camera-a/stream" autoplay></rtsp-player>
<rtsp-player id="cam-b" url="rtsp://camera-b/stream" autoplay></rtsp-player>
\`\`\`

\`\`\`js
const a = document.querySelector("#cam-a");
const b = document.querySelector("#cam-b");

await a.play();
await b.play();

// 停止一路，不影响另一路。
a.stop();
\`\`\`

## 验证结论

当前版本已用本机 H.264/AAC 720p RTSP 源完成 4 路并发实测：

\`\`\`txt
activeStreams = 4
每路均收到 H.264 Annex-B 二进制帧
逐路 stopStream 后 pendingStreams = 0, activeStreams = 0
\`\`\`

## 运行建议

- 每个摄像头 tile 使用一个组件实例。
- 切换某个 tile 的摄像头时复用同一个元素；设置新 \`url\` 并调用 \`play()\` 会先停止旧流。
- 不要创建隐藏的 autoplay 大屏。浏览器调度、GPU 和摄像头连接数都不是无限资源。
- 排障时先看扩展 popup 的日志和 diagnostics：停止后 \`pendingStreams\` 应回到 \`0\`，\`activeStreams\` 应等于当前正在播放的 tile 数。
`,zn=`# 在线 Demo

在线体验入口：

\`\`\`txt
https://rtsp.flyfish.dev/#demo
\`\`\`

## 两种体验模式

页面会自动检测本机是否已经安装 RTSP Chrome 扩展、Native Runtime，以及当前站点是否已在扩展 popup 中授权。如果检测不完整，会自动弹出安装助手并推荐当前系统的安装包。
真实 RTSP 播放默认 WebRTC first；如果浏览器、系统或 codec 不满足条件，会自动回退 WebSocket + WebCodecs。

### 1. 无安装预览

页面左侧的 Canvas 预览不连接摄像头，用于快速体验播放器布局、状态统计、暂停/继续和低延迟监控画面效果。它可以直接在任意现代浏览器中打开。

### 2. 真实 RTSP 播放

页面右侧的真实体验台会动态挂载扩展播放器 iframe。使用前需要完成：

1. 加载 \`release/chrome-extension/unpacked\` Chrome 扩展。
2. 注册对应系统的 Native Host。
3. 在扩展 popup 中授权当前站点 origin：

\`\`\`txt
https://rtsp.flyfish.dev
\`\`\`

4. 在体验台中填写 RTSP URL。扩展 ID 默认固定为 \`giegomfhcmgebjhdiihnjohoinkbcjbh\`。
5. 点击“启动真实播放”。

更顺滑的方式是直接使用安装包：

- \`release/installers/rtsp-macos-installer.dmg\`
- \`release/installers/rtsp-macos-installer.zip\`
- \`release/installers/rtsp-windows-installer.zip\`
- \`release/installers/rtsp-linux-installer.tar.gz\`

安装包都提供图形入口，并会根据系统语言显示中文或英文。安装器会准备 runtime、复制扩展目录、按固定扩展 ID 注册 Native Host，并打开 Chrome 扩展页。

## 可用公开测试流

如果只是验证链路，可以使用之前端到端验证过的公开 H.264 RTSP 源：

\`\`\`txt
rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1
\`\`\`

公开源可能受服务方限流、地区网络或临时下线影响。生产验收建议使用自己的摄像头或 NVR，并保留 H.264 子码流作为 WebRTC/H.265 失败时的回退。

## 常见问题

### 页面提示仍在等待扩展响应

通常是下面几类原因：

- 扩展 ID 被旧版本覆盖；新安装器的固定 ID 是 \`giegomfhcmgebjhdiihnjohoinkbcjbh\`。
- 扩展没有加载或被 Chrome 禁用。
- popup 中没有授权 \`https://rtsp.flyfish.dev\`。
- Native Messaging Host 没有注册成功。
- 如果使用过旧安装包，建议下载当前图形安装器重新安装。

### iframe 出现但没有画面

检查 RTSP URL、用户名密码、网络连通性和摄像头编码。推荐先用 H.264 + RTSP over TCP 验证，再切 H.265/WebRTC。

### 想放到自己的文档站

复制主页中的 \`#demo\` section、\`site/src/main.js\` 里的 demo 逻辑和 \`site/src/styles.css\` 中的 demo 样式即可。真实播放部分仍需要 Chrome 扩展与 Native Runtime。
`,qn=`# RTSP Overview

RTSP is a browser and desktop playback runtime for RTSP streams. It ships three
integration paths:

1. **Chrome Runtime Extension**: the extension injects \`<rtsp-player>\` on
   allowed pages and owns the iframe player.
2. **Universal Components SDK**: application teams import a Web Component,
   React component, or Vue component and point it at the installed extension.
3. **Electron/Tauri Desktop**: desktop apps bundle the Go sidecar and play
   without installing a browser extension.

All paths use the same native runtime:

\`\`\`txt
Web page
  -> Chrome extension iframe
  -> Chrome service worker
  -> Native Messaging
  -> Go Native Host
  -> Go Gateway on 127.0.0.1
  -> RTSP over TCP interleaved
  -> WebRTC RTP passthrough first
  -> WebSocket Annex-B + WebCodecs fallback
  -> Canvas
\`\`\`

## Why This Architecture

Browsers cannot open RTSP sockets directly, and Native Messaging is not suitable
for high-volume video frames. RTSP uses Native Messaging only for startup and
control. The default video path uses WebRTC so Chromium/System WebView can use
the platform media pipeline for H.264/H.265. If WebRTC negotiation fails or no
video arrives quickly, the player falls back to a local WebSocket served from
\`127.0.0.1\`.

This keeps the performance-sensitive path binary and low overhead while still
using official Chrome extension APIs for the trust boundary.

## Current Support Matrix

| Area | Status |
| --- | --- |
| Video codec | H.264 baseline, H.265/HEVC capability-gated |
| RTSP transport | TCP interleaved |
| RTSP auth | Basic and Digest |
| Browser decode | WebRTC first, WebCodecs fallback |
| Hardware decode | Requested with \`prefer-hardware\` |
| Audio | Not included |
| H.265/HEVC | WebRTC/WebCodecs when platform supports it |
| UDP RTP | Not included |
| FFmpeg | Not used |
| Node gateway | Not used |

## Public Stream Validation

The project has been validated against a public Wowza RTSP stream:

\`\`\`txt
rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1
\`\`\`

The browser E2E test rendered video through the full extension and native
runtime path, emitted \`RTSP_PLAYER_READY\`, and captured the canvas-backed frame.

![Public RTSP E2E](assets/public-rtsp-e2e.png)
`,jn='# SDK API\n\n## `configureRTSP(options)`\n\nSets global SDK defaults.\n\n```js\nconfigureRTSP({\n  extensionId: "YOUR_CHROME_EXTENSION_ID",\n  tagName: "rtsp-player",\n  runtime: "extension",\n});\n```\n\n| Option | Type | Description |\n| --- | --- | --- |\n| `extensionId` | `string` | Chrome extension ID that exposes `player/player.html`. |\n| `tagName` | `string` | Custom element tag name. Default: `rtsp-player`. |\n| `runtime` | `"extension" \\| "desktop" \\| "auto"` | Runtime bridge. Desktop requires Electron/Tauri exposing `window.rtspNative` or `window.__RTSP_DESKTOP__`. |\n\n## `defineRTSPPlayer(tagName?, options?)`\n\nDefines the Web Component.\n\n```js\ndefineRTSPPlayer();\n```\n\nThe element is safe to call multiple times. If the tag is already registered,\nthe existing constructor is returned.\n\n## `createRTSPPlayer(options)`\n\nCreates and configures a player element.\n\n```js\nconst player = createRTSPPlayer({\n  extensionId: "YOUR_CHROME_EXTENSION_ID",\n  url: "rtsp://camera/stream",\n  width: 960,\n  height: 540,\n  autoplay: true,\n  controls: true,\n  transport: "auto",\n  codec: "auto",\n});\n```\n\n## `updateRTSPPlayer(element, options)`\n\nUpdates attributes on an existing element.\n\n```js\nupdateRTSPPlayer(player, {\n  url: "rtsp://camera/stream2",\n  autoplay: true,\n});\n```\n\n## Element Attributes\n\n| Attribute | Description |\n| --- | --- |\n| `url` | RTSP URL. |\n| `src` | Alias for `url`. |\n| `width` | CSS width or numeric px value. |\n| `height` | CSS height or numeric px value. |\n| `autoplay` | Start after initialization. |\n| `controls` | Keep player controls enabled. |\n| `muted` | Reserved for future audio support. |\n| `runtime` | `extension`, `desktop`, or `auto`. |\n| `transport` | Media transport. Defaults to `auto`, meaning WebRTC first and WebSocket fallback. |\n| `media-transport` | Explicit media transport: `auto`, `webrtc`, or `ws-annexb`. |\n| `rtsp-transport` | RTSP transport. Current native implementation supports `tcp`. |\n| `codec` | `auto`, `h264`, or `h265`. |\n| `extension-id` | Per-element extension ID override. |\n\n## `probeRTSPCapabilities(codec?)`\n\nDetects runtime video capabilities.\n\n```js\nconst caps = await probeRTSPCapabilities("h265");\nconsole.log(caps.h265WebRTC, caps.h265WebCodecs);\n```\n\n## Element Methods\n\n```js\nplayer.play("rtsp://camera/stream");\nplayer.stop();\n```\n\n`stop()` posts a stop message to the iframe. The current player runtime closes\nstreams when the WebSocket is closed; explicit stop is kept as a stable SDK API.\n\n## Global Script API\n\nWhen using `rtsp-player.global.js`, the SDK exposes `window.RTSP`:\n\n```js\nwindow.RTSP.configure({ extensionId: "YOUR_CHROME_EXTENSION_ID" });\nwindow.RTSP.definePlayer();\n\nconst player = window.RTSP.createPlayer({\n  url: "rtsp://camera/stream",\n  autoplay: true,\n});\n```\n',Un=`# Security Model

RTSP intentionally keeps the trust boundary small.

## Local Gateway

- Binds only to \`127.0.0.1\`.
- Uses a random per-gateway secret for HTTP control APIs.
- Uses one-time stream tokens for WebSocket playback sessions.
- Rejects WebSocket origins that do not match the extension iframe origin.

## Native Messaging

Chrome starts the native host and passes one length-prefixed JSON request over
stdio. The native host handles a single message and exits. The long-running
process is the local gateway daemon, not the Native Messaging host process.

This matches \`chrome.runtime.sendNativeMessage\` and avoids callbacks hanging on
an open stdio pipe.

## RTSP URL Handling

- RTSP URLs are never placed in iframe query strings.
- Gateway logs redact credentials.
- Browser pages send the RTSP URL to the extension iframe by \`postMessage\`.
- Extension pages pass the URL to the native runtime over Chrome extension APIs.

## Page Authorization

The extension popup stores allowed web origins. The iframe refuses initialization
from pages that are not on the list.

Production systems should:

1. Restrict \`content_scripts.matches\` to exact business domains.
2. Avoid wildcard allowed origins.
3. Keep the fixed extension ID stable, or publish through Chrome Web Store / enterprise policy.
4. Register Native Messaging manifests only for trusted extension IDs.

## Network Scope

The gateway does not expose a LAN or public port. It only listens on localhost
and opens outbound RTSP connections to the camera/NVR address supplied by the
authorized page.
`,Vn=`# Troubleshooting

## Popup Shows Native Runtime Missing

Check the Native Messaging manifest path:

macOS:

\`\`\`txt
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.rtspweb.player.json
\`\`\`

Linux:

\`\`\`txt
~/.config/google-chrome/NativeMessagingHosts/com.rtspweb.player.json
\`\`\`

The manifest \`allowed_origins\` must contain the exact extension ID:

\`\`\`json
{
  "allowed_origins": [
    "chrome-extension://giegomfhcmgebjhdiihnjohoinkbcjbh/"
  ]
}
\`\`\`

On macOS, use \`scripts/install-host.sh\`; it copies the binary into
\`~/Library/Application Support/rtsp-web-player/\` before registration.

## Collect Logs for Playback Failures

When VLC can play the RTSP source but the browser cannot, collect the extension
diagnostics first:

1. Open the RTSP Web Player extension popup.
2. Click **刷新日志**.
3. Click **复制日志** and send the copied text to support.

The log bundle includes extension events, Native Runtime health, Gateway PID and
port, RTSP handshake stages, selected H.264/H.265 track, WebRTC negotiation,
WebSocket fallback, and decoder errors. RTSP usernames, passwords, tokens, and
secrets are automatically redacted.

If playback behaves strangely after upgrading, click **重启 Native** in the same
popup. The current Native Host will stop stale Gateway processes recorded in the
state file, remove old state, and start the installed runtime version again.

## macOS Says Apple Cannot Verify rtsp-web-native

Use the current \`rtsp-macos-installer.dmg\` and run \`RTSP Installer.app\`. If
macOS blocks the first launch, right-click the app, choose Open, then confirm
Open.

## Page Says Origin Not Allowed

Open the extension popup and add the page origin. Include the scheme and port:

\`\`\`txt
http://localhost:5173
https://your-app.example.com
\`\`\`

For the online demo, the origin must include the exact production host:

\`\`\`txt
https://rtsp.flyfish.dev
https://rtsp-roan.vercel.app
\`\`\`

If the installer status says the origin is allowed but the player still shows
\`Origin not allowed\`, reload the unpacked extension or reinstall the current
installer package. Older extension builds used a shorter default origin list in
the iframe player.

## Decoder Ready But No Picture

With \`transport="auto"\`, first check whether WebRTC negotiated but did not
receive video. The SDK will fall back to WebSocket/WebCodecs after a short
timeout. If both paths fail, test a H.264 sub stream before trying H.265 again.

Also check:

- RTSP over TCP is enabled.
- The source uses a reasonable GOP interval.
- Browser/Electron/Tauri WebView supports the selected H.264/H.265 codec.
- The page is not hidden or throttled by background tab behavior.

## RTSP Authentication Fails

Use a full URL with credentials:

\`\`\`txt
rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101
\`\`\`

The native runtime supports Basic and Digest authentication. Logs redact
credentials, so inspect camera/NVR logs if the server still returns \`401\`.

## Public Stream Works But Camera Does Not

Most camera failures are one of:

- Camera is set to H.265 but the browser/system cannot decode it.
- Camera only allows UDP RTP.
- Firewall blocks RTSP port \`554\`.
- User account does not have live-view permission.
- Vendor URL path is different from the model documentation.

Start with the camera sub stream configured as H.264, RTSP over TCP, lower
bitrate, and a simple password without URL-special characters. Once stable,
switch \`codec="h265"\` for H.265-capable desktop/browser targets.
`,Gn=`# Universal Components SDK

The SDK path is for app teams that want explicit framework-level integration
instead of relying on the extension content script. In web pages it uses the
Chrome Runtime extension and Go native runtime. In Electron/Tauri it can switch
to \`runtime="desktop"\` and talk to the bundled Go sidecar directly.

Package path:

\`\`\`txt
packages/rtsp-sdk
\`\`\`

Prebuilt browser file:

\`\`\`txt
web-sdk/rtsp-player-sdk.js
\`\`\`

## Plain HTML

\`\`\`html
<script
  src="/rtsp-player-sdk.js"
  data-extension-id="YOUR_CHROME_EXTENSION_ID"><\/script>

<rtsp-player
  url="rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101"
  width="960"
  height="540"
  autoplay
  controls></rtsp-player>
\`\`\`

## JavaScript Module

\`\`\`js
import {
  configureRTSP,
  createRTSPPlayer,
  defineRTSPPlayer,
} from "@rtsp/player";

configureRTSP({ extensionId: "YOUR_CHROME_EXTENSION_ID" });
defineRTSPPlayer();

const player = createRTSPPlayer({
  url: "rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101",
  width: "100%",
  height: 540,
  autoplay: true,
  controls: true,
  transport: "auto",
  codec: "auto",
});

player.addEventListener("ready", () => console.log("ready"));
player.addEventListener("error", (event) => console.error(event.detail.error));

document.querySelector("#camera").append(player);
\`\`\`

## React

\`\`\`jsx
import { RtspPlayer } from "@rtsp/player/react";

export function CameraCard() {
  return (
    <RtspPlayer
      extensionId="YOUR_CHROME_EXTENSION_ID"
      url="rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101"
      width="100%"
      height={540}
      autoplay
      controls
      transport="auto"
      codec="auto"
      onReady={() => console.log("ready")}
      onError={(event) => console.error(event.detail.error)}
    />
  );
}
\`\`\`

## Vue

\`\`\`vue
<script setup>
import { RtspPlayer } from "@rtsp/player/vue";
<\/script>

<template>
  <RtspPlayer
    extension-id="YOUR_CHROME_EXTENSION_ID"
    url="rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101"
    width="100%"
    :height="540"
    autoplay
    controls
    transport="auto"
    codec="auto"
    @ready="() => console.log('ready')"
    @error="(event) => console.error(event.detail.error)"
  />
</template>
\`\`\`

## Package Exports

\`\`\`txt
@rtsp/player          Web Component helpers
@rtsp/player/web      Same as root export
@rtsp/player/react    React component
@rtsp/player/vue      Vue 3 component
@rtsp/player/global   Prebuilt global script
\`\`\`

## Runtime Requirements

Web page:

1. Chrome Runtime extension is installed.
2. Native Messaging host is registered for that extension ID.
3. The page origin is allowed in the extension popup.

Desktop app:

1. Electron/Tauri exposes \`window.rtspNative\` or \`window.__RTSP_DESKTOP__\`.
2. The Go sidecar binary is bundled with the app.
3. The app uses \`runtime="desktop"\` or \`runtime="auto"\`.

RTSP source should support TCP interleaved transport. H.264 is the safest baseline; H.265 is supported through WebRTC/WebCodecs when the platform advertises the codec.

## Events

| Event | Meaning |
| --- | --- |
| \`starting\` | Extension iframe is starting the native stream. |
| \`ready\` | WebRTC track or WebCodecs decoder is ready. |
| \`error\` | Native, RTSP, WebRTC, WebSocket, or decoder error. |

The \`detail\` field contains the message from the extension iframe.
`,$n=`# Validation

## Basic Checks

\`\`\`bash
cd native
go test ./...
\`\`\`

\`\`\`bash
./scripts/build.sh
\`\`\`

\`\`\`bash
npm run check
\`\`\`

Current implementation also includes:

- H.265 SDP parsing and RTP metadata tests.
- Pion WebRTC codec-selection tests.
- JS syntax checks for Electron/Tauri desktop apps.

## Native Messaging Ping

The native host reads one Chrome Native Messaging message, responds, then exits.
The gateway daemon stays alive and writes its state file.

Expected response:

\`\`\`json
{
  "ok": true,
  "type": "ping",
  "port": 53745,
  "version": "0.1.2"
}
\`\`\`

## Public RTSP E2E

Validated public source:

\`\`\`txt
rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1
\`\`\`

The full browser path was verified:

\`\`\`txt
demo page -> content script -> extension iframe -> service worker
-> Chrome Native Messaging -> Go host -> Go gateway
-> RTSP over TCP -> WebRTC first when available
-> WebSocket/WebCodecs fallback -> Canvas
\`\`\`

Observed browser result:

\`\`\`txt
RTSP_PLAYER_READY
codec avc1.4D401E
~30 fps
queue 0
\`\`\`

The public source is H.264, so it validates WebRTC/H.264 or H.264 fallback
depending on local browser capabilities. H.265 should be validated with a
known H.265 camera/NVR because public HEVC RTSP sources are frequently unstable.

Screenshot artifact:

![Public RTSP E2E](assets/public-rtsp-e2e.png)

## Local Replay RTSP E2E

Validated local loop source:

\`\`\`txt
rtsp://127.0.0.1:8554/local
\`\`\`

Source profile:

\`\`\`txt
H.264 High Profile, 1280x720, 30 fps, AAC audio ignored by player
\`\`\`

Validation result:

- WebRTC H.264 received a rendered 1280x720 first frame.
- Five consecutive first-frame attempts passed.
- First-frame time after offer ranged from 163ms to 371ms.
- Gateway injected SDP SPS/PPS before H.264 keyframes for browser decoder stability.
- Browser player now treats WebRTC as successful only after a rendered frame; otherwise it quickly falls back to WebSocket/WebCodecs.
`,Zn=`# WebRTC / H.265 方案

WebRTC 是桌面端和扩展播放器的默认优先链路。它可以让浏览器或系统 WebView 直接走硬件解码路径，避免把视频帧塞进 Native Messaging JSON，也避免在 Go 端转码。

## 策略

\`\`\`txt
transport="auto"
  1. 探测 RTCPeerConnection + RTCRtpReceiver video capabilities
  2. 创建 recvonly video offer
  3. Go gateway 使用 Pion 创建 answer
  4. RTSP over TCP 收到的 RTP 直接写入 WebRTC TrackLocalStaticRTP
  5. 2.6 秒内没有 video track 或协商失败，回退 ws-annexb
\`\`\`

默认 \`codec="auto"\` 会优先使用 H.264 WebRTC，因为 H.264 的浏览器支持最稳。H.265 摄像头可显式设置 \`codec="h265"\`；如果浏览器 offer 不包含 H.265，SDK 会立即回退。

## Native 实现

Go gateway 通过 Pion WebRTC 实现：

- \`POST /api/webrtc/offer\` 接收浏览器 offer。
- 根据 offer 与 \`codec\` 选择 H.264 或 H.265。
- 通过 RTSP DESCRIBE/SETUP/PLAY 拉取同 codec track。
- \`OnRTP\` 将摄像头 RTP 包写入 \`TrackLocalStaticRTP\`。
- Pion 会按协商结果改写 SSRC 和 PayloadType。

## H.265 边界

Chrome 136 起开始支持 WebRTC HEVC，但官方说明编码能力依赖设备和操作系统。Electron 要看内置 Chromium 版本；Tauri 要看系统 WebView。H.265 因此是能力探测后的优先路径，不是全平台硬承诺。

建议：

- 生产默认 \`codec="auto"\`。
- H.265-only 摄像头使用 \`codec="h265"\`，并在 UI 上保留 H.264/子码流提示。
- 内网监控优先 RTSP over TCP，避免 UDP 丢包导致花屏。
- GOP 建议 1-2 秒，码率按分辨率合理控制，关闭 B 帧可降低实时播放延迟。

## 回退路径

WebRTC 失败时会走：

\`\`\`txt
RTSP RTP/H.264 or H.265
  ↓ depay + Annex-B access unit
Gateway WebSocket
  ↓ binary frame
WebCodecs VideoDecoder prefer-hardware
Canvas
\`\`\`

H.264 WebCodecs 是当前最稳的网页回退路径。H.265 WebCodecs 同样依赖平台 codec 支持；不支持时需要切摄像头编码。

## 参考

- Chrome 136 beta: HEVC joins WebRTC codecs in Chrome, with device/OS capability limits.
- W3C WebCodecs HEVC codec registration: HEVC bitstream formats and codec strings.
- RFC 7798: RTP payload format for HEVC.
- Pion \`TrackLocalStaticRTP\`: suitable for pre-packetized RTP passthrough.
`,Kn=`# 小米 / 米家摄像头 RTSP 桥接指南

小米、米家摄像头多数型号不直接开放标准 RTSP。推荐使用
[miiot/micam](https://github.com/miiot/micam) 做本地桥接：它通过 Docker
Compose 部署 Miloco、go2rtc 和 micam，把小米摄像头视频流转推成局域网 RTSP。

推荐链路：

\`\`\`txt
小米摄像头
  ↓ 小米账号 / Miloco 获取设备流
miiot/micam
  ↓ 写入 go2rtc
rtsp://桥接主机:8554/your_stream
  ↓
RTSP Player WebRTC first / WebSocket fallback
\`\`\`

## 准备条件

- 一台常开主机：NAS、Linux 小主机、Home Assistant 主机或服务器。
- 已安装 Docker 和 Docker Compose。
- 主机与摄像头在同一局域网，且能访问外网拉取镜像。
- 小米账号中已经绑定目标摄像头。

## 1. 部署 micam

在桥接主机上执行：

\`\`\`bash
mkdir -p /opt/micam
cd /opt/micam
wget https://raw.githubusercontent.com/miiot/micam/refs/heads/main/docker-compose.yml
docker compose up -d
\`\`\`

该 Compose 会启动三个核心服务：

| 服务 | 作用 |
| --- | --- |
| Miloco | 绑定小米账号，获取摄像头设备与视频流 |
| go2rtc | 提供 RTSP 服务，默认 RTSP 端口 \`8554\` |
| micam | 从 Miloco 拉取摄像头流，并转推到 go2rtc |

## 2. 配置 Miloco

打开 Miloco WebUI：

\`\`\`txt
https://桥接主机IP:8000
\`\`\`

Miloco 使用自签证书，浏览器首次访问时需要允许继续访问。

操作流程：

1. 设置 Miloco 管理密码。
2. 绑定小米账号。
3. 确认目标摄像头在线。
4. 记录摄像头 DID，也就是 \`CAMERA_ID\`。如果页面没有直接显示，可以按 micam 文档提示，通过浏览器开发者工具的网络请求查看。

## 3. 在 go2rtc 创建 RTSP 流名

打开 go2rtc 配置页：

\`\`\`txt
http://桥接主机IP:1984/config.html
\`\`\`

添加一个空流名，例如：

\`\`\`yaml
streams:
  mi_camera_1:
\`\`\`

保存并重启 go2rtc。后续 micam 会把摄像头视频推到这个流名，对外 RTSP 地址就是：

\`\`\`txt
rtsp://桥接主机IP:8554/mi_camera_1
\`\`\`

## 4. 配置 micam 环境变量

在 \`/opt/micam/.env\` 中写入：

\`\`\`env
MILOCO_PASSWORD=your_miloco_password_md5_lowercase
CAMERA_ID=1234567890
RTSP_URL=rtsp://桥接主机IP:8554/mi_camera_1
VIDEO_CODEC=h264
STREAM_CHANNEL=0
\`\`\`

说明：

| 变量 | 说明 |
| --- | --- |
| \`MILOCO_PASSWORD\` | Miloco WebUI 密码的 MD5，小写 |
| \`CAMERA_ID\` | 小米摄像头 DID |
| \`RTSP_URL\` | micam 转推到 go2rtc 的目标 RTSP 地址 |
| \`VIDEO_CODEC\` | \`h264\` 或 \`hevc\`；网页兼容优先建议先用 \`h264\` |
| \`STREAM_CHANNEL\` | 摄像头通道，默认 \`0\` |

让配置生效：

\`\`\`bash
cd /opt/micam
docker compose up -d
docker compose restart micam1
\`\`\`

多摄像头可以在 \`docker-compose.yml\` 中按 micam 的 \`micam2\` 示例扩展服务，并为每路配置独立的 \`CAMERA_ID\` 与 \`RTSP_URL\`。

## 5. 用 RTSP Player 播放

在本项目在线 Demo、Chrome 扩展或桌面应用里填写：

\`\`\`txt
rtsp://桥接主机IP:8554/mi_camera_1
\`\`\`

网页组件示例：

\`\`\`html
<rtsp-player
  runtime="auto"
  transport="auto"
  codec="auto"
  url="rtsp://192.168.31.10:8554/mi_camera_1"
  autoplay
  controls>
</rtsp-player>
\`\`\`

如果你在 micam 中使用 \`VIDEO_CODEC=hevc\`，可以显式尝试 H.265：

\`\`\`html
<rtsp-player
  runtime="auto"
  transport="auto"
  codec="h265"
  url="rtsp://192.168.31.10:8554/mi_camera_1"
  autoplay
  controls>
</rtsp-player>
\`\`\`

H.265 播放依赖浏览器、系统 codec 和硬件能力。生产建议保留一条 H.264 流作为回退。

## 推荐配置

| 目标 | 建议 |
| --- | --- |
| 最稳网页播放 | \`VIDEO_CODEC=h264\`，播放器 \`codec="auto"\` |
| 尝试更低带宽 | \`VIDEO_CODEC=hevc\`，播放器 \`codec="h265"\`，失败回 H.264 |
| 低延迟 | 保持局域网桥接，RTSP 地址使用桥接主机内网 IP |
| 多摄像头 | 每路独立 go2rtc stream name，例如 \`mi_front_door\`、\`mi_living_room\` |

## 排障

- Miloco 页面打不开：确认 \`docker compose ps\` 正常，防火墙允许 \`8000\`。
- 摄像头不在线：先在米家 App 确认摄像头在线，再检查 Miloco 小米账号绑定状态。
- \`CAMERA_ID\` 不确定：在 Miloco WebUI 的设备列表或浏览器开发者工具网络请求里查 DID。
- go2rtc 没有流：确认 \`streams:\` 中的流名与 \`.env\` 里的 \`RTSP_URL\` 路径一致。
- RTSP 连接超时：确认播放器所在机器能访问桥接主机 \`8554\` 端口。
- 有声音没画面或黑屏：先把 \`VIDEO_CODEC\` 改为 \`h264\`，再重新 \`docker compose restart micam1\`。
- WebRTC/H.265 协商失败：这是平台能力限制，使用 H.264 或等待浏览器/系统支持。

## 安全建议

- 只在可信局域网暴露 \`8000\`、\`1984\`、\`8554\`。
- 不要把 Miloco、go2rtc 或 RTSP 端口直接暴露到公网。
- 生产环境建议在路由器或防火墙中限制访问来源。
- 如需远程访问，优先通过 VPN、Zero Trust 隧道或内网穿透鉴权层进入局域网。

## 参考

- [miiot/micam](https://github.com/miiot/micam)
- [AlexxIT/go2rtc](https://github.com/AlexxIT/go2rtc)
`,Jn="/assets/contact-CNdl1USL.jpg",Yn="/assets/donate-alipay-BSmrWLPt.jpg",Xn="/assets/donate-wx-Dn3cqFoe.jpg",Qn="/assets/mp-CqDGcv-x.png",et="/assets/public-rtsp-e2e-SF2azekD.png",ut="/assets/rtsp-player-latest-architecture-DXNX5NGC.png",nt="/assets/rtsp-player-latest-architecture-DHNnpsnF.svg",tt="/assets/rtsp-player-latest-cover-bg-DdSb4E2y.png",rt="/assets/rtsp-player-latest-cover-B7Gc5T4f.png",ot="/assets/rtsp-player-wechat-cover-BddK3DxA.png",Ze="rtsp-player",it="640px",st="360px",Z={extensionId:"",tagName:Ze,runtime:"extension"},He=new WeakMap;function at(){return typeof document>"u"?"":document.currentScript?.dataset?.extensionId||""}function eu(e){return String(e||"").trim().replace(/^chrome-extension:\/\//,"").replace(/\/.*$/,"")}function ct(e){const u=eu(e);return u?`chrome-extension://${u}`:""}function bu(e,u){if(e==null||e==="")return u;const n=String(e);return/^\d+$/.test(n)?`${n}px`:n}function Gu(e){const u=String(e||"").trim().toLowerCase();return u==="desktop"||u==="auto"||u==="extension"?u:"extension"}function lt(e){const u=String(e).trim().toLowerCase();return u==="webrtc"||u==="ws-annexb"||u==="auto"?u:"auto"}function $u(e){const u=String(e||"").trim().toLowerCase();return u==="h265"||u==="hevc"?"h265":u==="h264"||u==="avc"?"h264":"auto"}function Ke(){return typeof window>"u"?null:window.rtspNative||window.__RTSP_DESKTOP__||null}function Zu(){return!!Ke()?.startStream}function V(e,u,n={}){e.dispatchEvent(new CustomEvent(u,{detail:n,bubbles:!0,composed:!0}))}function dt(e={}){return e.extensionId!==void 0&&(Z.extensionId=eu(e.extensionId)),e.tagName&&(Z.tagName=String(e.tagName)),e.runtime&&(Z.runtime=Gu(e.runtime)),{...Z}}async function mu(e="auto"){const u=$u(e),n={desktopRuntime:Zu(),webcodecs:"VideoDecoder"in globalThis,webrtc:"RTCPeerConnection"in globalThis,h264WebRTC:!1,h265WebRTC:!1,h264WebCodecs:!1,h265WebCodecs:!1};try{const r=(globalThis.RTCRtpReceiver?.getCapabilities?.("video")?.codecs||[]).map(o=>String(o.mimeType||"").toLowerCase());n.h264WebRTC=r.includes("video/h264"),n.h265WebRTC=r.includes("video/h265")||r.includes("video/hevc")}catch{}if(n.webcodecs){try{n.h264WebCodecs=!!(await VideoDecoder.isConfigSupported({codec:"avc1.42E01E",hardwareAcceleration:"prefer-hardware",optimizeForLatency:!0})).supported}catch{}try{n.h265WebCodecs=!!(await VideoDecoder.isConfigSupported({codec:"hvc1.1.6.L93.B0",hardwareAcceleration:"prefer-hardware",optimizeForLatency:!0})).supported}catch{}}return n.requestedCodec=u,n}function ft(e=Z.tagName||Ze,u={}){if(typeof window>"u"||typeof customElements>"u")return;dt(u);const n=String(e||Ze),t=customElements.get(n);if(t)return t;class r extends HTMLElement{static get observedAttributes(){return["url","src","width","height","autoplay","controls","muted","transport","media-transport","rtsp-transport","codec","runtime","extension-id"]}constructor(){super(),this._iframe=null,this._loaded=!1,this._player=null,this._pc=null,this._video=null,this._mode="",this._streamId="",this._streamToken="",this.attachShadow({mode:"open"})}connectedCallback(){this._render()}disconnectedCallback(){this.stop(),this._iframe?.contentWindow&&He.delete(this._iframe.contentWindow)}attributeChangedCallback(i){if(i==="runtime"||i==="extension-id"){this.stop(),this._iframe=null,this._loaded=!1,this.shadowRoot&&(this.shadowRoot.innerHTML=""),this._render();return}this._resize(),this._mode==="extension"?this._sendInit():this.hasAttribute("autoplay")&&(i==="url"||i==="src")&&this.play()}play(i){i&&this.setAttribute("url",i),this._mode==="extension"?this._sendInit():this._startDesktop()}stop(){const i=this._streamId;if(this._streamId="",this._streamToken="",this._iframe?.contentWindow&&this._iframe.contentWindow.postMessage({type:"RTSP_PLAYER_STOP"},this._origin()),this._player&&(this._player.close(),this._player=null),this._pc){try{this._pc.close()}catch{}this._pc=null}if(this._video){try{this._video.srcObject=null}catch{}this._video.remove(),this._video=null}const s=Ke();i&&s?.stopStream&&s.stopStream({streamId:i}).catch?.(()=>{})}async capabilities(){return mu(this._codec())}_runtime(){const i=Gu(this.getAttribute("runtime")||Z.runtime);return i==="auto"?Zu()?"desktop":"extension":i}_extensionId(){return eu(this.getAttribute("extension-id")||Z.extensionId||window.RTSP_EXTENSION_ID||window.RTSP_WEB_PLAYER_EXTENSION_ID||at())}_origin(){return ct(this._extensionId())}_url(){return this.getAttribute("url")||this.getAttribute("src")||""}_rtspTransport(){const i=this.getAttribute("rtsp-transport"),s=this.getAttribute("transport");return i||(s==="tcp"||s==="udp"?s:"tcp")}_mediaTransport(){return lt(this.getAttribute("media-transport")||this.getAttribute("transport")||"auto")}_codec(){return $u(this.getAttribute("codec")||"auto")}_render(){if(!this.shadowRoot||this.shadowRoot.innerHTML)return;this._resize(),this._runtime()==="desktop"?this._renderDesktop():this._renderExtension()}_renderExtension(){this._mode="extension",this.shadowRoot.innerHTML=`
        <style>
          :host{display:inline-block;background:#050505;min-width:160px;min-height:90px;contain:content;}
          .rtsp-host{width:100%;height:100%;background:#050505;position:relative;overflow:hidden;border-radius:6px;}
          iframe{width:100%;height:100%;border:0;background:#050505;display:block;}
          .missing{height:100%;min-height:120px;display:flex;align-items:center;justify-content:center;background:#151515;color:#ddd;font:12px system-ui,sans-serif;text-align:center;padding:12px;box-sizing:border-box;}
        </style>
        <div class="rtsp-host"></div>
      `;const i=this.shadowRoot.querySelector(".rtsp-host"),s=this._origin();if(!s){i.innerHTML='<div class="missing">RTSP: missing Chrome extension id.</div>';return}const a=document.createElement("iframe");a.src=`${s}/player/player.html`,a.allow="autoplay; fullscreen",a.referrerPolicy="no-referrer",a.addEventListener("load",()=>{this._loaded=!0,He.set(a.contentWindow,this),this._sendInit()}),i.appendChild(a),this._iframe=a}_renderDesktop(){this._mode="desktop",this.shadowRoot.innerHTML=`
        <style>
          :host{display:inline-block;background:#050505;min-width:160px;min-height:90px;contain:content;}
          .rtsp-host{width:100%;height:100%;background:#050505;position:relative;overflow:hidden;border-radius:6px;}
          canvas{width:100%;height:100%;display:block;background:#050505;}
          .status{position:absolute;left:10px;right:10px;bottom:10px;padding:8px 10px;border-radius:6px;background:rgba(0,0,0,.62);color:#f5f5f5;font:12px system-ui,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
          .status.ok{color:#9ad29d}.status.error{color:#e08d7a}
        </style>
        <div class="rtsp-host">
          <canvas part="canvas"></canvas>
          <div class="status" part="status">Desktop runtime ready.</div>
        </div>
      `,this.hasAttribute("autoplay")&&this._url()&&this._startDesktop()}_resize(){this.style.width=bu(this.getAttribute("width")||this.style.width,it),this.style.height=bu(this.getAttribute("height")||this.style.height,st)}_sendInit(){const i=this._origin();!this._loaded||!this._iframe?.contentWindow||!i||this._iframe.contentWindow.postMessage({type:"RTSP_PLAYER_INIT",url:this._url(),autoplay:this.hasAttribute("autoplay"),controls:this.hasAttribute("controls"),muted:this.hasAttribute("muted"),transport:this._rtspTransport(),rtspTransport:this._rtspTransport(),mediaTransport:this._mediaTransport(),codec:this._codec()},i)}async _startDesktop(){const i=Ke(),s=this._url().trim();if(!i?.startStream){this._status("Desktop runtime bridge is not available.","error"),V(this,"error",{error:"Desktop runtime bridge is not available."});return}if(!/^rtsps?:\/\//i.test(s)){this._status("RTSP URL must start with rtsp:// or rtsps://.","error");return}this.stop(),V(this,"starting",{runtime:"desktop",transport:this._mediaTransport(),codec:this._codec()}),this._status("Starting desktop runtime...");const a=this._mediaTransport(),c=this._codec();(a==="auto"||a==="webrtc")&&await this._canAttemptWebRTC(c)&&await this._startWebRTC(i,s,c)||await this._startWebSocket(i,s,c)}async _canAttemptWebRTC(i){if(!("RTCPeerConnection"in window))return!1;const s=await mu(i);return i==="h265"?s.h265WebRTC:i==="h264"?s.h264WebRTC:s.h265WebRTC||s.h264WebRTC}async _startWebRTC(i,s,a){if(!i.createWebRTCOffer||!i.startStream)return!1;const c=await i.startStream({url:s,codec:a,transport:this._rtspTransport(),mediaTransport:"webrtc",origin:location.origin});if(!c?.ok||!c.streamId)return this._status(c?.error||"Desktop runtime WebRTC start failed."),!1;this._streamId=c.streamId||"",this._streamToken=c.streamToken||"";const l=new RTCPeerConnection({iceServers:[]});this._pc=l;const d=new MediaStream;let h=!1;l.addTransceiver("video",{direction:"recvonly"}),l.ontrack=g=>{h=!0,d.addTrack(g.track),this._attachVideoStream(d),this._status(`WebRTC ${a||"auto"} ready.`,"ok"),V(this,"ready",{runtime:"desktop",mediaTransport:"webrtc",codec:a})};const p=await l.createOffer();await l.setLocalDescription(p),await pt(l);const f=await i.createWebRTCOffer({url:s,codec:a,origin:location.origin,streamId:this._streamId,streamToken:this._streamToken,offer:l.localDescription?.sdp||p.sdp});if(!f?.ok||!f.answer){this._status(f?.error||"WebRTC unavailable, falling back to WebSocket.");try{l.close()}catch{}return this._pc=null,await i.stopStream?.({streamId:this._streamId}).catch?.(()=>{}),this._streamId="",this._streamToken="",!1}if(await l.setRemoteDescription({type:"answer",sdp:f.answer}),a=f.codec||a,await ht(2600),h)return!0;this._status("WebRTC negotiated but no video arrived; falling back to WebSocket.");try{l.close()}catch{}return this._pc=null,await i.stopStream?.({streamId:this._streamId}).catch?.(()=>{}),this._streamId="",this._streamToken="",!1}async _startWebSocket(i,s,a){const c=await i.startStream({url:s,codec:a,transport:this._rtspTransport(),mediaTransport:"ws-annexb",origin:location.origin});if(!c?.ok||!c.wsUrl){const d=c?.error||"Desktop runtime start failed.";this._status(d,"error"),V(this,"error",{error:d});return}this._streamId=c.streamId||"",this._streamToken=c.streamToken||"";const l=this.shadowRoot.querySelector("canvas");this._player=new bt(l,{onStatus:(d,h)=>this._status(d,h),onReady:()=>V(this,"ready",{runtime:"desktop",mediaTransport:"ws-annexb",codec:a}),onError:d=>V(this,"error",{error:d})}),this._player.connect(c.wsUrl)}_attachVideoStream(i){const s=document.createElement("video");s.muted=!0,s.autoplay=!0,s.playsInline=!0,s.srcObject=i,s.play().catch(()=>{}),this._video=s;const a=this.shadowRoot.querySelector("canvas"),c=a.getContext("2d"),l=()=>{this._video&&(s.videoWidth&&s.videoHeight&&((a.width!==s.videoWidth||a.height!==s.videoHeight)&&(a.width=s.videoWidth,a.height=s.videoHeight),c.drawImage(s,0,0,a.width,a.height)),requestAnimationFrame(l))};requestAnimationFrame(l)}_status(i,s=""){const a=this.shadowRoot?.querySelector(".status");a&&(a.textContent=i||"",a.className=`status ${s||""}`)}}return customElements.define(n,r),window.__RTSP_PLAYER_MESSAGE_BRIDGE__||(window.__RTSP_PLAYER_MESSAGE_BRIDGE__=!0,window.addEventListener("message",o=>{const i=o.source,s=i?He.get(i):null;if(!s||!o.data?.type?.startsWith?.("RTSP_PLAYER_")||o.origin!==s._origin())return;const a=o.data.type.replace(/^RTSP_PLAYER_/,"").toLowerCase();V(s,a,o.data)})),r}function pt(e){return e.iceGatheringState==="complete"?Promise.resolve():new Promise(u=>{const n=setTimeout(t,1200);function t(){clearTimeout(n),e.removeEventListener("icegatheringstatechange",r),u()}function r(){e.iceGatheringState==="complete"&&t()}e.addEventListener("icegatheringstatechange",r)})}function ht(e){return new Promise(u=>setTimeout(u,e))}class bt{constructor(u,n={}){this.canvas=u,this.ctx=u.getContext("2d"),this.hooks=n,this.ws=null,this.decoder=null,this.codec="",this.gotKey=!1,this.closed=!1,this.lastTimestamp=-1}connect(u){this.ws=new WebSocket(u),this.ws.binaryType="arraybuffer",this.ws.onopen=()=>this.hooks.onStatus?.("Connected to desktop gateway."),this.ws.onerror=()=>this.hooks.onStatus?.("WebSocket connection error.","error"),this.ws.onclose=()=>{this.closed||this.hooks.onStatus?.("Video connection closed.","error")},this.ws.onmessage=n=>this.handleMessage(n.data)}async handleMessage(u){if(typeof u=="string"){let n;try{n=JSON.parse(u)}catch{return}n.type==="config"?await this.configure(n.codec):n.type==="error"&&this.hooks.onError?.(n.error||"RTSP error");return}u instanceof ArrayBuffer&&this.handleAccessUnit(u)}async configure(u){if(u||="avc1.42E01E",this.decoder&&this.codec===u)return;if(this.codec=u,this.decoder)try{this.decoder.close()}catch{}if(!("VideoDecoder"in window)){this.hooks.onStatus?.("VideoDecoder is not supported in this runtime.","error"),this.hooks.onError?.("VideoDecoder is not supported in this runtime.");return}const n={codec:u,hardwareAcceleration:"prefer-hardware",optimizeForLatency:!0};try{if(!(await VideoDecoder.isConfigSupported(n)).supported){const r=`Runtime does not support codec ${u}.`;this.hooks.onStatus?.(r,"error"),this.hooks.onError?.(r);return}}catch{}this.decoder=new VideoDecoder({output:t=>this.render(t),error:t=>this.hooks.onError?.(t?.message||String(t))}),this.decoder.configure(n),this.gotKey=!1,this.hooks.onStatus?.(`Decoder ready: ${u}`,"ok"),this.hooks.onReady?.()}handleAccessUnit(u){if(u.byteLength<16||!this.decoder||this.decoder.state!=="configured")return;const n=new DataView(u);if(n.getUint8(0)!==1)return;const t=n.getUint8(1)===1;let r=Number(n.getBigUint64(4,!0));const o=n.getUint32(12,!0);if(!(o<=0||16+o>u.byteLength)&&!(!t&&!this.gotKey)&&(t&&(this.gotKey=!0),r<=this.lastTimestamp&&(r=this.lastTimestamp+1),this.lastTimestamp=r,!(!t&&this.decoder.decodeQueueSize>6)))try{this.decoder.decode(new EncodedVideoChunk({type:t?"key":"delta",timestamp:r,data:new Uint8Array(u,16,o)}))}catch(i){this.hooks.onError?.(i?.message||String(i))}}render(u){try{(this.canvas.width!==u.displayWidth||this.canvas.height!==u.displayHeight)&&(this.canvas.width=u.displayWidth,this.canvas.height=u.displayHeight),this.ctx.drawImage(u,0,0,this.canvas.width,this.canvas.height)}finally{u.close()}}close(){if(this.closed=!0,this.ws){try{this.ws.close()}catch{}this.ws=null}if(this.decoder){try{this.decoder.close()}catch{}this.decoder=null}}}const xu={};function mt(e){let u=xu[e];if(u)return u;u=xu[e]=[];for(let n=0;n<128;n++){const t=String.fromCharCode(n);u.push(t)}for(let n=0;n<e.length;n++){const t=e.charCodeAt(n);u[t]="%"+("0"+t.toString(16).toUpperCase()).slice(-2)}return u}function ue(e,u){typeof u!="string"&&(u=ue.defaultChars);const n=mt(u);return e.replace(/(%[a-f0-9]{2})+/gi,function(t){let r="";for(let o=0,i=t.length;o<i;o+=3){const s=parseInt(t.slice(o+1,o+3),16);if(s<128){r+=n[s];continue}if((s&224)===192&&o+3<i){const a=parseInt(t.slice(o+4,o+6),16);if((a&192)===128){const c=s<<6&1984|a&63;c<128?r+="��":r+=String.fromCharCode(c),o+=3;continue}}if((s&240)===224&&o+6<i){const a=parseInt(t.slice(o+4,o+6),16),c=parseInt(t.slice(o+7,o+9),16);if((a&192)===128&&(c&192)===128){const l=s<<12&61440|a<<6&4032|c&63;l<2048||l>=55296&&l<=57343?r+="���":r+=String.fromCharCode(l),o+=6;continue}}if((s&248)===240&&o+9<i){const a=parseInt(t.slice(o+4,o+6),16),c=parseInt(t.slice(o+7,o+9),16),l=parseInt(t.slice(o+10,o+12),16);if((a&192)===128&&(c&192)===128&&(l&192)===128){let d=s<<18&1835008|a<<12&258048|c<<6&4032|l&63;d<65536||d>1114111?r+="����":(d-=65536,r+=String.fromCharCode(55296+(d>>10),56320+(d&1023))),o+=9;continue}}r+="�"}return r})}ue.defaultChars=";/?:@&=+$,#";ue.componentChars="";const gu={};function xt(e){let u=gu[e];if(u)return u;u=gu[e]=[];for(let n=0;n<128;n++){const t=String.fromCharCode(n);/^[0-9a-z]$/i.test(t)?u.push(t):u.push("%"+("0"+n.toString(16).toUpperCase()).slice(-2))}for(let n=0;n<e.length;n++)u[e.charCodeAt(n)]=e[n];return u}function he(e,u,n){typeof u!="string"&&(n=u,u=he.defaultChars),typeof n>"u"&&(n=!0);const t=xt(u);let r="";for(let o=0,i=e.length;o<i;o++){const s=e.charCodeAt(o);if(n&&s===37&&o+2<i&&/^[0-9a-f]{2}$/i.test(e.slice(o+1,o+3))){r+=e.slice(o,o+3),o+=2;continue}if(s<128){r+=t[s];continue}if(s>=55296&&s<=57343){if(s>=55296&&s<=56319&&o+1<i){const a=e.charCodeAt(o+1);if(a>=56320&&a<=57343){r+=encodeURIComponent(e[o]+e[o+1]),o++;continue}}r+="%EF%BF%BD";continue}r+=encodeURIComponent(e[o])}return r}he.defaultChars=";/?:@&=+$,-_.!~*'()#";he.componentChars="-_.!~*'()";function uu(e){let u="";return u+=e.protocol||"",u+=e.slashes?"//":"",u+=e.auth?e.auth+"@":"",e.hostname&&e.hostname.indexOf(":")!==-1?u+="["+e.hostname+"]":u+=e.hostname||"",u+=e.port?":"+e.port:"",u+=e.pathname||"",u+=e.search||"",u+=e.hash||"",u}function ke(){this.protocol=null,this.slashes=null,this.auth=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.pathname=null}const gt=/^([a-z0-9.+-]+:)/i,_t=/:[0-9]*$/,kt=/^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,yt=["<",">",'"',"`"," ","\r",`
`,"	"],Ct=["{","}","|","\\","^","`"].concat(yt),wt=["'"].concat(Ct),_u=["%","/","?",";","#"].concat(wt),ku=["/","?","#"],St=255,yu=/^[+a-z0-9A-Z_-]{0,63}$/,Dt=/^([+a-z0-9A-Z_-]{0,63})(.*)$/,Cu={javascript:!0,"javascript:":!0},wu={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0};function nu(e,u){if(e&&e instanceof ke)return e;const n=new ke;return n.parse(e,u),n}ke.prototype.parse=function(e,u){let n,t,r,o=e;if(o=o.trim(),!u&&e.split("#").length===1){const c=kt.exec(o);if(c)return this.pathname=c[1],c[2]&&(this.search=c[2]),this}let i=gt.exec(o);if(i&&(i=i[0],n=i.toLowerCase(),this.protocol=i,o=o.substr(i.length)),(u||i||o.match(/^\/\/[^@\/]+@[^@\/]+/))&&(r=o.substr(0,2)==="//",r&&!(i&&Cu[i])&&(o=o.substr(2),this.slashes=!0)),!Cu[i]&&(r||i&&!wu[i])){let c=-1;for(let f=0;f<ku.length;f++)t=o.indexOf(ku[f]),t!==-1&&(c===-1||t<c)&&(c=t);let l,d;c===-1?d=o.lastIndexOf("@"):d=o.lastIndexOf("@",c),d!==-1&&(l=o.slice(0,d),o=o.slice(d+1),this.auth=l),c=-1;for(let f=0;f<_u.length;f++)t=o.indexOf(_u[f]),t!==-1&&(c===-1||t<c)&&(c=t);c===-1&&(c=o.length),o[c-1]===":"&&c--;const h=o.slice(0,c);o=o.slice(c),this.parseHost(h),this.hostname=this.hostname||"";const p=this.hostname[0]==="["&&this.hostname[this.hostname.length-1]==="]";if(!p){const f=this.hostname.split(/\./);for(let g=0,_=f.length;g<_;g++){const C=f[g];if(C&&!C.match(yu)){let x="";for(let b=0,m=C.length;b<m;b++)C.charCodeAt(b)>127?x+="x":x+=C[b];if(!x.match(yu)){const b=f.slice(0,g),m=f.slice(g+1),k=C.match(Dt);k&&(b.push(k[1]),m.unshift(k[2])),m.length&&(o=m.join(".")+o),this.hostname=b.join(".");break}}}}this.hostname.length>St&&(this.hostname=""),p&&(this.hostname=this.hostname.substr(1,this.hostname.length-2))}const s=o.indexOf("#");s!==-1&&(this.hash=o.substr(s),o=o.slice(0,s));const a=o.indexOf("?");return a!==-1&&(this.search=o.substr(a),o=o.slice(0,a)),o&&(this.pathname=o),wu[n]&&this.hostname&&!this.pathname&&(this.pathname=""),this};ke.prototype.parseHost=function(e){let u=_t.exec(e);u&&(u=u[0],u!==":"&&(this.port=u.substr(1)),e=e.substr(0,e.length-u.length)),e&&(this.hostname=e)};const Et=Object.freeze(Object.defineProperty({__proto__:null,decode:ue,encode:he,format:uu,parse:nu},Symbol.toStringTag,{value:"Module"})),Ku=/[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,Ju=/[\0-\x1F\x7F-\x9F]/,vt=/[\xAD\u0600-\u0605\u061C\u06DD\u070F\u0890\u0891\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]|\uD804[\uDCBD\uDCCD]|\uD80D[\uDC30-\uDC3F]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]/,tu=/[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061D-\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1B7D\u1B7E\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52-\u2E5D\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDEAD\uDF55-\uDF59\uDF86-\uDF89]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDEB9\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2\uDF00-\uDF09]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDF43-\uDF4F\uDFFF]|\uD809[\uDC70-\uDC74]|\uD80B[\uDFF1\uDFF2]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/,Yu=/[\$\+<->\^`\|~\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058D-\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u07FE\u07FF\u0888\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D4F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20C0\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A\u218B\u2190-\u2307\u230C-\u2328\u232B-\u2426\u2440-\u244A\u249C-\u24E9\u2500-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B73\u2B76-\u2B95\u2B97-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFF\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E3\u31EF\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uAB5B\uAB6A\uAB6B\uFB29\uFBB2-\uFBC2\uFD40-\uFD4F\uFDCF\uFDFC-\uFDFF\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD]|\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD833[\uDF50-\uDFC3]|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDEA\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838[\uDD4F\uDEFF]|\uD83B[\uDCAC\uDCB0\uDD2E\uDEF0\uDEF1]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED7\uDEDC-\uDEEC\uDEF0-\uDEFC\uDF00-\uDF76\uDF7B-\uDFD9\uDFE0-\uDFEB\uDFF0]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0\uDCB1\uDD00-\uDE53\uDE60-\uDE6D\uDE70-\uDE7C\uDE80-\uDE88\uDE90-\uDEBD\uDEBF-\uDEC5\uDECE-\uDEDB\uDEE0-\uDEE8\uDEF0-\uDEF8\uDF00-\uDF92\uDF94-\uDFCA]/,Xu=/[ \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/,Tt=Object.freeze(Object.defineProperty({__proto__:null,Any:Ku,Cc:Ju,Cf:vt,P:tu,S:Yu,Z:Xu},Symbol.toStringTag,{value:"Module"})),At=new Uint16Array('ᵁ<Õıʊҝջאٵ۞ޢߖࠏ੊ઑඡ๭༉༦჊ረዡᐕᒝᓃᓟᔥ\0\0\0\0\0\0ᕫᛍᦍᰒᷝ὾⁠↰⊍⏀⏻⑂⠤⤒ⴈ⹈⿎〖㊺㘹㞬㣾㨨㩱㫠㬮ࠀEMabcfglmnoprstu\\bfms¦³¹ÈÏlig耻Æ䃆P耻&䀦cute耻Á䃁reve;䄂Āiyx}rc耻Â䃂;䐐r;쀀𝔄rave耻À䃀pha;䎑acr;䄀d;橓Āgp¡on;䄄f;쀀𝔸plyFunction;恡ing耻Å䃅Ācs¾Ãr;쀀𝒜ign;扔ilde耻Ã䃃ml耻Ä䃄ЀaceforsuåûþėĜĢħĪĀcrêòkslash;或Ŷöø;櫧ed;挆y;䐑ƀcrtąċĔause;戵noullis;愬a;䎒r;쀀𝔅pf;쀀𝔹eve;䋘còēmpeq;扎܀HOacdefhilorsuōőŖƀƞƢƵƷƺǜȕɳɸɾcy;䐧PY耻©䂩ƀcpyŝŢźute;䄆Ā;iŧŨ拒talDifferentialD;慅leys;愭ȀaeioƉƎƔƘron;䄌dil耻Ç䃇rc;䄈nint;戰ot;䄊ĀdnƧƭilla;䂸terDot;䂷òſi;䎧rcleȀDMPTǇǋǑǖot;抙inus;抖lus;投imes;抗oĀcsǢǸkwiseContourIntegral;戲eCurlyĀDQȃȏoubleQuote;思uote;怙ȀlnpuȞȨɇɕonĀ;eȥȦ户;橴ƀgitȯȶȺruent;扡nt;戯ourIntegral;戮ĀfrɌɎ;愂oduct;成nterClockwiseContourIntegral;戳oss;樯cr;쀀𝒞pĀ;Cʄʅ拓ap;才րDJSZacefiosʠʬʰʴʸˋ˗ˡ˦̳ҍĀ;oŹʥtrahd;椑cy;䐂cy;䐅cy;䐏ƀgrsʿ˄ˇger;怡r;憡hv;櫤Āayː˕ron;䄎;䐔lĀ;t˝˞戇a;䎔r;쀀𝔇Āaf˫̧Ācm˰̢riticalȀADGT̖̜̀̆cute;䂴oŴ̋̍;䋙bleAcute;䋝rave;䁠ilde;䋜ond;拄ferentialD;慆Ѱ̽\0\0\0͔͂\0Ѕf;쀀𝔻ƀ;DE͈͉͍䂨ot;惜qual;扐blèCDLRUVͣͲ΂ϏϢϸontourIntegraìȹoɴ͹\0\0ͻ»͉nArrow;懓Āeo·ΤftƀARTΐΖΡrrow;懐ightArrow;懔eåˊngĀLRΫτeftĀARγιrrow;柸ightArrow;柺ightArrow;柹ightĀATϘϞrrow;懒ee;抨pɁϩ\0\0ϯrrow;懑ownArrow;懕erticalBar;戥ǹABLRTaВЪаўѿͼrrowƀ;BUНОТ憓ar;椓pArrow;懵reve;䌑eft˒к\0ц\0ѐightVector;楐eeVector;楞ectorĀ;Bљњ憽ar;楖ightǔѧ\0ѱeeVector;楟ectorĀ;BѺѻ懁ar;楗eeĀ;A҆҇护rrow;憧ĀctҒҗr;쀀𝒟rok;䄐ࠀNTacdfglmopqstuxҽӀӄӋӞӢӧӮӵԡԯԶՒ՝ՠեG;䅊H耻Ð䃐cute耻É䃉ƀaiyӒӗӜron;䄚rc耻Ê䃊;䐭ot;䄖r;쀀𝔈rave耻È䃈ement;戈ĀapӺӾcr;䄒tyɓԆ\0\0ԒmallSquare;旻erySmallSquare;斫ĀgpԦԪon;䄘f;쀀𝔼silon;䎕uĀaiԼՉlĀ;TՂՃ橵ilde;扂librium;懌Āci՗՚r;愰m;橳a;䎗ml耻Ë䃋Āipժկsts;戃onentialE;慇ʀcfiosօֈ֍ֲ׌y;䐤r;쀀𝔉lledɓ֗\0\0֣mallSquare;旼erySmallSquare;斪Ͱֺ\0ֿ\0\0ׄf;쀀𝔽All;戀riertrf;愱cò׋؀JTabcdfgorstר׬ׯ׺؀ؒؖ؛؝أ٬ٲcy;䐃耻>䀾mmaĀ;d׷׸䎓;䏜reve;䄞ƀeiy؇،ؐdil;䄢rc;䄜;䐓ot;䄠r;쀀𝔊;拙pf;쀀𝔾eater̀EFGLSTصلَٖٛ٦qualĀ;Lؾؿ扥ess;招ullEqual;执reater;檢ess;扷lantEqual;橾ilde;扳cr;쀀𝒢;扫ЀAacfiosuڅڋږڛڞڪھۊRDcy;䐪Āctڐڔek;䋇;䁞irc;䄤r;愌lbertSpace;愋ǰگ\0ڲf;愍izontalLine;攀Āctۃۅòکrok;䄦mpńېۘownHumðįqual;扏܀EJOacdfgmnostuۺ۾܃܇܎ܚܞܡܨ݄ݸދޏޕcy;䐕lig;䄲cy;䐁cute耻Í䃍Āiyܓܘrc耻Î䃎;䐘ot;䄰r;愑rave耻Ì䃌ƀ;apܠܯܿĀcgܴܷr;䄪inaryI;慈lieóϝǴ݉\0ݢĀ;eݍݎ戬Āgrݓݘral;戫section;拂isibleĀCTݬݲomma;恣imes;恢ƀgptݿރވon;䄮f;쀀𝕀a;䎙cr;愐ilde;䄨ǫޚ\0ޞcy;䐆l耻Ï䃏ʀcfosuެ޷޼߂ߐĀiyޱ޵rc;䄴;䐙r;쀀𝔍pf;쀀𝕁ǣ߇\0ߌr;쀀𝒥rcy;䐈kcy;䐄΀HJacfosߤߨ߽߬߱ࠂࠈcy;䐥cy;䐌ppa;䎚Āey߶߻dil;䄶;䐚r;쀀𝔎pf;쀀𝕂cr;쀀𝒦րJTaceflmostࠥࠩࠬࡐࡣ঳সে্਷ੇcy;䐉耻<䀼ʀcmnpr࠷࠼ࡁࡄࡍute;䄹bda;䎛g;柪lacetrf;愒r;憞ƀaeyࡗ࡜ࡡron;䄽dil;䄻;䐛Āfsࡨ॰tԀACDFRTUVarࡾࢩࢱࣦ࣠ࣼयज़ΐ४Ānrࢃ࢏gleBracket;柨rowƀ;BR࢙࢚࢞憐ar;懤ightArrow;懆eiling;挈oǵࢷ\0ࣃbleBracket;柦nǔࣈ\0࣒eeVector;楡ectorĀ;Bࣛࣜ懃ar;楙loor;挊ightĀAV࣯ࣵrrow;憔ector;楎Āerँगeƀ;AVउऊऐ抣rrow;憤ector;楚iangleƀ;BEतथऩ抲ar;槏qual;抴pƀDTVषूौownVector;楑eeVector;楠ectorĀ;Bॖॗ憿ar;楘ectorĀ;B॥०憼ar;楒ightáΜs̀EFGLSTॾঋকঝঢভqualGreater;拚ullEqual;扦reater;扶ess;檡lantEqual;橽ilde;扲r;쀀𝔏Ā;eঽা拘ftarrow;懚idot;䄿ƀnpw৔ਖਛgȀLRlr৞৷ਂਐeftĀAR০৬rrow;柵ightArrow;柷ightArrow;柶eftĀarγਊightáοightáϊf;쀀𝕃erĀLRਢਬeftArrow;憙ightArrow;憘ƀchtਾੀੂòࡌ;憰rok;䅁;扪Ѐacefiosuਗ਼੝੠੷੼અઋ઎p;椅y;䐜Ādl੥੯iumSpace;恟lintrf;愳r;쀀𝔐nusPlus;戓pf;쀀𝕄cò੶;䎜ҀJacefostuણધભીଔଙඑ඗ඞcy;䐊cute;䅃ƀaey઴હાron;䅇dil;䅅;䐝ƀgswે૰଎ativeƀMTV૓૟૨ediumSpace;怋hiĀcn૦૘ë૙eryThiî૙tedĀGL૸ଆreaterGreateòٳessLesóੈLine;䀊r;쀀𝔑ȀBnptଢନଷ଺reak;恠BreakingSpace;䂠f;愕ڀ;CDEGHLNPRSTV୕ୖ୪୼஡௫ఄ౞಄ದ೘ൡඅ櫬Āou୛୤ngruent;扢pCap;扭oubleVerticalBar;戦ƀlqxஃஊ஛ement;戉ualĀ;Tஒஓ扠ilde;쀀≂̸ists;戄reater΀;EFGLSTஶஷ஽௉௓௘௥扯qual;扱ullEqual;쀀≧̸reater;쀀≫̸ess;批lantEqual;쀀⩾̸ilde;扵umpń௲௽ownHump;쀀≎̸qual;쀀≏̸eĀfsఊధtTriangleƀ;BEచఛడ拪ar;쀀⧏̸qual;括s̀;EGLSTవశ఼ౄోౘ扮qual;扰reater;扸ess;쀀≪̸lantEqual;쀀⩽̸ilde;扴estedĀGL౨౹reaterGreater;쀀⪢̸essLess;쀀⪡̸recedesƀ;ESಒಓಛ技qual;쀀⪯̸lantEqual;拠ĀeiಫಹverseElement;戌ghtTriangleƀ;BEೋೌ೒拫ar;쀀⧐̸qual;拭ĀquೝഌuareSuĀbp೨೹setĀ;E೰ೳ쀀⊏̸qual;拢ersetĀ;Eഃആ쀀⊐̸qual;拣ƀbcpഓതൎsetĀ;Eഛഞ쀀⊂⃒qual;抈ceedsȀ;ESTലള഻െ抁qual;쀀⪰̸lantEqual;拡ilde;쀀≿̸ersetĀ;E൘൛쀀⊃⃒qual;抉ildeȀ;EFT൮൯൵ൿ扁qual;扄ullEqual;扇ilde;扉erticalBar;戤cr;쀀𝒩ilde耻Ñ䃑;䎝܀Eacdfgmoprstuvලෂ෉෕ෛ෠෧෼ขภยา฿ไlig;䅒cute耻Ó䃓Āiy෎ීrc耻Ô䃔;䐞blac;䅐r;쀀𝔒rave耻Ò䃒ƀaei෮ෲ෶cr;䅌ga;䎩cron;䎟pf;쀀𝕆enCurlyĀDQฎบoubleQuote;怜uote;怘;橔Āclวฬr;쀀𝒪ash耻Ø䃘iŬื฼de耻Õ䃕es;樷ml耻Ö䃖erĀBP๋๠Āar๐๓r;怾acĀek๚๜;揞et;掴arenthesis;揜Ҁacfhilors๿ງຊຏຒດຝະ໼rtialD;戂y;䐟r;쀀𝔓i;䎦;䎠usMinus;䂱Āipຢອncareplanåڝf;愙Ȁ;eio຺ູ໠໤檻cedesȀ;EST່້໏໚扺qual;檯lantEqual;扼ilde;找me;怳Ādp໩໮uct;戏ortionĀ;aȥ໹l;戝Āci༁༆r;쀀𝒫;䎨ȀUfos༑༖༛༟OT耻"䀢r;쀀𝔔pf;愚cr;쀀𝒬؀BEacefhiorsu༾གྷཇའཱིྦྷྪྭ႖ႩႴႾarr;椐G耻®䂮ƀcnrཎནབute;䅔g;柫rĀ;tཛྷཝ憠l;椖ƀaeyཧཬཱron;䅘dil;䅖;䐠Ā;vླྀཹ愜erseĀEUྂྙĀlq྇ྎement;戋uilibrium;懋pEquilibrium;楯r»ཹo;䎡ghtЀACDFTUVa࿁࿫࿳ဢဨၛႇϘĀnr࿆࿒gleBracket;柩rowƀ;BL࿜࿝࿡憒ar;懥eftArrow;懄eiling;按oǵ࿹\0စbleBracket;柧nǔည\0နeeVector;楝ectorĀ;Bဝသ懂ar;楕loor;挋Āerိ၃eƀ;AVဵံြ抢rrow;憦ector;楛iangleƀ;BEၐၑၕ抳ar;槐qual;抵pƀDTVၣၮၸownVector;楏eeVector;楜ectorĀ;Bႂႃ憾ar;楔ectorĀ;B႑႒懀ar;楓Āpuႛ႞f;愝ndImplies;楰ightarrow;懛ĀchႹႼr;愛;憱leDelayed;槴ڀHOacfhimoqstuფჱჷჽᄙᄞᅑᅖᅡᅧᆵᆻᆿĀCcჩხHcy;䐩y;䐨FTcy;䐬cute;䅚ʀ;aeiyᄈᄉᄎᄓᄗ檼ron;䅠dil;䅞rc;䅜;䐡r;쀀𝔖ortȀDLRUᄪᄴᄾᅉownArrow»ОeftArrow»࢚ightArrow»࿝pArrow;憑gma;䎣allCircle;战pf;쀀𝕊ɲᅭ\0\0ᅰt;戚areȀ;ISUᅻᅼᆉᆯ斡ntersection;抓uĀbpᆏᆞsetĀ;Eᆗᆘ抏qual;抑ersetĀ;Eᆨᆩ抐qual;抒nion;抔cr;쀀𝒮ar;拆ȀbcmpᇈᇛሉላĀ;sᇍᇎ拐etĀ;Eᇍᇕqual;抆ĀchᇠህeedsȀ;ESTᇭᇮᇴᇿ扻qual;檰lantEqual;扽ilde;承Tháྌ;我ƀ;esሒሓሣ拑rsetĀ;Eሜም抃qual;抇et»ሓրHRSacfhiorsሾቄ቉ቕ቞ቱቶኟዂወዑORN耻Þ䃞ADE;愢ĀHc቎ቒcy;䐋y;䐦Ābuቚቜ;䀉;䎤ƀaeyብቪቯron;䅤dil;䅢;䐢r;쀀𝔗Āeiቻ኉ǲኀ\0ኇefore;戴a;䎘Ācn኎ኘkSpace;쀀  Space;怉ldeȀ;EFTካኬኲኼ戼qual;扃ullEqual;扅ilde;扈pf;쀀𝕋ipleDot;惛Āctዖዛr;쀀𝒯rok;䅦ૡዷጎጚጦ\0ጬጱ\0\0\0\0\0ጸጽ፷ᎅ\0᏿ᐄᐊᐐĀcrዻጁute耻Ú䃚rĀ;oጇገ憟cir;楉rǣጓ\0጖y;䐎ve;䅬Āiyጞጣrc耻Û䃛;䐣blac;䅰r;쀀𝔘rave耻Ù䃙acr;䅪Ādiፁ፩erĀBPፈ፝Āarፍፐr;䁟acĀekፗፙ;揟et;掵arenthesis;揝onĀ;P፰፱拃lus;抎Āgp፻፿on;䅲f;쀀𝕌ЀADETadps᎕ᎮᎸᏄϨᏒᏗᏳrrowƀ;BDᅐᎠᎤar;椒ownArrow;懅ownArrow;憕quilibrium;楮eeĀ;AᏋᏌ报rrow;憥ownáϳerĀLRᏞᏨeftArrow;憖ightArrow;憗iĀ;lᏹᏺ䏒on;䎥ing;䅮cr;쀀𝒰ilde;䅨ml耻Ü䃜ҀDbcdefosvᐧᐬᐰᐳᐾᒅᒊᒐᒖash;披ar;櫫y;䐒ashĀ;lᐻᐼ抩;櫦Āerᑃᑅ;拁ƀbtyᑌᑐᑺar;怖Ā;iᑏᑕcalȀBLSTᑡᑥᑪᑴar;戣ine;䁼eparator;杘ilde;所ThinSpace;怊r;쀀𝔙pf;쀀𝕍cr;쀀𝒱dash;抪ʀcefosᒧᒬᒱᒶᒼirc;䅴dge;拀r;쀀𝔚pf;쀀𝕎cr;쀀𝒲Ȁfiosᓋᓐᓒᓘr;쀀𝔛;䎞pf;쀀𝕏cr;쀀𝒳ҀAIUacfosuᓱᓵᓹᓽᔄᔏᔔᔚᔠcy;䐯cy;䐇cy;䐮cute耻Ý䃝Āiyᔉᔍrc;䅶;䐫r;쀀𝔜pf;쀀𝕐cr;쀀𝒴ml;䅸ЀHacdefosᔵᔹᔿᕋᕏᕝᕠᕤcy;䐖cute;䅹Āayᕄᕉron;䅽;䐗ot;䅻ǲᕔ\0ᕛoWidtè૙a;䎖r;愨pf;愤cr;쀀𝒵௡ᖃᖊᖐ\0ᖰᖶᖿ\0\0\0\0ᗆᗛᗫᙟ᙭\0ᚕ᚛ᚲᚹ\0ᚾcute耻á䃡reve;䄃̀;Ediuyᖜᖝᖡᖣᖨᖭ戾;쀀∾̳;房rc耻â䃢te肻´̆;䐰lig耻æ䃦Ā;r²ᖺ;쀀𝔞rave耻à䃠ĀepᗊᗖĀfpᗏᗔsym;愵èᗓha;䎱ĀapᗟcĀclᗤᗧr;䄁g;樿ɤᗰ\0\0ᘊʀ;adsvᗺᗻᗿᘁᘇ戧nd;橕;橜lope;橘;橚΀;elmrszᘘᘙᘛᘞᘿᙏᙙ戠;榤e»ᘙsdĀ;aᘥᘦ戡ѡᘰᘲᘴᘶᘸᘺᘼᘾ;榨;榩;榪;榫;榬;榭;榮;榯tĀ;vᙅᙆ戟bĀ;dᙌᙍ抾;榝Āptᙔᙗh;戢»¹arr;捼Āgpᙣᙧon;䄅f;쀀𝕒΀;Eaeiop዁ᙻᙽᚂᚄᚇᚊ;橰cir;橯;扊d;手s;䀧roxĀ;e዁ᚒñᚃing耻å䃥ƀctyᚡᚦᚨr;쀀𝒶;䀪mpĀ;e዁ᚯñʈilde耻ã䃣ml耻ä䃤Āciᛂᛈoninôɲnt;樑ࠀNabcdefiklnoprsu᛭ᛱᜰ᜼ᝃᝈ᝸᝽០៦ᠹᡐᜍ᤽᥈ᥰot;櫭Ācrᛶ᜞kȀcepsᜀᜅᜍᜓong;扌psilon;䏶rime;怵imĀ;e᜚᜛戽q;拍Ŷᜢᜦee;抽edĀ;gᜬᜭ挅e»ᜭrkĀ;t፜᜷brk;掶Āoyᜁᝁ;䐱quo;怞ʀcmprtᝓ᝛ᝡᝤᝨausĀ;eĊĉptyv;榰séᜌnoõēƀahwᝯ᝱ᝳ;䎲;愶een;扬r;쀀𝔟g΀costuvwឍឝឳេ៕៛៞ƀaiuបពរðݠrc;旯p»፱ƀdptឤឨឭot;樀lus;樁imes;樂ɱឹ\0\0ើcup;樆ar;昅riangleĀdu៍្own;施p;斳plus;樄eåᑄåᒭarow;植ƀako៭ᠦᠵĀcn៲ᠣkƀlst៺֫᠂ozenge;槫riangleȀ;dlr᠒᠓᠘᠝斴own;斾eft;旂ight;斸k;搣Ʊᠫ\0ᠳƲᠯ\0ᠱ;斒;斑4;斓ck;斈ĀeoᠾᡍĀ;qᡃᡆ쀀=⃥uiv;쀀≡⃥t;挐Ȁptwxᡙᡞᡧᡬf;쀀𝕓Ā;tᏋᡣom»Ꮜtie;拈؀DHUVbdhmptuvᢅᢖᢪᢻᣗᣛᣬ᣿ᤅᤊᤐᤡȀLRlrᢎᢐᢒᢔ;敗;敔;敖;敓ʀ;DUduᢡᢢᢤᢦᢨ敐;敦;敩;敤;敧ȀLRlrᢳᢵᢷᢹ;敝;敚;敜;教΀;HLRhlrᣊᣋᣍᣏᣑᣓᣕ救;敬;散;敠;敫;敢;敟ox;槉ȀLRlrᣤᣦᣨᣪ;敕;敒;攐;攌ʀ;DUduڽ᣷᣹᣻᣽;敥;敨;攬;攴inus;抟lus;択imes;抠ȀLRlrᤙᤛᤝ᤟;敛;敘;攘;攔΀;HLRhlrᤰᤱᤳᤵᤷ᤻᤹攂;敪;敡;敞;攼;攤;攜Āevģ᥂bar耻¦䂦Ȁceioᥑᥖᥚᥠr;쀀𝒷mi;恏mĀ;e᜚᜜lƀ;bhᥨᥩᥫ䁜;槅sub;柈Ŭᥴ᥾lĀ;e᥹᥺怢t»᥺pƀ;Eeįᦅᦇ;檮Ā;qۜۛೡᦧ\0᧨ᨑᨕᨲ\0ᨷᩐ\0\0᪴\0\0᫁\0\0ᬡᬮ᭍᭒\0᯽\0ᰌƀcpr᦭ᦲ᧝ute;䄇̀;abcdsᦿᧀᧄ᧊᧕᧙戩nd;橄rcup;橉Āau᧏᧒p;橋p;橇ot;橀;쀀∩︀Āeo᧢᧥t;恁îړȀaeiu᧰᧻ᨁᨅǰ᧵\0᧸s;橍on;䄍dil耻ç䃧rc;䄉psĀ;sᨌᨍ橌m;橐ot;䄋ƀdmnᨛᨠᨦil肻¸ƭptyv;榲t脀¢;eᨭᨮ䂢räƲr;쀀𝔠ƀceiᨽᩀᩍy;䑇ckĀ;mᩇᩈ朓ark»ᩈ;䏇r΀;Ecefms᩟᩠ᩢᩫ᪤᪪᪮旋;槃ƀ;elᩩᩪᩭ䋆q;扗eɡᩴ\0\0᪈rrowĀlr᩼᪁eft;憺ight;憻ʀRSacd᪒᪔᪖᪚᪟»ཇ;擈st;抛irc;抚ash;抝nint;樐id;櫯cir;槂ubsĀ;u᪻᪼晣it»᪼ˬ᫇᫔᫺\0ᬊonĀ;eᫍᫎ䀺Ā;qÇÆɭ᫙\0\0᫢aĀ;t᫞᫟䀬;䁀ƀ;fl᫨᫩᫫戁îᅠeĀmx᫱᫶ent»᫩eóɍǧ᫾\0ᬇĀ;dኻᬂot;橭nôɆƀfryᬐᬔᬗ;쀀𝕔oäɔ脀©;sŕᬝr;愗Āaoᬥᬩrr;憵ss;朗Ācuᬲᬷr;쀀𝒸Ābpᬼ᭄Ā;eᭁᭂ櫏;櫑Ā;eᭉᭊ櫐;櫒dot;拯΀delprvw᭠᭬᭷ᮂᮬᯔ᯹arrĀlr᭨᭪;椸;椵ɰ᭲\0\0᭵r;拞c;拟arrĀ;p᭿ᮀ憶;椽̀;bcdosᮏᮐᮖᮡᮥᮨ截rcap;橈Āauᮛᮞp;橆p;橊ot;抍r;橅;쀀∪︀Ȁalrv᮵ᮿᯞᯣrrĀ;mᮼᮽ憷;椼yƀevwᯇᯔᯘqɰᯎ\0\0ᯒreã᭳uã᭵ee;拎edge;拏en耻¤䂤earrowĀlrᯮ᯳eft»ᮀight»ᮽeäᯝĀciᰁᰇoninôǷnt;戱lcty;挭ঀAHabcdefhijlorstuwz᰸᰻᰿ᱝᱩᱵᲊᲞᲬᲷ᳻᳿ᴍᵻᶑᶫᶻ᷆᷍rò΁ar;楥Ȁglrs᱈ᱍ᱒᱔ger;怠eth;愸òᄳhĀ;vᱚᱛ怐»ऊūᱡᱧarow;椏aã̕Āayᱮᱳron;䄏;䐴ƀ;ao̲ᱼᲄĀgrʿᲁr;懊tseq;橷ƀglmᲑᲔᲘ耻°䂰ta;䎴ptyv;榱ĀirᲣᲨsht;楿;쀀𝔡arĀlrᲳᲵ»ࣜ»သʀaegsv᳂͸᳖᳜᳠mƀ;oș᳊᳔ndĀ;ș᳑uit;晦amma;䏝in;拲ƀ;io᳧᳨᳸䃷de脀÷;o᳧ᳰntimes;拇nø᳷cy;䑒cɯᴆ\0\0ᴊrn;挞op;挍ʀlptuwᴘᴝᴢᵉᵕlar;䀤f;쀀𝕕ʀ;emps̋ᴭᴷᴽᵂqĀ;d͒ᴳot;扑inus;戸lus;戔quare;抡blebarwedgåúnƀadhᄮᵝᵧownarrowóᲃarpoonĀlrᵲᵶefôᲴighôᲶŢᵿᶅkaro÷གɯᶊ\0\0ᶎrn;挟op;挌ƀcotᶘᶣᶦĀryᶝᶡ;쀀𝒹;䑕l;槶rok;䄑Ādrᶰᶴot;拱iĀ;fᶺ᠖斿Āah᷀᷃ròЩaòྦangle;榦Āci᷒ᷕy;䑟grarr;柿ऀDacdefglmnopqrstuxḁḉḙḸոḼṉṡṾấắẽỡἪἷὄ὎὚ĀDoḆᴴoôᲉĀcsḎḔute耻é䃩ter;橮ȀaioyḢḧḱḶron;䄛rĀ;cḭḮ扖耻ê䃪lon;払;䑍ot;䄗ĀDrṁṅot;扒;쀀𝔢ƀ;rsṐṑṗ檚ave耻è䃨Ā;dṜṝ檖ot;檘Ȁ;ilsṪṫṲṴ檙nters;揧;愓Ā;dṹṺ檕ot;檗ƀapsẅẉẗcr;䄓tyƀ;svẒẓẕ戅et»ẓpĀ1;ẝẤĳạả;怄;怅怃ĀgsẪẬ;䅋p;怂ĀgpẴẸon;䄙f;쀀𝕖ƀalsỄỎỒrĀ;sỊị拕l;槣us;橱iƀ;lvỚớở䎵on»ớ;䏵ȀcsuvỪỳἋἣĀioữḱrc»Ḯɩỹ\0\0ỻíՈantĀglἂἆtr»ṝess»Ṻƀaeiἒ἖Ἒls;䀽st;扟vĀ;DȵἠD;橸parsl;槥ĀDaἯἳot;打rr;楱ƀcdiἾὁỸr;愯oô͒ĀahὉὋ;䎷耻ð䃰Āmrὓὗl耻ë䃫o;悬ƀcipὡὤὧl;䀡sôծĀeoὬὴctatioîՙnentialåչৡᾒ\0ᾞ\0ᾡᾧ\0\0ῆῌ\0ΐ\0ῦῪ \0 ⁚llingdotseñṄy;䑄male;晀ƀilrᾭᾳ῁lig;耀ﬃɩᾹ\0\0᾽g;耀ﬀig;耀ﬄ;쀀𝔣lig;耀ﬁlig;쀀fjƀaltῙ῜ῡt;晭ig;耀ﬂns;斱of;䆒ǰ΅\0ῳf;쀀𝕗ĀakֿῷĀ;vῼ´拔;櫙artint;樍Āao‌⁕Ācs‑⁒α‚‰‸⁅⁈\0⁐β•‥‧‪‬\0‮耻½䂽;慓耻¼䂼;慕;慙;慛Ƴ‴\0‶;慔;慖ʴ‾⁁\0\0⁃耻¾䂾;慗;慜5;慘ƶ⁌\0⁎;慚;慝8;慞l;恄wn;挢cr;쀀𝒻ࢀEabcdefgijlnorstv₂₉₟₥₰₴⃰⃵⃺⃿℃ℒℸ̗ℾ⅒↞Ā;lٍ₇;檌ƀcmpₐₕ₝ute;䇵maĀ;dₜ᳚䎳;檆reve;䄟Āiy₪₮rc;䄝;䐳ot;䄡Ȁ;lqsؾق₽⃉ƀ;qsؾٌ⃄lanô٥Ȁ;cdl٥⃒⃥⃕c;檩otĀ;o⃜⃝檀Ā;l⃢⃣檂;檄Ā;e⃪⃭쀀⋛︀s;檔r;쀀𝔤Ā;gٳ؛mel;愷cy;䑓Ȁ;Eajٚℌℎℐ;檒;檥;檤ȀEaesℛℝ℩ℴ;扩pĀ;p℣ℤ檊rox»ℤĀ;q℮ℯ檈Ā;q℮ℛim;拧pf;쀀𝕘Āci⅃ⅆr;愊mƀ;el٫ⅎ⅐;檎;檐茀>;cdlqr׮ⅠⅪⅮⅳⅹĀciⅥⅧ;檧r;橺ot;拗Par;榕uest;橼ʀadelsↄⅪ←ٖ↛ǰ↉\0↎proø₞r;楸qĀlqؿ↖lesó₈ií٫Āen↣↭rtneqq;쀀≩︀Å↪ԀAabcefkosy⇄⇇⇱⇵⇺∘∝∯≨≽ròΠȀilmr⇐⇔⇗⇛rsðᒄf»․ilôکĀdr⇠⇤cy;䑊ƀ;cwࣴ⇫⇯ir;楈;憭ar;意irc;䄥ƀalr∁∎∓rtsĀ;u∉∊晥it»∊lip;怦con;抹r;쀀𝔥sĀew∣∩arow;椥arow;椦ʀamopr∺∾≃≞≣rr;懿tht;戻kĀlr≉≓eftarrow;憩ightarrow;憪f;쀀𝕙bar;怕ƀclt≯≴≸r;쀀𝒽asè⇴rok;䄧Ābp⊂⊇ull;恃hen»ᱛૡ⊣\0⊪\0⊸⋅⋎\0⋕⋳\0\0⋸⌢⍧⍢⍿\0⎆⎪⎴cute耻í䃭ƀ;iyݱ⊰⊵rc耻î䃮;䐸Ācx⊼⊿y;䐵cl耻¡䂡ĀfrΟ⋉;쀀𝔦rave耻ì䃬Ȁ;inoܾ⋝⋩⋮Āin⋢⋦nt;樌t;戭fin;槜ta;愩lig;䄳ƀaop⋾⌚⌝ƀcgt⌅⌈⌗r;䄫ƀelpܟ⌏⌓inåގarôܠh;䄱f;抷ed;䆵ʀ;cfotӴ⌬⌱⌽⍁are;愅inĀ;t⌸⌹戞ie;槝doô⌙ʀ;celpݗ⍌⍐⍛⍡al;抺Āgr⍕⍙eróᕣã⍍arhk;樗rod;樼Ȁcgpt⍯⍲⍶⍻y;䑑on;䄯f;쀀𝕚a;䎹uest耻¿䂿Āci⎊⎏r;쀀𝒾nʀ;EdsvӴ⎛⎝⎡ӳ;拹ot;拵Ā;v⎦⎧拴;拳Ā;iݷ⎮lde;䄩ǫ⎸\0⎼cy;䑖l耻ï䃯̀cfmosu⏌⏗⏜⏡⏧⏵Āiy⏑⏕rc;䄵;䐹r;쀀𝔧ath;䈷pf;쀀𝕛ǣ⏬\0⏱r;쀀𝒿rcy;䑘kcy;䑔Ѐacfghjos␋␖␢␧␭␱␵␻ppaĀ;v␓␔䎺;䏰Āey␛␠dil;䄷;䐺r;쀀𝔨reen;䄸cy;䑅cy;䑜pf;쀀𝕜cr;쀀𝓀஀ABEHabcdefghjlmnoprstuv⑰⒁⒆⒍⒑┎┽╚▀♎♞♥♹♽⚚⚲⛘❝❨➋⟀⠁⠒ƀart⑷⑺⑼rò৆òΕail;椛arr;椎Ā;gঔ⒋;檋ar;楢ॣ⒥\0⒪\0⒱\0\0\0\0\0⒵Ⓔ\0ⓆⓈⓍ\0⓹ute;䄺mptyv;榴raîࡌbda;䎻gƀ;dlࢎⓁⓃ;榑åࢎ;檅uo耻«䂫rЀ;bfhlpst࢙ⓞⓦⓩ⓫⓮⓱⓵Ā;f࢝ⓣs;椟s;椝ë≒p;憫l;椹im;楳l;憢ƀ;ae⓿─┄檫il;椙Ā;s┉┊檭;쀀⪭︀ƀabr┕┙┝rr;椌rk;杲Āak┢┬cĀek┨┪;䁻;䁛Āes┱┳;榋lĀdu┹┻;榏;榍Ȁaeuy╆╋╖╘ron;䄾Ādi═╔il;䄼ìࢰâ┩;䐻Ȁcqrs╣╦╭╽a;椶uoĀ;rนᝆĀdu╲╷har;楧shar;楋h;憲ʀ;fgqs▋▌উ◳◿扤tʀahlrt▘▤▷◂◨rrowĀ;t࢙□aé⓶arpoonĀdu▯▴own»њp»०eftarrows;懇ightƀahs◍◖◞rrowĀ;sࣴࢧarpoonó྘quigarro÷⇰hreetimes;拋ƀ;qs▋ও◺lanôবʀ;cdgsব☊☍☝☨c;檨otĀ;o☔☕橿Ā;r☚☛檁;檃Ā;e☢☥쀀⋚︀s;檓ʀadegs☳☹☽♉♋pproøⓆot;拖qĀgq♃♅ôউgtò⒌ôছiíলƀilr♕࣡♚sht;楼;쀀𝔩Ā;Eজ♣;檑š♩♶rĀdu▲♮Ā;l॥♳;楪lk;斄cy;䑙ʀ;achtੈ⚈⚋⚑⚖rò◁orneòᴈard;楫ri;旺Āio⚟⚤dot;䅀ustĀ;a⚬⚭掰che»⚭ȀEaes⚻⚽⛉⛔;扨pĀ;p⛃⛄檉rox»⛄Ā;q⛎⛏檇Ā;q⛎⚻im;拦Ѐabnoptwz⛩⛴⛷✚✯❁❇❐Ānr⛮⛱g;柬r;懽rëࣁgƀlmr⛿✍✔eftĀar০✇ightá৲apsto;柼ightá৽parrowĀlr✥✩efô⓭ight;憬ƀafl✶✹✽r;榅;쀀𝕝us;樭imes;樴š❋❏st;戗áፎƀ;ef❗❘᠀旊nge»❘arĀ;l❤❥䀨t;榓ʀachmt❳❶❼➅➇ròࢨorneòᶌarĀ;d྘➃;業;怎ri;抿̀achiqt➘➝ੀ➢➮➻quo;怹r;쀀𝓁mƀ;egল➪➬;檍;檏Ābu┪➳oĀ;rฟ➹;怚rok;䅂萀<;cdhilqrࠫ⟒☹⟜⟠⟥⟪⟰Āci⟗⟙;檦r;橹reå◲mes;拉arr;楶uest;橻ĀPi⟵⟹ar;榖ƀ;ef⠀भ᠛旃rĀdu⠇⠍shar;楊har;楦Āen⠗⠡rtneqq;쀀≨︀Å⠞܀Dacdefhilnopsu⡀⡅⢂⢎⢓⢠⢥⢨⣚⣢⣤ઃ⣳⤂Dot;戺Ȁclpr⡎⡒⡣⡽r耻¯䂯Āet⡗⡙;時Ā;e⡞⡟朠se»⡟Ā;sျ⡨toȀ;dluျ⡳⡷⡻owîҌefôएðᏑker;斮Āoy⢇⢌mma;権;䐼ash;怔asuredangle»ᘦr;쀀𝔪o;愧ƀcdn⢯⢴⣉ro耻µ䂵Ȁ;acdᑤ⢽⣀⣄sôᚧir;櫰ot肻·Ƶusƀ;bd⣒ᤃ⣓戒Ā;uᴼ⣘;横ţ⣞⣡p;櫛ò−ðઁĀdp⣩⣮els;抧f;쀀𝕞Āct⣸⣽r;쀀𝓂pos»ᖝƀ;lm⤉⤊⤍䎼timap;抸ఀGLRVabcdefghijlmoprstuvw⥂⥓⥾⦉⦘⧚⧩⨕⨚⩘⩝⪃⪕⪤⪨⬄⬇⭄⭿⮮ⰴⱧⱼ⳩Āgt⥇⥋;쀀⋙̸Ā;v⥐௏쀀≫⃒ƀelt⥚⥲⥶ftĀar⥡⥧rrow;懍ightarrow;懎;쀀⋘̸Ā;v⥻ే쀀≪⃒ightarrow;懏ĀDd⦎⦓ash;抯ash;抮ʀbcnpt⦣⦧⦬⦱⧌la»˞ute;䅄g;쀀∠⃒ʀ;Eiop඄⦼⧀⧅⧈;쀀⩰̸d;쀀≋̸s;䅉roø඄urĀ;a⧓⧔普lĀ;s⧓ସǳ⧟\0⧣p肻 ଷmpĀ;e௹ఀʀaeouy⧴⧾⨃⨐⨓ǰ⧹\0⧻;橃on;䅈dil;䅆ngĀ;dൾ⨊ot;쀀⩭̸p;橂;䐽ash;怓΀;Aadqsxஒ⨩⨭⨻⩁⩅⩐rr;懗rĀhr⨳⨶k;椤Ā;oᏲᏰot;쀀≐̸uiöୣĀei⩊⩎ar;椨í஘istĀ;s஠டr;쀀𝔫ȀEest௅⩦⩹⩼ƀ;qs஼⩭௡ƀ;qs஼௅⩴lanô௢ií௪Ā;rஶ⪁»ஷƀAap⪊⪍⪑rò⥱rr;憮ar;櫲ƀ;svྍ⪜ྌĀ;d⪡⪢拼;拺cy;䑚΀AEadest⪷⪺⪾⫂⫅⫶⫹rò⥦;쀀≦̸rr;憚r;急Ȁ;fqs఻⫎⫣⫯tĀar⫔⫙rro÷⫁ightarro÷⪐ƀ;qs఻⪺⫪lanôౕĀ;sౕ⫴»శiíౝĀ;rవ⫾iĀ;eచథiäඐĀpt⬌⬑f;쀀𝕟膀¬;in⬙⬚⬶䂬nȀ;Edvஉ⬤⬨⬮;쀀⋹̸ot;쀀⋵̸ǡஉ⬳⬵;拷;拶iĀ;vಸ⬼ǡಸ⭁⭃;拾;拽ƀaor⭋⭣⭩rȀ;ast୻⭕⭚⭟lleì୻l;쀀⫽⃥;쀀∂̸lint;樔ƀ;ceಒ⭰⭳uåಥĀ;cಘ⭸Ā;eಒ⭽ñಘȀAait⮈⮋⮝⮧rò⦈rrƀ;cw⮔⮕⮙憛;쀀⤳̸;쀀↝̸ghtarrow»⮕riĀ;eೋೖ΀chimpqu⮽⯍⯙⬄୸⯤⯯Ȁ;cerല⯆ഷ⯉uå൅;쀀𝓃ortɭ⬅\0\0⯖ará⭖mĀ;e൮⯟Ā;q൴൳suĀbp⯫⯭å೸åഋƀbcp⯶ⰑⰙȀ;Ees⯿ⰀഢⰄ抄;쀀⫅̸etĀ;eഛⰋqĀ;qണⰀcĀ;eലⰗñസȀ;EesⰢⰣൟⰧ抅;쀀⫆̸etĀ;e൘ⰮqĀ;qൠⰣȀgilrⰽⰿⱅⱇìௗlde耻ñ䃱çృiangleĀlrⱒⱜeftĀ;eచⱚñదightĀ;eೋⱥñ೗Ā;mⱬⱭ䎽ƀ;esⱴⱵⱹ䀣ro;愖p;怇ҀDHadgilrsⲏⲔⲙⲞⲣⲰⲶⳓⳣash;抭arr;椄p;쀀≍⃒ash;抬ĀetⲨⲬ;쀀≥⃒;쀀>⃒nfin;槞ƀAetⲽⳁⳅrr;椂;쀀≤⃒Ā;rⳊⳍ쀀<⃒ie;쀀⊴⃒ĀAtⳘⳜrr;椃rie;쀀⊵⃒im;쀀∼⃒ƀAan⳰⳴ⴂrr;懖rĀhr⳺⳽k;椣Ā;oᏧᏥear;椧ቓ᪕\0\0\0\0\0\0\0\0\0\0\0\0\0ⴭ\0ⴸⵈⵠⵥ⵲ⶄᬇ\0\0ⶍⶫ\0ⷈⷎ\0ⷜ⸙⸫⸾⹃Ācsⴱ᪗ute耻ó䃳ĀiyⴼⵅrĀ;c᪞ⵂ耻ô䃴;䐾ʀabios᪠ⵒⵗǈⵚlac;䅑v;樸old;榼lig;䅓Ācr⵩⵭ir;榿;쀀𝔬ͯ⵹\0\0⵼\0ⶂn;䋛ave耻ò䃲;槁Ābmⶈ෴ar;榵Ȁacitⶕ⶘ⶥⶨrò᪀Āir⶝ⶠr;榾oss;榻nå๒;槀ƀaeiⶱⶵⶹcr;䅍ga;䏉ƀcdnⷀⷅǍron;䎿;榶pf;쀀𝕠ƀaelⷔ⷗ǒr;榷rp;榹΀;adiosvⷪⷫⷮ⸈⸍⸐⸖戨rò᪆Ȁ;efmⷷⷸ⸂⸅橝rĀ;oⷾⷿ愴f»ⷿ耻ª䂪耻º䂺gof;抶r;橖lope;橗;橛ƀclo⸟⸡⸧ò⸁ash耻ø䃸l;折iŬⸯ⸴de耻õ䃵esĀ;aǛ⸺s;樶ml耻ö䃶bar;挽ૡ⹞\0⹽\0⺀⺝\0⺢⺹\0\0⻋ຜ\0⼓\0\0⼫⾼\0⿈rȀ;astЃ⹧⹲຅脀¶;l⹭⹮䂶leìЃɩ⹸\0\0⹻m;櫳;櫽y;䐿rʀcimpt⺋⺏⺓ᡥ⺗nt;䀥od;䀮il;怰enk;怱r;쀀𝔭ƀimo⺨⺰⺴Ā;v⺭⺮䏆;䏕maô੶ne;明ƀ;tv⺿⻀⻈䏀chfork»´;䏖Āau⻏⻟nĀck⻕⻝kĀ;h⇴⻛;愎ö⇴sҀ;abcdemst⻳⻴ᤈ⻹⻽⼄⼆⼊⼎䀫cir;樣ir;樢Āouᵀ⼂;樥;橲n肻±ຝim;樦wo;樧ƀipu⼙⼠⼥ntint;樕f;쀀𝕡nd耻£䂣Ԁ;Eaceinosu່⼿⽁⽄⽇⾁⾉⾒⽾⾶;檳p;檷uå໙Ā;c໎⽌̀;acens່⽙⽟⽦⽨⽾pproø⽃urlyeñ໙ñ໎ƀaes⽯⽶⽺pprox;檹qq;檵im;拨iíໟmeĀ;s⾈ຮ怲ƀEas⽸⾐⽺ð⽵ƀdfp໬⾙⾯ƀals⾠⾥⾪lar;挮ine;挒urf;挓Ā;t໻⾴ï໻rel;抰Āci⿀⿅r;쀀𝓅;䏈ncsp;怈̀fiopsu⿚⋢⿟⿥⿫⿱r;쀀𝔮pf;쀀𝕢rime;恗cr;쀀𝓆ƀaeo⿸〉〓tĀei⿾々rnionóڰnt;樖stĀ;e【】䀿ñἙô༔઀ABHabcdefhilmnoprstux぀けさすムㄎㄫㅇㅢㅲㆎ㈆㈕㈤㈩㉘㉮㉲㊐㊰㊷ƀartぇおがròႳòϝail;検aròᱥar;楤΀cdenqrtとふへみわゔヌĀeuねぱ;쀀∽̱te;䅕iãᅮmptyv;榳gȀ;del࿑らるろ;榒;榥å࿑uo耻»䂻rր;abcfhlpstw࿜ガクシスゼゾダッデナp;極Ā;f࿠ゴs;椠;椳s;椞ë≝ð✮l;楅im;楴l;憣;憝Āaiパフil;椚oĀ;nホボ戶aló༞ƀabrョリヮrò៥rk;杳ĀakンヽcĀekヹ・;䁽;䁝Āes㄂㄄;榌lĀduㄊㄌ;榎;榐Ȁaeuyㄗㄜㄧㄩron;䅙Ādiㄡㄥil;䅗ì࿲âヺ;䑀Ȁclqsㄴㄷㄽㅄa;椷dhar;楩uoĀ;rȎȍh;憳ƀacgㅎㅟངlȀ;ipsླྀㅘㅛႜnåႻarôྩt;断ƀilrㅩဣㅮsht;楽;쀀𝔯ĀaoㅷㆆrĀduㅽㅿ»ѻĀ;l႑ㆄ;楬Ā;vㆋㆌ䏁;䏱ƀgns㆕ㇹㇼht̀ahlrstㆤㆰ㇂㇘㇤㇮rrowĀ;t࿜ㆭaéトarpoonĀduㆻㆿowîㅾp»႒eftĀah㇊㇐rrowó࿪arpoonóՑightarrows;應quigarro÷ニhreetimes;拌g;䋚ingdotseñἲƀahm㈍㈐㈓rò࿪aòՑ;怏oustĀ;a㈞㈟掱che»㈟mid;櫮Ȁabpt㈲㈽㉀㉒Ānr㈷㈺g;柭r;懾rëဃƀafl㉇㉊㉎r;榆;쀀𝕣us;樮imes;樵Āap㉝㉧rĀ;g㉣㉤䀩t;榔olint;樒arò㇣Ȁachq㉻㊀Ⴜ㊅quo;怺r;쀀𝓇Ābu・㊊oĀ;rȔȓƀhir㊗㊛㊠reåㇸmes;拊iȀ;efl㊪ၙᠡ㊫方tri;槎luhar;楨;愞ൡ㋕㋛㋟㌬㌸㍱\0㍺㎤\0\0㏬㏰\0㐨㑈㑚㒭㒱㓊㓱\0㘖\0\0㘳cute;䅛quï➺Ԁ;Eaceinpsyᇭ㋳㋵㋿㌂㌋㌏㌟㌦㌩;檴ǰ㋺\0㋼;檸on;䅡uåᇾĀ;dᇳ㌇il;䅟rc;䅝ƀEas㌖㌘㌛;檶p;檺im;择olint;樓iíሄ;䑁otƀ;be㌴ᵇ㌵担;橦΀Aacmstx㍆㍊㍗㍛㍞㍣㍭rr;懘rĀhr㍐㍒ë∨Ā;oਸ਼਴t耻§䂧i;䀻war;椩mĀin㍩ðnuóñt;朶rĀ;o㍶⁕쀀𝔰Ȁacoy㎂㎆㎑㎠rp;景Āhy㎋㎏cy;䑉;䑈rtɭ㎙\0\0㎜iäᑤaraì⹯耻­䂭Āgm㎨㎴maƀ;fv㎱㎲㎲䏃;䏂Ѐ;deglnprካ㏅㏉㏎㏖㏞㏡㏦ot;橪Ā;q኱ኰĀ;E㏓㏔檞;檠Ā;E㏛㏜檝;檟e;扆lus;樤arr;楲aròᄽȀaeit㏸㐈㐏㐗Āls㏽㐄lsetmé㍪hp;樳parsl;槤Ādlᑣ㐔e;挣Ā;e㐜㐝檪Ā;s㐢㐣檬;쀀⪬︀ƀflp㐮㐳㑂tcy;䑌Ā;b㐸㐹䀯Ā;a㐾㐿槄r;挿f;쀀𝕤aĀdr㑍ЂesĀ;u㑔㑕晠it»㑕ƀcsu㑠㑹㒟Āau㑥㑯pĀ;sᆈ㑫;쀀⊓︀pĀ;sᆴ㑵;쀀⊔︀uĀbp㑿㒏ƀ;esᆗᆜ㒆etĀ;eᆗ㒍ñᆝƀ;esᆨᆭ㒖etĀ;eᆨ㒝ñᆮƀ;afᅻ㒦ְrť㒫ֱ»ᅼaròᅈȀcemt㒹㒾㓂㓅r;쀀𝓈tmîñiì㐕aræᆾĀar㓎㓕rĀ;f㓔ឿ昆Āan㓚㓭ightĀep㓣㓪psiloîỠhé⺯s»⡒ʀbcmnp㓻㕞ሉ㖋㖎Ҁ;Edemnprs㔎㔏㔑㔕㔞㔣㔬㔱㔶抂;櫅ot;檽Ā;dᇚ㔚ot;櫃ult;櫁ĀEe㔨㔪;櫋;把lus;檿arr;楹ƀeiu㔽㕒㕕tƀ;en㔎㕅㕋qĀ;qᇚ㔏eqĀ;q㔫㔨m;櫇Ābp㕚㕜;櫕;櫓c̀;acensᇭ㕬㕲㕹㕻㌦pproø㋺urlyeñᇾñᇳƀaes㖂㖈㌛pproø㌚qñ㌗g;晪ڀ123;Edehlmnps㖩㖬㖯ሜ㖲㖴㗀㗉㗕㗚㗟㗨㗭耻¹䂹耻²䂲耻³䂳;櫆Āos㖹㖼t;檾ub;櫘Ā;dሢ㗅ot;櫄sĀou㗏㗒l;柉b;櫗arr;楻ult;櫂ĀEe㗤㗦;櫌;抋lus;櫀ƀeiu㗴㘉㘌tƀ;enሜ㗼㘂qĀ;qሢ㖲eqĀ;q㗧㗤m;櫈Ābp㘑㘓;櫔;櫖ƀAan㘜㘠㘭rr;懙rĀhr㘦㘨ë∮Ā;oਫ਩war;椪lig耻ß䃟௡㙑㙝㙠ዎ㙳㙹\0㙾㛂\0\0\0\0\0㛛㜃\0㜉㝬\0\0\0㞇ɲ㙖\0\0㙛get;挖;䏄rë๟ƀaey㙦㙫㙰ron;䅥dil;䅣;䑂lrec;挕r;쀀𝔱Ȁeiko㚆㚝㚵㚼ǲ㚋\0㚑eĀ4fኄኁaƀ;sv㚘㚙㚛䎸ym;䏑Ācn㚢㚲kĀas㚨㚮pproø዁im»ኬsðኞĀas㚺㚮ð዁rn耻þ䃾Ǭ̟㛆⋧es膀×;bd㛏㛐㛘䃗Ā;aᤏ㛕r;樱;樰ƀeps㛡㛣㜀á⩍Ȁ;bcf҆㛬㛰㛴ot;挶ir;櫱Ā;o㛹㛼쀀𝕥rk;櫚á㍢rime;怴ƀaip㜏㜒㝤dåቈ΀adempst㜡㝍㝀㝑㝗㝜㝟ngleʀ;dlqr㜰㜱㜶㝀㝂斵own»ᶻeftĀ;e⠀㜾ñम;扜ightĀ;e㊪㝋ñၚot;旬inus;樺lus;樹b;槍ime;樻ezium;揢ƀcht㝲㝽㞁Āry㝷㝻;쀀𝓉;䑆cy;䑛rok;䅧Āio㞋㞎xô᝷headĀlr㞗㞠eftarro÷ࡏightarrow»ཝऀAHabcdfghlmoprstuw㟐㟓㟗㟤㟰㟼㠎㠜㠣㠴㡑㡝㡫㢩㣌㣒㣪㣶ròϭar;楣Ācr㟜㟢ute耻ú䃺òᅐrǣ㟪\0㟭y;䑞ve;䅭Āiy㟵㟺rc耻û䃻;䑃ƀabh㠃㠆㠋ròᎭlac;䅱aòᏃĀir㠓㠘sht;楾;쀀𝔲rave耻ù䃹š㠧㠱rĀlr㠬㠮»ॗ»ႃlk;斀Āct㠹㡍ɯ㠿\0\0㡊rnĀ;e㡅㡆挜r»㡆op;挏ri;旸Āal㡖㡚cr;䅫肻¨͉Āgp㡢㡦on;䅳f;쀀𝕦̀adhlsuᅋ㡸㡽፲㢑㢠ownáᎳarpoonĀlr㢈㢌efô㠭ighô㠯iƀ;hl㢙㢚㢜䏅»ᏺon»㢚parrows;懈ƀcit㢰㣄㣈ɯ㢶\0\0㣁rnĀ;e㢼㢽挝r»㢽op;挎ng;䅯ri;旹cr;쀀𝓊ƀdir㣙㣝㣢ot;拰lde;䅩iĀ;f㜰㣨»᠓Āam㣯㣲rò㢨l耻ü䃼angle;榧ހABDacdeflnoprsz㤜㤟㤩㤭㦵㦸㦽㧟㧤㧨㧳㧹㧽㨁㨠ròϷarĀ;v㤦㤧櫨;櫩asèϡĀnr㤲㤷grt;榜΀eknprst㓣㥆㥋㥒㥝㥤㦖appá␕othinçẖƀhir㓫⻈㥙opô⾵Ā;hᎷ㥢ïㆍĀiu㥩㥭gmá㎳Ābp㥲㦄setneqĀ;q㥽㦀쀀⊊︀;쀀⫋︀setneqĀ;q㦏㦒쀀⊋︀;쀀⫌︀Āhr㦛㦟etá㚜iangleĀlr㦪㦯eft»थight»ၑy;䐲ash»ံƀelr㧄㧒㧗ƀ;beⷪ㧋㧏ar;抻q;扚lip;拮Ābt㧜ᑨaòᑩr;쀀𝔳tré㦮suĀbp㧯㧱»ജ»൙pf;쀀𝕧roð໻tré㦴Ācu㨆㨋r;쀀𝓋Ābp㨐㨘nĀEe㦀㨖»㥾nĀEe㦒㨞»㦐igzag;榚΀cefoprs㨶㨻㩖㩛㩔㩡㩪irc;䅵Ādi㩀㩑Ābg㩅㩉ar;機eĀ;qᗺ㩏;扙erp;愘r;쀀𝔴pf;쀀𝕨Ā;eᑹ㩦atèᑹcr;쀀𝓌ૣណ㪇\0㪋\0㪐㪛\0\0㪝㪨㪫㪯\0\0㫃㫎\0㫘ៜ៟tré៑r;쀀𝔵ĀAa㪔㪗ròσrò৶;䎾ĀAa㪡㪤ròθrò৫að✓is;拻ƀdptឤ㪵㪾Āfl㪺ឩ;쀀𝕩imåឲĀAa㫇㫊ròώròਁĀcq㫒ីr;쀀𝓍Āpt៖㫜ré។Ѐacefiosu㫰㫽㬈㬌㬑㬕㬛㬡cĀuy㫶㫻te耻ý䃽;䑏Āiy㬂㬆rc;䅷;䑋n耻¥䂥r;쀀𝔶cy;䑗pf;쀀𝕪cr;쀀𝓎Ācm㬦㬩y;䑎l耻ÿ䃿Ԁacdefhiosw㭂㭈㭔㭘㭤㭩㭭㭴㭺㮀cute;䅺Āay㭍㭒ron;䅾;䐷ot;䅼Āet㭝㭡træᕟa;䎶r;쀀𝔷cy;䐶grarr;懝pf;쀀𝕫cr;쀀𝓏Ājn㮅㮇;怍j;怌'.split("").map(e=>e.charCodeAt(0))),Rt=new Uint16Array("Ȁaglq	\x1Bɭ\0\0p;䀦os;䀧t;䀾t;䀼uot;䀢".split("").map(e=>e.charCodeAt(0)));var Ne;const Pt=new Map([[0,65533],[128,8364],[130,8218],[131,402],[132,8222],[133,8230],[134,8224],[135,8225],[136,710],[137,8240],[138,352],[139,8249],[140,338],[142,381],[145,8216],[146,8217],[147,8220],[148,8221],[149,8226],[150,8211],[151,8212],[152,732],[153,8482],[154,353],[155,8250],[156,339],[158,382],[159,376]]),Ft=(Ne=String.fromCodePoint)!==null&&Ne!==void 0?Ne:function(e){let u="";return e>65535&&(e-=65536,u+=String.fromCharCode(e>>>10&1023|55296),e=56320|e&1023),u+=String.fromCharCode(e),u};function It(e){var u;return e>=55296&&e<=57343||e>1114111?65533:(u=Pt.get(e))!==null&&u!==void 0?u:e}var E;(function(e){e[e.NUM=35]="NUM",e[e.SEMI=59]="SEMI",e[e.EQUALS=61]="EQUALS",e[e.ZERO=48]="ZERO",e[e.NINE=57]="NINE",e[e.LOWER_A=97]="LOWER_A",e[e.LOWER_F=102]="LOWER_F",e[e.LOWER_X=120]="LOWER_X",e[e.LOWER_Z=122]="LOWER_Z",e[e.UPPER_A=65]="UPPER_A",e[e.UPPER_F=70]="UPPER_F",e[e.UPPER_Z=90]="UPPER_Z"})(E||(E={}));const Lt=32;var j;(function(e){e[e.VALUE_LENGTH=49152]="VALUE_LENGTH",e[e.BRANCH_LENGTH=16256]="BRANCH_LENGTH",e[e.JUMP_TABLE=127]="JUMP_TABLE"})(j||(j={}));function Je(e){return e>=E.ZERO&&e<=E.NINE}function Mt(e){return e>=E.UPPER_A&&e<=E.UPPER_F||e>=E.LOWER_A&&e<=E.LOWER_F}function Ot(e){return e>=E.UPPER_A&&e<=E.UPPER_Z||e>=E.LOWER_A&&e<=E.LOWER_Z||Je(e)}function Ht(e){return e===E.EQUALS||Ot(e)}var D;(function(e){e[e.EntityStart=0]="EntityStart",e[e.NumericStart=1]="NumericStart",e[e.NumericDecimal=2]="NumericDecimal",e[e.NumericHex=3]="NumericHex",e[e.NamedEntity=4]="NamedEntity"})(D||(D={}));var N;(function(e){e[e.Legacy=0]="Legacy",e[e.Strict=1]="Strict",e[e.Attribute=2]="Attribute"})(N||(N={}));class Nt{constructor(u,n,t){this.decodeTree=u,this.emitCodePoint=n,this.errors=t,this.state=D.EntityStart,this.consumed=1,this.result=0,this.treeIndex=0,this.excess=1,this.decodeMode=N.Strict}startEntity(u){this.decodeMode=u,this.state=D.EntityStart,this.result=0,this.treeIndex=0,this.excess=1,this.consumed=1}write(u,n){switch(this.state){case D.EntityStart:return u.charCodeAt(n)===E.NUM?(this.state=D.NumericStart,this.consumed+=1,this.stateNumericStart(u,n+1)):(this.state=D.NamedEntity,this.stateNamedEntity(u,n));case D.NumericStart:return this.stateNumericStart(u,n);case D.NumericDecimal:return this.stateNumericDecimal(u,n);case D.NumericHex:return this.stateNumericHex(u,n);case D.NamedEntity:return this.stateNamedEntity(u,n)}}stateNumericStart(u,n){return n>=u.length?-1:(u.charCodeAt(n)|Lt)===E.LOWER_X?(this.state=D.NumericHex,this.consumed+=1,this.stateNumericHex(u,n+1)):(this.state=D.NumericDecimal,this.stateNumericDecimal(u,n))}addToNumericResult(u,n,t,r){if(n!==t){const o=t-n;this.result=this.result*Math.pow(r,o)+parseInt(u.substr(n,o),r),this.consumed+=o}}stateNumericHex(u,n){const t=n;for(;n<u.length;){const r=u.charCodeAt(n);if(Je(r)||Mt(r))n+=1;else return this.addToNumericResult(u,t,n,16),this.emitNumericEntity(r,3)}return this.addToNumericResult(u,t,n,16),-1}stateNumericDecimal(u,n){const t=n;for(;n<u.length;){const r=u.charCodeAt(n);if(Je(r))n+=1;else return this.addToNumericResult(u,t,n,10),this.emitNumericEntity(r,2)}return this.addToNumericResult(u,t,n,10),-1}emitNumericEntity(u,n){var t;if(this.consumed<=n)return(t=this.errors)===null||t===void 0||t.absenceOfDigitsInNumericCharacterReference(this.consumed),0;if(u===E.SEMI)this.consumed+=1;else if(this.decodeMode===N.Strict)return 0;return this.emitCodePoint(It(this.result),this.consumed),this.errors&&(u!==E.SEMI&&this.errors.missingSemicolonAfterCharacterReference(),this.errors.validateNumericCharacterReference(this.result)),this.consumed}stateNamedEntity(u,n){const{decodeTree:t}=this;let r=t[this.treeIndex],o=(r&j.VALUE_LENGTH)>>14;for(;n<u.length;n++,this.excess++){const i=u.charCodeAt(n);if(this.treeIndex=Wt(t,r,this.treeIndex+Math.max(1,o),i),this.treeIndex<0)return this.result===0||this.decodeMode===N.Attribute&&(o===0||Ht(i))?0:this.emitNotTerminatedNamedEntity();if(r=t[this.treeIndex],o=(r&j.VALUE_LENGTH)>>14,o!==0){if(i===E.SEMI)return this.emitNamedEntityData(this.treeIndex,o,this.consumed+this.excess);this.decodeMode!==N.Strict&&(this.result=this.treeIndex,this.consumed+=this.excess,this.excess=0)}}return-1}emitNotTerminatedNamedEntity(){var u;const{result:n,decodeTree:t}=this,r=(t[n]&j.VALUE_LENGTH)>>14;return this.emitNamedEntityData(n,r,this.consumed),(u=this.errors)===null||u===void 0||u.missingSemicolonAfterCharacterReference(),this.consumed}emitNamedEntityData(u,n,t){const{decodeTree:r}=this;return this.emitCodePoint(n===1?r[u]&~j.VALUE_LENGTH:r[u+1],t),n===3&&this.emitCodePoint(r[u+2],t),t}end(){var u;switch(this.state){case D.NamedEntity:return this.result!==0&&(this.decodeMode!==N.Attribute||this.result===this.treeIndex)?this.emitNotTerminatedNamedEntity():0;case D.NumericDecimal:return this.emitNumericEntity(0,2);case D.NumericHex:return this.emitNumericEntity(0,3);case D.NumericStart:return(u=this.errors)===null||u===void 0||u.absenceOfDigitsInNumericCharacterReference(this.consumed),0;case D.EntityStart:return 0}}}function Qu(e){let u="";const n=new Nt(e,t=>u+=Ft(t));return function(r,o){let i=0,s=0;for(;(s=r.indexOf("&",s))>=0;){u+=r.slice(i,s),n.startEntity(o);const c=n.write(r,s+1);if(c<0){i=s+n.end();break}i=s+c,s=c===0?i+1:i}const a=u+r.slice(i);return u="",a}}function Wt(e,u,n,t){const r=(u&j.BRANCH_LENGTH)>>7,o=u&j.JUMP_TABLE;if(r===0)return o!==0&&t===o?n:-1;if(o){const a=t-o;return a<0||a>=r?-1:e[n+a]-1}let i=n,s=i+r-1;for(;i<=s;){const a=i+s>>>1,c=e[a];if(c<t)i=a+1;else if(c>t)s=a-1;else return e[a+r]}return-1}const en=Qu(At);Qu(Rt);function Bt(e,u=N.Legacy){return en(e,u)}function zt(e){return en(e,N.Strict)}function qt(e){return Object.prototype.toString.call(e)}function ru(e){return qt(e)==="[object String]"}const jt=Object.prototype.hasOwnProperty;function Ut(e,u){return jt.call(e,u)}function Ae(e){return Array.prototype.slice.call(arguments,1).forEach(function(n){if(n){if(typeof n!="object")throw new TypeError(n+"must be object");Object.keys(n).forEach(function(t){e[t]=n[t]})}}),e}function un(e,u,n){return[].concat(e.slice(0,u),n,e.slice(u+1))}function ou(e){return!(e>=55296&&e<=57343||e>=64976&&e<=65007||(e&65535)===65535||(e&65535)===65534||e>=0&&e<=8||e===11||e>=14&&e<=31||e>=127&&e<=159||e>1114111)}function ae(e){if(e>65535){e-=65536;const u=55296+(e>>10),n=56320+(e&1023);return String.fromCharCode(u,n)}return String.fromCharCode(e)}const nn=/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g,Vt=/&([a-z#][a-z0-9]{1,31});/gi,Gt=new RegExp(nn.source+"|"+Vt.source,"gi"),$t=/^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i;function Zt(e,u){if(u.charCodeAt(0)===35&&$t.test(u)){const t=u[1].toLowerCase()==="x"?parseInt(u.slice(2),16):parseInt(u.slice(1),10);return ou(t)?ae(t):e}const n=Bt(e);return n!==e?n:e}function Kt(e){return e.indexOf("\\")<0?e:e.replace(nn,"$1")}function ne(e){return e.indexOf("\\")<0&&e.indexOf("&")<0?e:e.replace(Gt,function(u,n,t){return n||Zt(u,t)})}const Jt=/[&<>"]/,Yt=/[&<>"]/g,Xt={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"};function Qt(e){return Xt[e]}function U(e){return Jt.test(e)?e.replace(Yt,Qt):e}const er=/[.?*+^$[\]\\(){}|-]/g;function ur(e){return e.replace(er,"\\$&")}function w(e){switch(e){case 9:case 32:return!0}return!1}function ce(e){if(e>=8192&&e<=8202)return!0;switch(e){case 9:case 10:case 11:case 12:case 13:case 32:case 160:case 5760:case 8239:case 8287:case 12288:return!0}return!1}function tn(e){return tu.test(e)||Yu.test(e)}function le(e){return tn(ae(e))}function de(e){switch(e){case 33:case 34:case 35:case 36:case 37:case 38:case 39:case 40:case 41:case 42:case 43:case 44:case 45:case 46:case 47:case 58:case 59:case 60:case 61:case 62:case 63:case 64:case 91:case 92:case 93:case 94:case 95:case 96:case 123:case 124:case 125:case 126:return!0;default:return!1}}function Re(e){return e=e.trim().replace(/\s+/g," "),"ẞ".toLowerCase()==="Ṿ"&&(e=e.replace(/ẞ/g,"ß")),e.toLowerCase().toUpperCase()}function Su(e){return e===32||e===9||e===10||e===13}function Pe(e){let u=0;for(;u<e.length&&Su(e.charCodeAt(u));u++);let n=e.length-1;for(;n>=u&&Su(e.charCodeAt(n));n--);return e.slice(u,n+1)}const nr={mdurl:Et,ucmicro:Tt},tr=Object.freeze(Object.defineProperty({__proto__:null,arrayReplaceAt:un,asciiTrim:Pe,assign:Ae,escapeHtml:U,escapeRE:ur,fromCodePoint:ae,has:Ut,isMdAsciiPunct:de,isPunctChar:tn,isPunctCharCode:le,isSpace:w,isString:ru,isValidEntityCode:ou,isWhiteSpace:ce,lib:nr,normalizeReference:Re,unescapeAll:ne,unescapeMd:Kt},Symbol.toStringTag,{value:"Module"}));function rr(e,u,n){let t,r,o,i;const s=e.posMax,a=e.pos;for(e.pos=u+1,t=1;e.pos<s;){if(o=e.src.charCodeAt(e.pos),o===93&&(t--,t===0)){r=!0;break}if(i=e.pos,e.md.inline.skipToken(e),o===91){if(i===e.pos-1)t++;else if(n)return e.pos=a,-1}}let c=-1;return r&&(c=e.pos),e.pos=a,c}function or(e,u,n){let t,r=u;const o={ok:!1,pos:0,str:""};if(e.charCodeAt(r)===60){for(r++;r<n;){if(t=e.charCodeAt(r),t===10||t===60)return o;if(t===62)return o.pos=r+1,o.str=ne(e.slice(u+1,r)),o.ok=!0,o;if(t===92&&r+1<n){r+=2;continue}r++}return o}let i=0;for(;r<n&&(t=e.charCodeAt(r),!(t===32||t<32||t===127));){if(t===92&&r+1<n){if(e.charCodeAt(r+1)===32)break;r+=2;continue}if(t===40&&(i++,i>32))return o;if(t===41){if(i===0)break;i--}r++}return u===r||i!==0||(o.str=ne(e.slice(u,r)),o.pos=r,o.ok=!0),o}function ir(e,u,n,t){let r,o=u;const i={ok:!1,can_continue:!1,pos:0,str:"",marker:0};if(t)i.str=t.str,i.marker=t.marker;else{if(o>=n)return i;let s=e.charCodeAt(o);if(s!==34&&s!==39&&s!==40)return i;u++,o++,s===40&&(s=41),i.marker=s}for(;o<n;){if(r=e.charCodeAt(o),r===i.marker)return i.pos=o+1,i.str+=ne(e.slice(u,o)),i.ok=!0,i;if(r===40&&i.marker===41)return i;r===92&&o+1<n&&o++,o++}return i.can_continue=!0,i.str+=ne(e.slice(u,o)),i}const sr=Object.freeze(Object.defineProperty({__proto__:null,parseLinkDestination:or,parseLinkLabel:rr,parseLinkTitle:ir},Symbol.toStringTag,{value:"Module"})),O={};O.code_inline=function(e,u,n,t,r){const o=e[u];return"<code"+r.renderAttrs(o)+">"+U(o.content)+"</code>"};O.code_block=function(e,u,n,t,r){const o=e[u];return"<pre"+r.renderAttrs(o)+"><code>"+U(e[u].content)+`</code></pre>
`};O.fence=function(e,u,n,t,r){const o=e[u],i=o.info?ne(o.info).trim():"";let s="",a="";if(i){const l=i.split(/(\s+)/g);s=l[0],a=l.slice(2).join("")}let c;if(n.highlight?c=n.highlight(o.content,s,a)||U(o.content):c=U(o.content),c.indexOf("<pre")===0)return c+`
`;if(i){const l=o.attrIndex("class"),d=o.attrs?o.attrs.slice():[];l<0?d.push(["class",n.langPrefix+s]):(d[l]=d[l].slice(),d[l][1]+=" "+n.langPrefix+s);const h={attrs:d};return`<pre><code${r.renderAttrs(h)}>${c}</code></pre>
`}return`<pre><code${r.renderAttrs(o)}>${c}</code></pre>
`};O.image=function(e,u,n,t,r){const o=e[u];return o.attrs[o.attrIndex("alt")][1]=r.renderInlineAsText(o.children,n,t),r.renderToken(e,u,n)};O.hardbreak=function(e,u,n){return n.xhtmlOut?`<br />
`:`<br>
`};O.softbreak=function(e,u,n){return n.breaks?n.xhtmlOut?`<br />
`:`<br>
`:`
`};O.text=function(e,u){return U(e[u].content)};O.html_block=function(e,u){return e[u].content};O.html_inline=function(e,u){return e[u].content};function re(){this.rules=Ae({},O)}re.prototype.renderAttrs=function(u){let n,t,r;if(!u.attrs)return"";for(r="",n=0,t=u.attrs.length;n<t;n++)r+=" "+U(u.attrs[n][0])+'="'+U(u.attrs[n][1])+'"';return r};re.prototype.renderToken=function(u,n,t){const r=u[n];let o="";if(r.hidden)return"";r.block&&r.nesting!==-1&&n&&u[n-1].hidden&&(o+=`
`),o+=(r.nesting===-1?"</":"<")+r.tag,o+=this.renderAttrs(r),r.nesting===0&&t.xhtmlOut&&(o+=" /");let i=!1;if(r.block&&(i=!0,r.nesting===1&&n+1<u.length)){const s=u[n+1];(s.type==="inline"||s.hidden||s.nesting===-1&&s.tag===r.tag)&&(i=!1)}return o+=i?`>
`:">",o};re.prototype.renderInline=function(e,u,n){let t="";const r=this.rules;for(let o=0,i=e.length;o<i;o++){const s=e[o].type;typeof r[s]<"u"?t+=r[s](e,o,u,n,this):t+=this.renderToken(e,o,u)}return t};re.prototype.renderInlineAsText=function(e,u,n){let t="";for(let r=0,o=e.length;r<o;r++)switch(e[r].type){case"text":t+=e[r].content;break;case"image":t+=this.renderInlineAsText(e[r].children,u,n);break;case"html_inline":case"html_block":t+=e[r].content;break;case"softbreak":case"hardbreak":t+=`
`;break}return t};re.prototype.render=function(e,u,n){let t="";const r=this.rules;for(let o=0,i=e.length;o<i;o++){const s=e[o].type;s==="inline"?t+=this.renderInline(e[o].children,u,n):typeof r[s]<"u"?t+=r[s](e,o,u,n,this):t+=this.renderToken(e,o,u,n)}return t};function T(){this.__rules__=[],this.__cache__=null}T.prototype.__find__=function(e){for(let u=0;u<this.__rules__.length;u++)if(this.__rules__[u].name===e)return u;return-1};T.prototype.__compile__=function(){const e=this,u=[""];e.__rules__.forEach(function(n){n.enabled&&n.alt.forEach(function(t){u.indexOf(t)<0&&u.push(t)})}),e.__cache__={},u.forEach(function(n){e.__cache__[n]=[],e.__rules__.forEach(function(t){t.enabled&&(n&&t.alt.indexOf(n)<0||e.__cache__[n].push(t.fn))})})};T.prototype.at=function(e,u,n){const t=this.__find__(e),r=n||{};if(t===-1)throw new Error("Parser rule not found: "+e);this.__rules__[t].fn=u,this.__rules__[t].alt=r.alt||[],this.__cache__=null};T.prototype.before=function(e,u,n,t){const r=this.__find__(e),o=t||{};if(r===-1)throw new Error("Parser rule not found: "+e);this.__rules__.splice(r,0,{name:u,enabled:!0,fn:n,alt:o.alt||[]}),this.__cache__=null};T.prototype.after=function(e,u,n,t){const r=this.__find__(e),o=t||{};if(r===-1)throw new Error("Parser rule not found: "+e);this.__rules__.splice(r+1,0,{name:u,enabled:!0,fn:n,alt:o.alt||[]}),this.__cache__=null};T.prototype.push=function(e,u,n){const t=n||{};this.__rules__.push({name:e,enabled:!0,fn:u,alt:t.alt||[]}),this.__cache__=null};T.prototype.enable=function(e,u){Array.isArray(e)||(e=[e]);const n=[];return e.forEach(function(t){const r=this.__find__(t);if(r<0){if(u)return;throw new Error("Rules manager: invalid rule name "+t)}this.__rules__[r].enabled=!0,n.push(t)},this),this.__cache__=null,n};T.prototype.enableOnly=function(e,u){Array.isArray(e)||(e=[e]),this.__rules__.forEach(function(n){n.enabled=!1}),this.enable(e,u)};T.prototype.disable=function(e,u){Array.isArray(e)||(e=[e]);const n=[];return e.forEach(function(t){const r=this.__find__(t);if(r<0){if(u)return;throw new Error("Rules manager: invalid rule name "+t)}this.__rules__[r].enabled=!1,n.push(t)},this),this.__cache__=null,n};T.prototype.getRules=function(e){return this.__cache__===null&&this.__compile__(),this.__cache__[e]||[]};function F(e,u,n){this.type=e,this.tag=u,this.attrs=null,this.map=null,this.nesting=n,this.level=0,this.children=null,this.content="",this.markup="",this.info="",this.meta=null,this.block=!1,this.hidden=!1}F.prototype.attrIndex=function(u){if(!this.attrs)return-1;const n=this.attrs;for(let t=0,r=n.length;t<r;t++)if(n[t][0]===u)return t;return-1};F.prototype.attrPush=function(u){this.attrs?this.attrs.push(u):this.attrs=[u]};F.prototype.attrSet=function(u,n){const t=this.attrIndex(u),r=[u,n];t<0?this.attrPush(r):this.attrs[t]=r};F.prototype.attrGet=function(u){const n=this.attrIndex(u);let t=null;return n>=0&&(t=this.attrs[n][1]),t};F.prototype.attrJoin=function(u,n){const t=this.attrIndex(u);t<0?this.attrPush([u,n]):this.attrs[t][1]=this.attrs[t][1]+" "+n};function rn(e,u,n){this.src=e,this.env=n,this.tokens=[],this.inlineMode=!1,this.md=u}rn.prototype.Token=F;const ar=/\r\n?|\n/g,cr=/\0/g;function lr(e){let u;u=e.src.replace(ar,`
`),u=u.replace(cr,"�"),e.src=u}function dr(e){let u;e.inlineMode?(u=new e.Token("inline","",0),u.content=e.src,u.map=[0,1],u.children=[],e.tokens.push(u)):e.md.block.parse(e.src,e.md,e.env,e.tokens)}function fr(e){const u=e.tokens;for(let n=0,t=u.length;n<t;n++){const r=u[n];r.type==="inline"&&e.md.inline.parse(r.content,e.md,e.env,r.children)}}function pr(e){return/^<a[>\s]/i.test(e)}function hr(e){return/^<\/a\s*>/i.test(e)}function br(e){const u=e.tokens;if(e.md.options.linkify)for(let n=0,t=u.length;n<t;n++){if(u[n].type!=="inline"||!e.md.linkify.pretest(u[n].content))continue;let r=u[n].children,o=0;for(let i=r.length-1;i>=0;i--){const s=r[i];if(s.type==="link_close"){for(i--;r[i].level!==s.level&&r[i].type!=="link_open";)i--;continue}if(s.type==="html_inline"&&(pr(s.content)&&o>0&&o--,hr(s.content)&&o++),!(o>0)&&s.type==="text"&&e.md.linkify.test(s.content)){const a=s.content;let c=e.md.linkify.match(a);const l=[];let d=s.level,h=0;c.length>0&&c[0].index===0&&i>0&&r[i-1].type==="text_special"&&(c=c.slice(1));for(let p=0;p<c.length;p++){const f=c[p].url,g=e.md.normalizeLink(f);if(!e.md.validateLink(g))continue;let _=c[p].text;c[p].schema?c[p].schema==="mailto:"&&!/^mailto:/i.test(_)?_=e.md.normalizeLinkText("mailto:"+_).replace(/^mailto:/,""):_=e.md.normalizeLinkText(_):_=e.md.normalizeLinkText("http://"+_).replace(/^http:\/\//,"");const C=c[p].index;if(C>h){const k=new e.Token("text","",0);k.content=a.slice(h,C),k.level=d,l.push(k)}const x=new e.Token("link_open","a",1);x.attrs=[["href",g]],x.level=d++,x.markup="linkify",x.info="auto",l.push(x);const b=new e.Token("text","",0);b.content=_,b.level=d,l.push(b);const m=new e.Token("link_close","a",-1);m.level=--d,m.markup="linkify",m.info="auto",l.push(m),h=c[p].lastIndex}if(h<a.length){const p=new e.Token("text","",0);p.content=a.slice(h),p.level=d,l.push(p)}u[n].children=r=un(r,i,l)}}}}const on=/\+-|\.\.|\?\?\?\?|!!!!|,,|--/,mr=/\((c|tm|r)\)/i,xr=/\((c|tm|r)\)/ig,gr={c:"©",r:"®",tm:"™"};function _r(e,u){return gr[u.toLowerCase()]}function kr(e){let u=0;for(let n=e.length-1;n>=0;n--){const t=e[n];t.type==="text"&&!u&&(t.content=t.content.replace(xr,_r)),t.type==="link_open"&&t.info==="auto"&&u--,t.type==="link_close"&&t.info==="auto"&&u++}}function yr(e){let u=0;for(let n=e.length-1;n>=0;n--){const t=e[n];t.type==="text"&&!u&&on.test(t.content)&&(t.content=t.content.replace(/\+-/g,"±").replace(/\.{2,}/g,"…").replace(/([?!])…/g,"$1..").replace(/([?!]){4,}/g,"$1$1$1").replace(/,{2,}/g,",").replace(/(^|[^-])---(?=[^-]|$)/mg,"$1—").replace(/(^|\s)--(?=\s|$)/mg,"$1–").replace(/(^|[^-\s])--(?=[^-\s]|$)/mg,"$1–")),t.type==="link_open"&&t.info==="auto"&&u--,t.type==="link_close"&&t.info==="auto"&&u++}}function Cr(e){let u;if(e.md.options.typographer)for(u=e.tokens.length-1;u>=0;u--)e.tokens[u].type==="inline"&&(mr.test(e.tokens[u].content)&&kr(e.tokens[u].children),on.test(e.tokens[u].content)&&yr(e.tokens[u].children))}const wr=/['"]/,Du=/['"]/g,Eu="’";function ge(e,u,n,t){e[u]||(e[u]=[]),e[u].push({pos:n,ch:t})}function Sr(e,u){let n="",t=0;u.sort((r,o)=>r.pos-o.pos);for(let r=0;r<u.length;r++){const o=u[r];n+=e.slice(t,o.pos)+o.ch,t=o.pos+1}return n+e.slice(t)}function Dr(e,u){let n;const t=[],r={};for(let o=0;o<e.length;o++){const i=e[o],s=e[o].level;for(n=t.length-1;n>=0&&!(t[n].level<=s);n--);if(t.length=n+1,i.type!=="text")continue;const a=i.content;let c=0;const l=a.length;e:for(;c<l;){Du.lastIndex=c;const d=Du.exec(a);if(!d)break;let h=!0,p=!0;c=d.index+1;const f=d[0]==="'";let g=32;if(d.index-1>=0)g=a.charCodeAt(d.index-1);else for(n=o-1;n>=0&&!(e[n].type==="softbreak"||e[n].type==="hardbreak");n--)if(e[n].content){g=e[n].content.charCodeAt(e[n].content.length-1);break}let _=32;if(c<l)_=a.charCodeAt(c);else for(n=o+1;n<e.length&&!(e[n].type==="softbreak"||e[n].type==="hardbreak");n++)if(e[n].content){_=e[n].content.charCodeAt(0);break}const C=de(g)||le(g),x=de(_)||le(_),b=ce(g),m=ce(_);if(m?h=!1:x&&(b||C||(h=!1)),b?p=!1:C&&(m||x||(p=!1)),_===34&&d[0]==='"'&&g>=48&&g<=57&&(p=h=!1),h&&p&&(h=C,p=x),!h&&!p){f&&ge(r,o,d.index,Eu);continue}if(p)for(n=t.length-1;n>=0;n--){let k=t[n];if(t[n].level<s)break;if(k.single===f&&t[n].level===s){k=t[n];let y,S;f?(y=u.md.options.quotes[2],S=u.md.options.quotes[3]):(y=u.md.options.quotes[0],S=u.md.options.quotes[1]),ge(r,o,d.index,S),ge(r,k.token,k.pos,y),t.length=n;continue e}}h?t.push({token:o,pos:d.index,single:f,level:s}):p&&f&&ge(r,o,d.index,Eu)}}Object.keys(r).forEach(function(o){e[o].content=Sr(e[o].content,r[o])})}function Er(e){if(e.md.options.typographer)for(let u=e.tokens.length-1;u>=0;u--)e.tokens[u].type!=="inline"||!wr.test(e.tokens[u].content)||Dr(e.tokens[u].children,e)}function vr(e){let u,n;const t=e.tokens,r=t.length;for(let o=0;o<r;o++){if(t[o].type!=="inline")continue;const i=t[o].children,s=i.length;for(u=0;u<s;u++)i[u].type==="text_special"&&(i[u].type="text");for(u=n=0;u<s;u++)i[u].type==="text"&&u+1<s&&i[u+1].type==="text"?i[u+1].content=i[u].content+i[u+1].content:(u!==n&&(i[n]=i[u]),n++);u!==n&&(i.length=n)}}const We=[["normalize",lr],["block",dr],["inline",fr],["linkify",br],["replacements",Cr],["smartquotes",Er],["text_join",vr]];function iu(){this.ruler=new T;for(let e=0;e<We.length;e++)this.ruler.push(We[e][0],We[e][1])}iu.prototype.process=function(e){const u=this.ruler.getRules("");for(let n=0,t=u.length;n<t;n++)u[n](e)};iu.prototype.State=rn;function H(e,u,n,t){this.src=e,this.md=u,this.env=n,this.tokens=t,this.bMarks=[],this.eMarks=[],this.tShift=[],this.sCount=[],this.bsCount=[],this.blkIndent=0,this.line=0,this.lineMax=0,this.tight=!1,this.ddIndent=-1,this.listIndent=-1,this.parentType="root",this.level=0;const r=this.src;for(let o=0,i=0,s=0,a=0,c=r.length,l=!1;i<c;i++){const d=r.charCodeAt(i);if(!l)if(w(d)){s++,d===9?a+=4-a%4:a++;continue}else l=!0;(d===10||i===c-1)&&(d!==10&&i++,this.bMarks.push(o),this.eMarks.push(i),this.tShift.push(s),this.sCount.push(a),this.bsCount.push(0),l=!1,s=0,a=0,o=i+1)}this.bMarks.push(r.length),this.eMarks.push(r.length),this.tShift.push(0),this.sCount.push(0),this.bsCount.push(0),this.lineMax=this.bMarks.length-1}H.prototype.push=function(e,u,n){const t=new F(e,u,n);return t.block=!0,n<0&&this.level--,t.level=this.level,n>0&&this.level++,this.tokens.push(t),t};H.prototype.isEmpty=function(u){return this.bMarks[u]+this.tShift[u]>=this.eMarks[u]};H.prototype.skipEmptyLines=function(u){for(let n=this.lineMax;u<n&&!(this.bMarks[u]+this.tShift[u]<this.eMarks[u]);u++);return u};H.prototype.skipSpaces=function(u){for(let n=this.src.length;u<n;u++){const t=this.src.charCodeAt(u);if(!w(t))break}return u};H.prototype.skipSpacesBack=function(u,n){if(u<=n)return u;for(;u>n;)if(!w(this.src.charCodeAt(--u)))return u+1;return u};H.prototype.skipChars=function(u,n){for(let t=this.src.length;u<t&&this.src.charCodeAt(u)===n;u++);return u};H.prototype.skipCharsBack=function(u,n,t){if(u<=t)return u;for(;u>t;)if(n!==this.src.charCodeAt(--u))return u+1;return u};H.prototype.getLines=function(u,n,t,r){if(u>=n)return"";const o=new Array(n-u);for(let i=0,s=u;s<n;s++,i++){let a=0;const c=this.bMarks[s];let l=c,d;for(s+1<n||r?d=this.eMarks[s]+1:d=this.eMarks[s];l<d&&a<t;){const h=this.src.charCodeAt(l);if(w(h))h===9?a+=4-(a+this.bsCount[s])%4:a++;else if(l-c<this.tShift[s])a++;else break;l++}a>t?o[i]=new Array(a-t+1).join(" ")+this.src.slice(l,d):o[i]=this.src.slice(l,d)}return o.join("")};H.prototype.Token=F;const Tr=65536;function Be(e,u){const n=e.bMarks[u]+e.tShift[u],t=e.eMarks[u];return e.src.slice(n,t)}function vu(e){const u=[],n=e.length;let t=0,r=e.charCodeAt(t),o=!1,i=0,s="";for(;t<n;)r===124&&(o?(s+=e.substring(i,t-1),i=t):(u.push(s+e.substring(i,t)),s="",i=t+1)),o=r===92,t++,r=e.charCodeAt(t);return u.push(s+e.substring(i)),u}function Ar(e,u,n,t){if(u+2>n)return!1;let r=u+1;if(e.sCount[r]<e.blkIndent||e.sCount[r]-e.blkIndent>=4)return!1;let o=e.bMarks[r]+e.tShift[r];if(o>=e.eMarks[r])return!1;const i=e.src.charCodeAt(o++);if(i!==124&&i!==45&&i!==58||o>=e.eMarks[r])return!1;const s=e.src.charCodeAt(o++);if(s!==124&&s!==45&&s!==58&&!w(s)||i===45&&w(s))return!1;for(;o<e.eMarks[r];){const m=e.src.charCodeAt(o);if(m!==124&&m!==45&&m!==58&&!w(m))return!1;o++}let a=Be(e,u+1),c=a.split("|");const l=[];for(let m=0;m<c.length;m++){const k=c[m].trim();if(!k){if(m===0||m===c.length-1)continue;return!1}if(!/^:?-+:?$/.test(k))return!1;k.charCodeAt(k.length-1)===58?l.push(k.charCodeAt(0)===58?"center":"right"):k.charCodeAt(0)===58?l.push("left"):l.push("")}if(a=Be(e,u).trim(),a.indexOf("|")===-1||e.sCount[u]-e.blkIndent>=4)return!1;c=vu(a),c.length&&c[0]===""&&c.shift(),c.length&&c[c.length-1]===""&&c.pop();const d=c.length;if(d===0||d!==l.length)return!1;if(t)return!0;const h=e.parentType;e.parentType="table";const p=e.md.block.ruler.getRules("blockquote"),f=e.push("table_open","table",1),g=[u,0];f.map=g;const _=e.push("thead_open","thead",1);_.map=[u,u+1];const C=e.push("tr_open","tr",1);C.map=[u,u+1];for(let m=0;m<c.length;m++){const k=e.push("th_open","th",1);l[m]&&(k.attrs=[["style","text-align:"+l[m]]]);const y=e.push("inline","",0);y.content=c[m].trim(),y.children=[],e.push("th_close","th",-1)}e.push("tr_close","tr",-1),e.push("thead_close","thead",-1);let x,b=0;for(r=u+2;r<n&&!(e.sCount[r]<e.blkIndent);r++){let m=!1;for(let y=0,S=p.length;y<S;y++)if(p[y](e,r,n,!0)){m=!0;break}if(m||(a=Be(e,r).trim(),!a)||e.sCount[r]-e.blkIndent>=4||(c=vu(a),c.length&&c[0]===""&&c.shift(),c.length&&c[c.length-1]===""&&c.pop(),b+=d-c.length,b>Tr))break;if(r===u+2){const y=e.push("tbody_open","tbody",1);y.map=x=[u+2,0]}const k=e.push("tr_open","tr",1);k.map=[r,r+1];for(let y=0;y<d;y++){const S=e.push("td_open","td",1);l[y]&&(S.attrs=[["style","text-align:"+l[y]]]);const P=e.push("inline","",0);P.content=c[y]?c[y].trim():"",P.children=[],e.push("td_close","td",-1)}e.push("tr_close","tr",-1)}return x&&(e.push("tbody_close","tbody",-1),x[1]=r),e.push("table_close","table",-1),g[1]=r,e.parentType=h,e.line=r,!0}function Rr(e,u,n){if(e.sCount[u]-e.blkIndent<4)return!1;let t=u+1,r=t;for(;t<n;){if(e.isEmpty(t)){t++;continue}if(e.sCount[t]-e.blkIndent>=4){t++,r=t;continue}break}e.line=r;const o=e.push("code_block","code",0);return o.content=e.getLines(u,r,4+e.blkIndent,!1)+`
`,o.map=[u,e.line],!0}function Pr(e,u,n,t){let r=e.bMarks[u]+e.tShift[u],o=e.eMarks[u];if(e.sCount[u]-e.blkIndent>=4||r+3>o)return!1;const i=e.src.charCodeAt(r);if(i!==126&&i!==96)return!1;let s=r;r=e.skipChars(r,i);let a=r-s;if(a<3)return!1;const c=e.src.slice(s,r),l=e.src.slice(r,o);if(i===96&&l.indexOf(String.fromCharCode(i))>=0)return!1;if(t)return!0;let d=u,h=!1;for(;d++,!(d>=n||(r=s=e.bMarks[d]+e.tShift[d],o=e.eMarks[d],r<o&&e.sCount[d]<e.blkIndent));)if(e.src.charCodeAt(r)===i&&!(e.sCount[d]-e.blkIndent>=4)&&(r=e.skipChars(r,i),!(r-s<a)&&(r=e.skipSpaces(r),!(r<o)))){h=!0;break}a=e.sCount[u],e.line=d+(h?1:0);const p=e.push("fence","code",0);return p.info=l,p.content=e.getLines(u+1,d,a,!0),p.markup=c,p.map=[u,e.line],!0}function Fr(e,u,n,t){let r=e.bMarks[u]+e.tShift[u],o=e.eMarks[u];const i=e.lineMax;if(e.sCount[u]-e.blkIndent>=4||e.src.charCodeAt(r)!==62)return!1;if(t)return!0;const s=[],a=[],c=[],l=[],d=e.md.block.ruler.getRules("blockquote"),h=e.parentType;e.parentType="blockquote";let p=!1,f;for(f=u;f<n;f++){const b=e.sCount[f]<e.blkIndent;if(r=e.bMarks[f]+e.tShift[f],o=e.eMarks[f],r>=o)break;if(e.src.charCodeAt(r++)===62&&!b){let k=e.sCount[f]+1,y,S;e.src.charCodeAt(r)===32?(r++,k++,S=!1,y=!0):e.src.charCodeAt(r)===9?(y=!0,(e.bsCount[f]+k)%4===3?(r++,k++,S=!1):S=!0):y=!1;let P=k;for(s.push(e.bMarks[f]),e.bMarks[f]=r;r<o;){const W=e.src.charCodeAt(r);if(w(W))W===9?P+=4-(P+e.bsCount[f]+(S?1:0))%4:P++;else break;r++}p=r>=o,a.push(e.bsCount[f]),e.bsCount[f]=e.sCount[f]+1+(y?1:0),c.push(e.sCount[f]),e.sCount[f]=P-k,l.push(e.tShift[f]),e.tShift[f]=r-e.bMarks[f];continue}if(p)break;let m=!1;for(let k=0,y=d.length;k<y;k++)if(d[k](e,f,n,!0)){m=!0;break}if(m){e.lineMax=f,e.blkIndent!==0&&(s.push(e.bMarks[f]),a.push(e.bsCount[f]),l.push(e.tShift[f]),c.push(e.sCount[f]),e.sCount[f]-=e.blkIndent);break}s.push(e.bMarks[f]),a.push(e.bsCount[f]),l.push(e.tShift[f]),c.push(e.sCount[f]),e.sCount[f]=-1}const g=e.blkIndent;e.blkIndent=0;const _=e.push("blockquote_open","blockquote",1);_.markup=">";const C=[u,0];_.map=C,e.md.block.tokenize(e,u,f);const x=e.push("blockquote_close","blockquote",-1);x.markup=">",e.lineMax=i,e.parentType=h,C[1]=e.line;for(let b=0;b<l.length;b++)e.bMarks[b+u]=s[b],e.tShift[b+u]=l[b],e.sCount[b+u]=c[b],e.bsCount[b+u]=a[b];return e.blkIndent=g,!0}function Ir(e,u,n,t){const r=e.eMarks[u];if(e.sCount[u]-e.blkIndent>=4)return!1;let o=e.bMarks[u]+e.tShift[u];const i=e.src.charCodeAt(o++);if(i!==42&&i!==45&&i!==95)return!1;let s=1;for(;o<r;){const c=e.src.charCodeAt(o++);if(c!==i&&!w(c))return!1;c===i&&s++}if(s<3)return!1;if(t)return!0;e.line=u+1;const a=e.push("hr","hr",0);return a.map=[u,e.line],a.markup=Array(s+1).join(String.fromCharCode(i)),!0}function Tu(e,u){const n=e.eMarks[u];let t=e.bMarks[u]+e.tShift[u];const r=e.src.charCodeAt(t++);if(r!==42&&r!==45&&r!==43)return-1;if(t<n){const o=e.src.charCodeAt(t);if(!w(o))return-1}return t}function Au(e,u){const n=e.bMarks[u]+e.tShift[u],t=e.eMarks[u];let r=n;if(r+1>=t)return-1;let o=e.src.charCodeAt(r++);if(o<48||o>57)return-1;for(;;){if(r>=t)return-1;if(o=e.src.charCodeAt(r++),o>=48&&o<=57){if(r-n>=10)return-1;continue}if(o===41||o===46)break;return-1}return r<t&&(o=e.src.charCodeAt(r),!w(o))?-1:r}function Lr(e,u){const n=e.level+2;for(let t=u+2,r=e.tokens.length-2;t<r;t++)e.tokens[t].level===n&&e.tokens[t].type==="paragraph_open"&&(e.tokens[t+2].hidden=!0,e.tokens[t].hidden=!0,t+=2)}function Mr(e,u,n,t){let r,o,i,s,a=u,c=!0;if(e.sCount[a]-e.blkIndent>=4||e.listIndent>=0&&e.sCount[a]-e.listIndent>=4&&e.sCount[a]<e.blkIndent)return!1;let l=!1;t&&e.parentType==="paragraph"&&e.sCount[a]>=e.blkIndent&&(l=!0);let d,h,p;if((p=Au(e,a))>=0){if(d=!0,i=e.bMarks[a]+e.tShift[a],h=Number(e.src.slice(i,p-1)),l&&h!==1)return!1}else if((p=Tu(e,a))>=0)d=!1;else return!1;if(l&&e.skipSpaces(p)>=e.eMarks[a])return!1;if(t)return!0;const f=e.src.charCodeAt(p-1),g=e.tokens.length;d?(s=e.push("ordered_list_open","ol",1),h!==1&&(s.attrs=[["start",h]])):s=e.push("bullet_list_open","ul",1);const _=[a,0];s.map=_,s.markup=String.fromCharCode(f);let C=!1;const x=e.md.block.ruler.getRules("list"),b=e.parentType;for(e.parentType="list";a<n;){o=p,r=e.eMarks[a];const m=e.sCount[a]+p-(e.bMarks[a]+e.tShift[a]);let k=m;for(;o<r;){const Q=e.src.charCodeAt(o);if(Q===9)k+=4-(k+e.bsCount[a])%4;else if(Q===32)k++;else break;o++}const y=o;let S;y>=r?S=1:S=k-m,S>4&&(S=1);const P=m+S;s=e.push("list_item_open","li",1),s.markup=String.fromCharCode(f);const W=[a,0];s.map=W,d&&(s.info=e.src.slice(i,p-1));const oe=e.tight,Oe=e.tShift[a],Pn=e.sCount[a],Fn=e.listIndent;if(e.listIndent=e.blkIndent,e.blkIndent=P,e.tight=!0,e.tShift[a]=y-e.bMarks[a],e.sCount[a]=k,y>=r&&e.isEmpty(a+1)?e.line=Math.min(e.line+2,n):e.md.block.tokenize(e,a,n,!0),(!e.tight||C)&&(c=!1),C=e.line-a>1&&e.isEmpty(e.line-1),e.blkIndent=e.listIndent,e.listIndent=Fn,e.tShift[a]=Oe,e.sCount[a]=Pn,e.tight=oe,s=e.push("list_item_close","li",-1),s.markup=String.fromCharCode(f),a=e.line,W[1]=a,a>=n||e.sCount[a]<e.blkIndent||e.sCount[a]-e.blkIndent>=4)break;let hu=!1;for(let Q=0,In=x.length;Q<In;Q++)if(x[Q](e,a,n,!0)){hu=!0;break}if(hu)break;if(d){if(p=Au(e,a),p<0)break;i=e.bMarks[a]+e.tShift[a]}else if(p=Tu(e,a),p<0)break;if(f!==e.src.charCodeAt(p-1))break}return d?s=e.push("ordered_list_close","ol",-1):s=e.push("bullet_list_close","ul",-1),s.markup=String.fromCharCode(f),_[1]=a,e.line=a,e.parentType=b,c&&Lr(e,g),!0}function Or(e,u,n,t){let r=e.bMarks[u]+e.tShift[u],o=e.eMarks[u],i=u+1;if(e.sCount[u]-e.blkIndent>=4||e.src.charCodeAt(r)!==91)return!1;function s(x){const b=e.lineMax;if(x>=b||e.isEmpty(x))return null;let m=!1;if(e.sCount[x]-e.blkIndent>3&&(m=!0),e.sCount[x]<0&&(m=!0),!m){const S=e.md.block.ruler.getRules("reference"),P=e.parentType;e.parentType="reference";let W=!1;for(let oe=0,Oe=S.length;oe<Oe;oe++)if(S[oe](e,x,b,!0)){W=!0;break}if(e.parentType=P,W)return null}const k=e.bMarks[x]+e.tShift[x],y=e.eMarks[x];return e.src.slice(k,y+1)}let a=e.src.slice(r,o+1);o=a.length;let c=-1;for(r=1;r<o;r++){const x=a.charCodeAt(r);if(x===91)return!1;if(x===93){c=r;break}else if(x===10){const b=s(i);b!==null&&(a+=b,o=a.length,i++)}else if(x===92&&(r++,r<o&&a.charCodeAt(r)===10)){const b=s(i);b!==null&&(a+=b,o=a.length,i++)}}if(c<0||a.charCodeAt(c+1)!==58)return!1;for(r=c+2;r<o;r++){const x=a.charCodeAt(r);if(x===10){const b=s(i);b!==null&&(a+=b,o=a.length,i++)}else if(!w(x))break}const l=e.md.helpers.parseLinkDestination(a,r,o);if(!l.ok)return!1;const d=e.md.normalizeLink(l.str);if(!e.md.validateLink(d))return!1;r=l.pos;const h=r,p=i,f=r;for(;r<o;r++){const x=a.charCodeAt(r);if(x===10){const b=s(i);b!==null&&(a+=b,o=a.length,i++)}else if(!w(x))break}let g=e.md.helpers.parseLinkTitle(a,r,o);for(;g.can_continue;){const x=s(i);if(x===null)break;a+=x,r=o,o=a.length,i++,g=e.md.helpers.parseLinkTitle(a,r,o,g)}let _;for(r<o&&f!==r&&g.ok?(_=g.str,r=g.pos):(_="",r=h,i=p);r<o;){const x=a.charCodeAt(r);if(!w(x))break;r++}if(r<o&&a.charCodeAt(r)!==10&&_)for(_="",r=h,i=p;r<o;){const x=a.charCodeAt(r);if(!w(x))break;r++}if(r<o&&a.charCodeAt(r)!==10)return!1;const C=Re(a.slice(1,c));return C?(t||(typeof e.env.references>"u"&&(e.env.references={}),typeof e.env.references[C]>"u"&&(e.env.references[C]={title:_,href:d}),e.line=i),!0):!1}const Hr=["address","article","aside","base","basefont","blockquote","body","caption","center","col","colgroup","dd","details","dialog","dir","div","dl","dt","fieldset","figcaption","figure","footer","form","frame","frameset","h1","h2","h3","h4","h5","h6","head","header","hr","html","iframe","legend","li","link","main","menu","menuitem","nav","noframes","ol","optgroup","option","p","param","search","section","summary","table","tbody","td","tfoot","th","thead","title","tr","track","ul"],Nr="[a-zA-Z_:][a-zA-Z0-9:._-]*",Wr="[^\"'=<>`\\x00-\\x20]+",Br="'[^']*'",zr='"[^"]*"',qr="(?:"+Wr+"|"+Br+"|"+zr+")",jr="(?:\\s+"+Nr+"(?:\\s*=\\s*"+qr+")?)",sn="<[A-Za-z][A-Za-z0-9\\-]*"+jr+"*\\s*\\/?>",an="<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>",Ur="<!---?>|<!--(?:[^-]|-[^-]|--[^>])*-->",Vr="<[?][\\s\\S]*?[?]>",Gr="<![A-Za-z][^>]*>",$r="<!\\[CDATA\\[[\\s\\S]*?\\]\\]>",Zr=new RegExp("^(?:"+sn+"|"+an+"|"+Ur+"|"+Vr+"|"+Gr+"|"+$r+")"),Kr=new RegExp("^(?:"+sn+"|"+an+")"),G=[[/^<(script|pre|style|textarea)(?=(\s|>|$))/i,/<\/(script|pre|style|textarea)>/i,!0],[/^<!--/,/-->/,!0],[/^<\?/,/\?>/,!0],[/^<![A-Z]/,/>/,!0],[/^<!\[CDATA\[/,/\]\]>/,!0],[new RegExp("^</?("+Hr.join("|")+")(?=(\\s|/?>|$))","i"),/^$/,!0],[new RegExp(Kr.source+"\\s*$"),/^$/,!1]];function Jr(e,u,n,t){let r=e.bMarks[u]+e.tShift[u],o=e.eMarks[u];if(e.sCount[u]-e.blkIndent>=4||!e.md.options.html||e.src.charCodeAt(r)!==60)return!1;let i=e.src.slice(r,o),s=0;for(;s<G.length&&!G[s][0].test(i);s++);if(s===G.length)return!1;if(t)return G[s][2];let a=u+1;const c=G[s][1].test("");if(!G[s][1].test(i)){for(;a<n&&!(e.sCount[a]<e.blkIndent&&(c||!e.isEmpty(a)));a++)if(r=e.bMarks[a]+e.tShift[a],o=e.eMarks[a],i=e.src.slice(r,o),G[s][1].test(i)){i.length!==0&&a++;break}}e.line=a;const l=e.push("html_block","",0);return l.map=[u,a],l.content=e.getLines(u,a,e.blkIndent,!0),!0}function Yr(e,u,n,t){let r=e.bMarks[u]+e.tShift[u],o=e.eMarks[u];if(e.sCount[u]-e.blkIndent>=4)return!1;let i=e.src.charCodeAt(r);if(i!==35||r>=o)return!1;let s=1;for(i=e.src.charCodeAt(++r);i===35&&r<o&&s<=6;)s++,i=e.src.charCodeAt(++r);if(s>6||r<o&&!w(i))return!1;if(t)return!0;o=e.skipSpacesBack(o,r);const a=e.skipCharsBack(o,35,r);a>r&&w(e.src.charCodeAt(a-1))&&(o=a),e.line=u+1;const c=e.push("heading_open","h"+String(s),1);c.markup="########".slice(0,s),c.map=[u,e.line];const l=e.push("inline","",0);l.content=Pe(e.src.slice(r,o)),l.map=[u,e.line],l.children=[];const d=e.push("heading_close","h"+String(s),-1);return d.markup="########".slice(0,s),!0}function Xr(e,u,n){const t=e.md.block.ruler.getRules("paragraph");if(e.sCount[u]-e.blkIndent>=4)return!1;const r=e.parentType;e.parentType="paragraph";let o=0,i,s=u+1;for(;s<n&&!e.isEmpty(s);s++){if(e.sCount[s]-e.blkIndent>3)continue;if(e.sCount[s]>=e.blkIndent){let p=e.bMarks[s]+e.tShift[s];const f=e.eMarks[s];if(p<f&&(i=e.src.charCodeAt(p),(i===45||i===61)&&(p=e.skipChars(p,i),p=e.skipSpaces(p),p>=f))){o=i===61?1:2;break}}if(e.sCount[s]<0)continue;let h=!1;for(let p=0,f=t.length;p<f;p++)if(t[p](e,s,n,!0)){h=!0;break}if(h)break}if(!o)return e.parentType=r,!1;const a=Pe(e.getLines(u,s,e.blkIndent,!1));e.line=s+1;const c=e.push("heading_open","h"+String(o),1);c.markup=String.fromCharCode(i),c.map=[u,e.line];const l=e.push("inline","",0);l.content=a,l.map=[u,e.line-1],l.children=[];const d=e.push("heading_close","h"+String(o),-1);return d.markup=String.fromCharCode(i),e.parentType=r,!0}function Qr(e,u,n){const t=e.md.block.ruler.getRules("paragraph"),r=e.parentType;let o=u+1;for(e.parentType="paragraph";o<n&&!e.isEmpty(o);o++){if(e.sCount[o]-e.blkIndent>3||e.sCount[o]<0)continue;let c=!1;for(let l=0,d=t.length;l<d;l++)if(t[l](e,o,n,!0)){c=!0;break}if(c)break}const i=Pe(e.getLines(u,o,e.blkIndent,!1));e.line=o;const s=e.push("paragraph_open","p",1);s.map=[u,e.line];const a=e.push("inline","",0);return a.content=i,a.map=[u,e.line],a.children=[],e.push("paragraph_close","p",-1),e.parentType=r,!0}const _e=[["table",Ar,["paragraph","reference"]],["code",Rr],["fence",Pr,["paragraph","reference","blockquote","list"]],["blockquote",Fr,["paragraph","reference","blockquote","list"]],["hr",Ir,["paragraph","reference","blockquote","list"]],["list",Mr,["paragraph","reference","blockquote"]],["reference",Or],["html_block",Jr,["paragraph","reference","blockquote"]],["heading",Yr,["paragraph","reference","blockquote"]],["lheading",Xr],["paragraph",Qr]];function Fe(){this.ruler=new T;for(let e=0;e<_e.length;e++)this.ruler.push(_e[e][0],_e[e][1],{alt:(_e[e][2]||[]).slice()})}Fe.prototype.tokenize=function(e,u,n){const t=this.ruler.getRules(""),r=t.length,o=e.md.options.maxNesting;let i=u,s=!1;for(;i<n&&(e.line=i=e.skipEmptyLines(i),!(i>=n||e.sCount[i]<e.blkIndent));){if(e.level>=o){e.line=n;break}const a=e.line;let c=!1;for(let l=0;l<r;l++)if(c=t[l](e,i,n,!1),c){if(a>=e.line)throw new Error("block rule didn't increment state.line");break}if(!c)throw new Error("none of the block rules matched");e.tight=!s,e.isEmpty(e.line-1)&&(s=!0),i=e.line,i<n&&e.isEmpty(i)&&(s=!0,i++,e.line=i)}};Fe.prototype.parse=function(e,u,n,t){if(!e)return;const r=new this.State(e,u,n,t);this.tokenize(r,r.line,r.lineMax)};Fe.prototype.State=H;function be(e,u,n,t){this.src=e,this.env=n,this.md=u,this.tokens=t,this.tokens_meta=Array(t.length),this.pos=0,this.posMax=this.src.length,this.level=0,this.pending="",this.pendingLevel=0,this.cache={},this.delimiters=[],this._prev_delimiters=[],this.backticks={},this.backticksScanned=!1,this.linkLevel=0}be.prototype.pushPending=function(){const e=new F("text","",0);return e.content=this.pending,e.level=this.pendingLevel,this.tokens.push(e),this.pending="",e};be.prototype.push=function(e,u,n){this.pending&&this.pushPending();const t=new F(e,u,n);let r=null;return n<0&&(this.level--,this.delimiters=this._prev_delimiters.pop()),t.level=this.level,n>0&&(this.level++,this._prev_delimiters.push(this.delimiters),this.delimiters=[],r={delimiters:this.delimiters}),this.pendingLevel=this.level,this.tokens.push(t),this.tokens_meta.push(r),t};be.prototype.scanDelims=function(e,u){const n=this.posMax,t=this.src.charCodeAt(e);let r;if(e===0)r=32;else if(e===1)r=this.src.charCodeAt(0),(r&63488)===55296&&(r=65533);else if(r=this.src.charCodeAt(e-1),(r&64512)===56320){const _=this.src.charCodeAt(e-2);r=(_&64512)===55296?65536+(_-55296<<10)+(r-56320):65533}else(r&64512)===55296&&(r=65533);let o=e;for(;o<n&&this.src.charCodeAt(o)===t;)o++;const i=o-e;let s=o<n?this.src.charCodeAt(o):32;if((s&64512)===55296){const _=this.src.charCodeAt(o+1);s=(_&64512)===56320?65536+(s-55296<<10)+(_-56320):65533}else(s&64512)===56320&&(s=65533);const a=de(r)||le(r),c=de(s)||le(s),l=ce(r),d=ce(s),h=!d&&(!c||l||a),p=!l&&(!a||d||c);return{can_open:h&&(u||!p||a),can_close:p&&(u||!h||c),length:i}};be.prototype.Token=F;function e0(e){switch(e){case 10:case 33:case 35:case 36:case 37:case 38:case 42:case 43:case 45:case 58:case 60:case 61:case 62:case 64:case 91:case 92:case 93:case 94:case 95:case 96:case 123:case 125:case 126:return!0;default:return!1}}function u0(e,u){let n=e.pos;for(;n<e.posMax&&!e0(e.src.charCodeAt(n));)n++;return n===e.pos?!1:(u||(e.pending+=e.src.slice(e.pos,n)),e.pos=n,!0)}const n0=/(?:^|[^a-z0-9.+-])([a-z][a-z0-9.+-]*)$/i;function t0(e,u){if(!e.md.options.linkify||e.linkLevel>0)return!1;const n=e.pos,t=e.posMax;if(n+3>t||e.src.charCodeAt(n)!==58||e.src.charCodeAt(n+1)!==47||e.src.charCodeAt(n+2)!==47)return!1;const r=e.pending.match(n0);if(!r)return!1;const o=r[1],i=e.md.linkify.matchAtStart(e.src.slice(n-o.length));if(!i)return!1;let s=i.url;if(s.length<=o.length)return!1;let a=s.length;for(;a>0&&s.charCodeAt(a-1)===42;)a--;a!==s.length&&(s=s.slice(0,a));const c=e.md.normalizeLink(s);if(!e.md.validateLink(c))return!1;if(!u){e.pending=e.pending.slice(0,-o.length);const l=e.push("link_open","a",1);l.attrs=[["href",c]],l.markup="linkify",l.info="auto";const d=e.push("text","",0);d.content=e.md.normalizeLinkText(s);const h=e.push("link_close","a",-1);h.markup="linkify",h.info="auto"}return e.pos+=s.length-o.length,!0}function r0(e,u){let n=e.pos;if(e.src.charCodeAt(n)!==10)return!1;const t=e.pending.length-1,r=e.posMax;if(!u)if(t>=0&&e.pending.charCodeAt(t)===32)if(t>=1&&e.pending.charCodeAt(t-1)===32){let o=t-1;for(;o>=1&&e.pending.charCodeAt(o-1)===32;)o--;e.pending=e.pending.slice(0,o),e.push("hardbreak","br",0)}else e.pending=e.pending.slice(0,-1),e.push("softbreak","br",0);else e.push("softbreak","br",0);for(n++;n<r&&w(e.src.charCodeAt(n));)n++;return e.pos=n,!0}const su=[];for(let e=0;e<256;e++)su.push(0);"\\!\"#$%&'()*+,./:;<=>?@[]^_`{|}~-".split("").forEach(function(e){su[e.charCodeAt(0)]=1});function o0(e,u){let n=e.pos;const t=e.posMax;if(e.src.charCodeAt(n)!==92||(n++,n>=t))return!1;let r=e.src.charCodeAt(n);if(r===10){for(u||e.push("hardbreak","br",0),n++;n<t&&(r=e.src.charCodeAt(n),!!w(r));)n++;return e.pos=n,!0}let o=e.src[n];if(r>=55296&&r<=56319&&n+1<t){const s=e.src.charCodeAt(n+1);s>=56320&&s<=57343&&(o+=e.src[n+1],n++)}const i="\\"+o;if(!u){const s=e.push("text_special","",0);r<256&&su[r]!==0?s.content=o:s.content=i,s.markup=i,s.info="escape"}return e.pos=n+1,!0}function i0(e,u){let n=e.pos;if(e.src.charCodeAt(n)!==96)return!1;const r=n;n++;const o=e.posMax;for(;n<o&&e.src.charCodeAt(n)===96;)n++;const i=e.src.slice(r,n),s=i.length;if(e.backticksScanned&&(e.backticks[s]||0)<=r)return u||(e.pending+=i),e.pos+=s,!0;let a=n,c;for(;(c=e.src.indexOf("`",a))!==-1;){for(a=c+1;a<o&&e.src.charCodeAt(a)===96;)a++;const l=a-c;if(l===s){if(!u){const d=e.push("code_inline","code",0);d.markup=i,d.content=e.src.slice(n,c).replace(/\n/g," ").replace(/^ (.+) $/,"$1")}return e.pos=a,!0}e.backticks[l]=c}return e.backticksScanned=!0,u||(e.pending+=i),e.pos+=s,!0}function s0(e,u){const n=e.pos,t=e.src.charCodeAt(n);if(u||t!==126)return!1;const r=e.scanDelims(e.pos,!0);let o=r.length;const i=String.fromCharCode(t);if(o<2)return!1;let s;o%2&&(s=e.push("text","",0),s.content=i,o--);for(let a=0;a<o;a+=2)s=e.push("text","",0),s.content=i+i,e.delimiters.push({marker:t,length:0,token:e.tokens.length-1,end:-1,open:r.can_open,close:r.can_close});return e.pos+=r.length,!0}function Ru(e,u){let n;const t=[],r=u.length;for(let o=0;o<r;o++){const i=u[o];if(i.marker!==126||i.end===-1)continue;const s=u[i.end];n=e.tokens[i.token],n.type="s_open",n.tag="s",n.nesting=1,n.markup="~~",n.content="",n=e.tokens[s.token],n.type="s_close",n.tag="s",n.nesting=-1,n.markup="~~",n.content="",e.tokens[s.token-1].type==="text"&&e.tokens[s.token-1].content==="~"&&t.push(s.token-1)}for(;t.length;){const o=t.pop();let i=o+1;for(;i<e.tokens.length&&e.tokens[i].type==="s_close";)i++;i--,o!==i&&(n=e.tokens[i],e.tokens[i]=e.tokens[o],e.tokens[o]=n)}}function a0(e){const u=e.tokens_meta,n=e.tokens_meta.length;Ru(e,e.delimiters);for(let t=0;t<n;t++)u[t]&&u[t].delimiters&&Ru(e,u[t].delimiters)}const cn={tokenize:s0,postProcess:a0};function c0(e,u){const n=e.pos,t=e.src.charCodeAt(n);if(u||t!==95&&t!==42)return!1;const r=e.scanDelims(e.pos,t===42);for(let o=0;o<r.length;o++){const i=e.push("text","",0);i.content=String.fromCharCode(t),e.delimiters.push({marker:t,length:r.length,token:e.tokens.length-1,end:-1,open:r.can_open,close:r.can_close})}return e.pos+=r.length,!0}function Pu(e,u){const n=u.length;for(let t=n-1;t>=0;t--){const r=u[t];if(r.marker!==95&&r.marker!==42||r.end===-1)continue;const o=u[r.end],i=t>0&&u[t-1].end===r.end+1&&u[t-1].marker===r.marker&&u[t-1].token===r.token-1&&u[r.end+1].token===o.token+1,s=String.fromCharCode(r.marker),a=e.tokens[r.token];a.type=i?"strong_open":"em_open",a.tag=i?"strong":"em",a.nesting=1,a.markup=i?s+s:s,a.content="";const c=e.tokens[o.token];c.type=i?"strong_close":"em_close",c.tag=i?"strong":"em",c.nesting=-1,c.markup=i?s+s:s,c.content="",i&&(e.tokens[u[t-1].token].content="",e.tokens[u[r.end+1].token].content="",t--)}}function l0(e){const u=e.tokens_meta,n=e.tokens_meta.length;Pu(e,e.delimiters);for(let t=0;t<n;t++)u[t]&&u[t].delimiters&&Pu(e,u[t].delimiters)}const ln={tokenize:c0,postProcess:l0};function d0(e,u){let n,t,r,o,i="",s="",a=e.pos,c=!0;if(e.src.charCodeAt(e.pos)!==91)return!1;const l=e.pos,d=e.posMax,h=e.pos+1,p=e.md.helpers.parseLinkLabel(e,e.pos,!0);if(p<0)return!1;let f=p+1;if(f<d&&e.src.charCodeAt(f)===40){for(c=!1,f++;f<d&&(n=e.src.charCodeAt(f),!(!w(n)&&n!==10));f++);if(f>=d)return!1;if(a=f,r=e.md.helpers.parseLinkDestination(e.src,f,e.posMax),r.ok){for(i=e.md.normalizeLink(r.str),e.md.validateLink(i)?f=r.pos:i="",a=f;f<d&&(n=e.src.charCodeAt(f),!(!w(n)&&n!==10));f++);if(r=e.md.helpers.parseLinkTitle(e.src,f,e.posMax),f<d&&a!==f&&r.ok)for(s=r.str,f=r.pos;f<d&&(n=e.src.charCodeAt(f),!(!w(n)&&n!==10));f++);}(f>=d||e.src.charCodeAt(f)!==41)&&(c=!0),f++}if(c){if(typeof e.env.references>"u")return!1;if(f<d&&e.src.charCodeAt(f)===91?(a=f+1,f=e.md.helpers.parseLinkLabel(e,f),f>=0?t=e.src.slice(a,f++):f=p+1):f=p+1,t||(t=e.src.slice(h,p)),o=e.env.references[Re(t)],!o)return e.pos=l,!1;i=o.href,s=o.title}if(!u){e.pos=h,e.posMax=p;const g=e.push("link_open","a",1),_=[["href",i]];g.attrs=_,s&&_.push(["title",s]),e.linkLevel++,e.md.inline.tokenize(e),e.linkLevel--,e.push("link_close","a",-1)}return e.pos=f,e.posMax=d,!0}function f0(e,u){let n,t,r,o,i,s,a,c,l="";const d=e.pos,h=e.posMax;if(e.src.charCodeAt(e.pos)!==33||e.src.charCodeAt(e.pos+1)!==91)return!1;const p=e.pos+2,f=e.md.helpers.parseLinkLabel(e,e.pos+1,!1);if(f<0)return!1;if(o=f+1,o<h&&e.src.charCodeAt(o)===40){for(o++;o<h&&(n=e.src.charCodeAt(o),!(!w(n)&&n!==10));o++);if(o>=h)return!1;for(c=o,s=e.md.helpers.parseLinkDestination(e.src,o,e.posMax),s.ok&&(l=e.md.normalizeLink(s.str),e.md.validateLink(l)?o=s.pos:l=""),c=o;o<h&&(n=e.src.charCodeAt(o),!(!w(n)&&n!==10));o++);if(s=e.md.helpers.parseLinkTitle(e.src,o,e.posMax),o<h&&c!==o&&s.ok)for(a=s.str,o=s.pos;o<h&&(n=e.src.charCodeAt(o),!(!w(n)&&n!==10));o++);else a="";if(o>=h||e.src.charCodeAt(o)!==41)return e.pos=d,!1;o++}else{if(typeof e.env.references>"u")return!1;if(o<h&&e.src.charCodeAt(o)===91?(c=o+1,o=e.md.helpers.parseLinkLabel(e,o),o>=0?r=e.src.slice(c,o++):o=f+1):o=f+1,r||(r=e.src.slice(p,f)),i=e.env.references[Re(r)],!i)return e.pos=d,!1;l=i.href,a=i.title}if(!u){t=e.src.slice(p,f);const g=[];e.md.inline.parse(t,e.md,e.env,g);const _=e.push("image","img",0),C=[["src",l],["alt",""]];_.attrs=C,_.children=g,_.content=t,a&&C.push(["title",a])}return e.pos=o,e.posMax=h,!0}const p0=/^([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/,h0=/^([a-zA-Z][a-zA-Z0-9+.-]{1,31}):([^<>\x00-\x20]*)$/;function b0(e,u){let n=e.pos;if(e.src.charCodeAt(n)!==60)return!1;const t=e.pos,r=e.posMax;for(;;){if(++n>=r)return!1;const i=e.src.charCodeAt(n);if(i===60)return!1;if(i===62)break}const o=e.src.slice(t+1,n);if(h0.test(o)){const i=e.md.normalizeLink(o);if(!e.md.validateLink(i))return!1;if(!u){const s=e.push("link_open","a",1);s.attrs=[["href",i]],s.markup="autolink",s.info="auto";const a=e.push("text","",0);a.content=e.md.normalizeLinkText(o);const c=e.push("link_close","a",-1);c.markup="autolink",c.info="auto"}return e.pos+=o.length+2,!0}if(p0.test(o)){const i=e.md.normalizeLink("mailto:"+o);if(!e.md.validateLink(i))return!1;if(!u){const s=e.push("link_open","a",1);s.attrs=[["href",i]],s.markup="autolink",s.info="auto";const a=e.push("text","",0);a.content=e.md.normalizeLinkText(o);const c=e.push("link_close","a",-1);c.markup="autolink",c.info="auto"}return e.pos+=o.length+2,!0}return!1}function m0(e){return/^<a[>\s]/i.test(e)}function x0(e){return/^<\/a\s*>/i.test(e)}function g0(e){const u=e|32;return u>=97&&u<=122}function _0(e,u){if(!e.md.options.html)return!1;const n=e.posMax,t=e.pos;if(e.src.charCodeAt(t)!==60||t+2>=n)return!1;const r=e.src.charCodeAt(t+1);if(r!==33&&r!==63&&r!==47&&!g0(r))return!1;const o=e.src.slice(t).match(Zr);if(!o)return!1;if(!u){const i=e.push("html_inline","",0);i.content=o[0],m0(i.content)&&e.linkLevel++,x0(i.content)&&e.linkLevel--}return e.pos+=o[0].length,!0}const k0=/^&#((?:x[a-f0-9]{1,6}|[0-9]{1,7}));/i,y0=/^&([a-z][a-z0-9]{1,31});/i;function C0(e,u){const n=e.pos,t=e.posMax;if(e.src.charCodeAt(n)!==38||n+1>=t)return!1;if(e.src.charCodeAt(n+1)===35){const o=e.src.slice(n).match(k0);if(o){if(!u){const i=o[1][0].toLowerCase()==="x"?parseInt(o[1].slice(1),16):parseInt(o[1],10),s=e.push("text_special","",0);s.content=ou(i)?ae(i):ae(65533),s.markup=o[0],s.info="entity"}return e.pos+=o[0].length,!0}}else{const o=e.src.slice(n).match(y0);if(o){const i=zt(o[0]);if(i!==o[0]){if(!u){const s=e.push("text_special","",0);s.content=i,s.markup=o[0],s.info="entity"}return e.pos+=o[0].length,!0}}}return!1}function Fu(e){const u={},n=e.length;if(!n)return;let t=0,r=-2;const o=[];for(let i=0;i<n;i++){const s=e[i];if(o.push(0),(e[t].marker!==s.marker||r!==s.token-1)&&(t=i),r=s.token,s.length=s.length||0,!s.close)continue;u.hasOwnProperty(s.marker)||(u[s.marker]=[-1,-1,-1,-1,-1,-1]);const a=u[s.marker][(s.open?3:0)+s.length%3];let c=t-o[t]-1,l=c;for(;c>a;c-=o[c]+1){const d=e[c];if(d.marker===s.marker&&d.open&&d.end<0){let h=!1;if((d.close||s.open)&&(d.length+s.length)%3===0&&(d.length%3!==0||s.length%3!==0)&&(h=!0),!h){const p=c>0&&!e[c-1].open?o[c-1]+1:0;o[i]=i-c+p,o[c]=p,s.open=!1,d.end=i,d.close=!1,l=-1,r=-2;break}}}l!==-1&&(u[s.marker][(s.open?3:0)+(s.length||0)%3]=l)}}function w0(e){const u=e.tokens_meta,n=e.tokens_meta.length;Fu(e.delimiters);for(let t=0;t<n;t++)u[t]&&u[t].delimiters&&Fu(u[t].delimiters)}function S0(e){let u,n,t=0;const r=e.tokens,o=e.tokens.length;for(u=n=0;u<o;u++)r[u].nesting<0&&t--,r[u].level=t,r[u].nesting>0&&t++,r[u].type==="text"&&u+1<o&&r[u+1].type==="text"?r[u+1].content=r[u].content+r[u+1].content:(u!==n&&(r[n]=r[u]),n++);u!==n&&(r.length=n)}const ze=[["text",u0],["linkify",t0],["newline",r0],["escape",o0],["backticks",i0],["strikethrough",cn.tokenize],["emphasis",ln.tokenize],["link",d0],["image",f0],["autolink",b0],["html_inline",_0],["entity",C0]],qe=[["balance_pairs",w0],["strikethrough",cn.postProcess],["emphasis",ln.postProcess],["fragments_join",S0]];function me(){this.ruler=new T;for(let e=0;e<ze.length;e++)this.ruler.push(ze[e][0],ze[e][1]);this.ruler2=new T;for(let e=0;e<qe.length;e++)this.ruler2.push(qe[e][0],qe[e][1])}me.prototype.skipToken=function(e){const u=e.pos,n=this.ruler.getRules(""),t=n.length,r=e.md.options.maxNesting,o=e.cache;if(typeof o[u]<"u"){e.pos=o[u];return}let i=!1;if(e.level<r){for(let s=0;s<t;s++)if(e.level++,i=n[s](e,!0),e.level--,i){if(u>=e.pos)throw new Error("inline rule didn't increment state.pos");break}}else e.pos=e.posMax;i||e.pos++,o[u]=e.pos};me.prototype.tokenize=function(e){const u=this.ruler.getRules(""),n=u.length,t=e.posMax,r=e.md.options.maxNesting;for(;e.pos<t;){const o=e.pos;let i=!1;if(e.level<r){for(let s=0;s<n;s++)if(i=u[s](e,!1),i){if(o>=e.pos)throw new Error("inline rule didn't increment state.pos");break}}if(i){if(e.pos>=t)break;continue}e.pending+=e.src[e.pos++]}e.pending&&e.pushPending()};me.prototype.parse=function(e,u,n,t){const r=new this.State(e,u,n,t);this.tokenize(r);const o=this.ruler2.getRules(""),i=o.length;for(let s=0;s<i;s++)o[s](r)};me.prototype.State=be;function D0(e){const u={};e=e||{},u.src_Any=Ku.source,u.src_Cc=Ju.source,u.src_Z=Xu.source,u.src_P=tu.source,u.src_ZPCc=[u.src_Z,u.src_P,u.src_Cc].join("|"),u.src_ZCc=[u.src_Z,u.src_Cc].join("|");const n="[><｜]";return u.src_pseudo_letter="(?:(?!"+n+"|"+u.src_ZPCc+")"+u.src_Any+")",u.src_ip4="(?:(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)",u.src_auth="(?:(?:(?!"+u.src_ZCc+"|[@/\\[\\]()]).)+@)?",u.src_port="(?::(?:6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5])))|[1-5]?\\d{1,4}))?",u.src_host_terminator="(?=$|"+n+"|"+u.src_ZPCc+")(?!"+(e["---"]?"-(?!--)|":"-|")+"_|:\\d|\\.-|\\.(?!$|"+u.src_ZPCc+"))",u.src_path="(?:[/?#](?:(?!"+u.src_ZCc+"|"+n+`|[()[\\]{}.,"'?!\\-;]).|\\[(?:(?!`+u.src_ZCc+"|\\]).)*\\]|\\((?:(?!"+u.src_ZCc+"|[)]).)*\\)|\\{(?:(?!"+u.src_ZCc+'|[}]).)*\\}|\\"(?:(?!'+u.src_ZCc+`|["]).)+\\"|\\'(?:(?!`+u.src_ZCc+"|[']).)+\\'|\\'(?="+u.src_pseudo_letter+"|[-])|\\.{2,}[a-zA-Z0-9%/&]|\\.(?!"+u.src_ZCc+"|[.]|$)|"+(e["---"]?"\\-(?!--(?:[^-]|$))(?:-*)|":"\\-+|")+",(?!"+u.src_ZCc+"|$)|;(?!"+u.src_ZCc+"|$)|\\!+(?!"+u.src_ZCc+"|[!]|$)|\\?(?!"+u.src_ZCc+"|[?]|$))+|\\/)?",u.src_email_name='[\\-;:&=\\+\\$,\\.a-zA-Z0-9_][\\-;:&=\\+\\$,\\"\\.a-zA-Z0-9_]*',u.src_xn="xn--[a-z0-9\\-]{1,59}",u.src_domain_root="(?:"+u.src_xn+"|"+u.src_pseudo_letter+"{1,63})",u.src_domain="(?:"+u.src_xn+"|(?:"+u.src_pseudo_letter+")|(?:"+u.src_pseudo_letter+"(?:-|"+u.src_pseudo_letter+"){0,61}"+u.src_pseudo_letter+"))",u.src_host="(?:(?:(?:(?:"+u.src_domain+")\\.)*"+u.src_domain+"))",u.tpl_host_fuzzy="(?:"+u.src_ip4+"|(?:(?:(?:"+u.src_domain+")\\.)+(?:%TLDS%)))",u.tpl_host_no_ip_fuzzy="(?:(?:(?:"+u.src_domain+")\\.)+(?:%TLDS%))",u.src_host_strict=u.src_host+u.src_host_terminator,u.tpl_host_fuzzy_strict=u.tpl_host_fuzzy+u.src_host_terminator,u.src_host_port_strict=u.src_host+u.src_port+u.src_host_terminator,u.tpl_host_port_fuzzy_strict=u.tpl_host_fuzzy+u.src_port+u.src_host_terminator,u.tpl_host_port_no_ip_fuzzy_strict=u.tpl_host_no_ip_fuzzy+u.src_port+u.src_host_terminator,u.tpl_host_fuzzy_test="localhost|www\\.|\\.\\d{1,3}\\.|(?:\\.(?:%TLDS%)(?:"+u.src_ZPCc+"|>|$))",u.tpl_email_fuzzy="(^|"+n+'|"|\\(|'+u.src_ZCc+")("+u.src_email_name+"@"+u.tpl_host_fuzzy_strict+")",u.tpl_link_fuzzy="(^|(?![.:/\\-_@])(?:[$+<=>^`|｜]|"+u.src_ZPCc+"))((?![$+<=>^`|｜])"+u.tpl_host_port_fuzzy_strict+u.src_path+")",u.tpl_link_no_ip_fuzzy="(^|(?![.:/\\-_@])(?:[$+<=>^`|｜]|"+u.src_ZPCc+"))((?![$+<=>^`|｜])"+u.tpl_host_port_no_ip_fuzzy_strict+u.src_path+")",u}function Ye(e){return Array.prototype.slice.call(arguments,1).forEach(function(n){n&&Object.keys(n).forEach(function(t){e[t]=n[t]})}),e}function Ie(e){return Object.prototype.toString.call(e)}function E0(e){return Ie(e)==="[object String]"}function v0(e){return Ie(e)==="[object Object]"}function T0(e){return Ie(e)==="[object RegExp]"}function Iu(e){return Ie(e)==="[object Function]"}function A0(e){return e.replace(/[.?*+^$[\]\\(){}|-]/g,"\\$&")}const dn={fuzzyLink:!0,fuzzyEmail:!0,fuzzyIP:!1};function R0(e){return Object.keys(e||{}).reduce(function(u,n){return u||dn.hasOwnProperty(n)},!1)}const P0={"http:":{validate:function(e,u,n){const t=e.slice(u);return n.re.http||(n.re.http=new RegExp("^\\/\\/"+n.re.src_auth+n.re.src_host_port_strict+n.re.src_path,"i")),n.re.http.test(t)?t.match(n.re.http)[0].length:0}},"https:":"http:","ftp:":"http:","//":{validate:function(e,u,n){const t=e.slice(u);return n.re.no_http||(n.re.no_http=new RegExp("^"+n.re.src_auth+"(?:localhost|(?:(?:"+n.re.src_domain+")\\.)+"+n.re.src_domain_root+")"+n.re.src_port+n.re.src_host_terminator+n.re.src_path,"i")),n.re.no_http.test(t)?u>=3&&e[u-3]===":"||u>=3&&e[u-3]==="/"?0:t.match(n.re.no_http)[0].length:0}},"mailto:":{validate:function(e,u,n){const t=e.slice(u);return n.re.mailto||(n.re.mailto=new RegExp("^"+n.re.src_email_name+"@"+n.re.src_host_strict,"i")),n.re.mailto.test(t)?t.match(n.re.mailto)[0].length:0}}},F0="a[cdefgilmnoqrstuwxz]|b[abdefghijmnorstvwyz]|c[acdfghiklmnoruvwxyz]|d[ejkmoz]|e[cegrstu]|f[ijkmor]|g[abdefghilmnpqrstuwy]|h[kmnrtu]|i[delmnoqrst]|j[emop]|k[eghimnprwyz]|l[abcikrstuvy]|m[acdeghklmnopqrstuvwxyz]|n[acefgilopruz]|om|p[aefghklmnrstwy]|qa|r[eosuw]|s[abcdeghijklmnortuvxyz]|t[cdfghjklmnortvwz]|u[agksyz]|v[aceginu]|w[fs]|y[et]|z[amw]",I0="biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|рф".split("|");function L0(e){return function(u,n){const t=u.slice(n);return e.test(t)?t.match(e)[0].length:0}}function Lu(){return function(e,u){u.normalize(e)}}function ye(e){const u=e.re=D0(e.__opts__),n=e.__tlds__.slice();e.onCompile(),e.__tlds_replaced__||n.push(F0),n.push(u.src_xn),u.src_tlds=n.join("|");function t(s){return s.replace("%TLDS%",u.src_tlds)}u.email_fuzzy=RegExp(t(u.tpl_email_fuzzy),"i"),u.email_fuzzy_global=RegExp(t(u.tpl_email_fuzzy),"ig"),u.link_fuzzy=RegExp(t(u.tpl_link_fuzzy),"i"),u.link_fuzzy_global=RegExp(t(u.tpl_link_fuzzy),"ig"),u.link_no_ip_fuzzy=RegExp(t(u.tpl_link_no_ip_fuzzy),"i"),u.link_no_ip_fuzzy_global=RegExp(t(u.tpl_link_no_ip_fuzzy),"ig"),u.host_fuzzy_test=RegExp(t(u.tpl_host_fuzzy_test),"i");const r=[];e.__compiled__={};function o(s,a){throw new Error('(LinkifyIt) Invalid schema "'+s+'": '+a)}Object.keys(e.__schemas__).forEach(function(s){const a=e.__schemas__[s];if(a===null)return;const c={validate:null,link:null};if(e.__compiled__[s]=c,v0(a)){T0(a.validate)?c.validate=L0(a.validate):Iu(a.validate)?c.validate=a.validate:o(s,a),Iu(a.normalize)?c.normalize=a.normalize:a.normalize?o(s,a):c.normalize=Lu();return}if(E0(a)){r.push(s);return}o(s,a)}),r.forEach(function(s){e.__compiled__[e.__schemas__[s]]&&(e.__compiled__[s].validate=e.__compiled__[e.__schemas__[s]].validate,e.__compiled__[s].normalize=e.__compiled__[e.__schemas__[s]].normalize)}),e.__compiled__[""]={validate:null,normalize:Lu()};const i=Object.keys(e.__compiled__).filter(function(s){return s.length>0&&e.__compiled__[s]}).map(A0).join("|");e.re.schema_test=RegExp("(^|(?!_)(?:[><｜]|"+u.src_ZPCc+"))("+i+")","i"),e.re.schema_search=RegExp("(^|(?!_)(?:[><｜]|"+u.src_ZPCc+"))("+i+")","ig"),e.re.schema_at_start=RegExp("^"+e.re.schema_search.source,"i"),e.re.pretest=RegExp("("+e.re.schema_test.source+")|("+e.re.host_fuzzy_test.source+")|@","i")}function fn(e,u,n,t){const r=e.slice(n,t);this.schema=u.toLowerCase(),this.index=n,this.lastIndex=t,this.raw=r,this.text=r,this.url=r}function A(e,u){if(!(this instanceof A))return new A(e,u);u||R0(e)&&(u=e,e={}),this.__opts__=Ye({},dn,u),this.__schemas__=Ye({},P0,e),this.__compiled__={},this.__tlds__=I0,this.__tlds_replaced__=!1,this.re={},ye(this)}A.prototype.add=function(u,n){return this.__schemas__[u]=n,ye(this),this};A.prototype.set=function(u){return this.__opts__=Ye(this.__opts__,u),this};A.prototype.test=function(u){if(!u.length)return!1;let n,t;if(this.re.schema_test.test(u)){for(t=this.re.schema_search,t.lastIndex=0;(n=t.exec(u))!==null;)if(this.testSchemaAt(u,n[2],t.lastIndex))return!0}return!!(this.__opts__.fuzzyLink&&this.__compiled__["http:"]&&u.search(this.re.host_fuzzy_test)>=0&&u.match(this.__opts__.fuzzyIP?this.re.link_fuzzy:this.re.link_no_ip_fuzzy)!==null||this.__opts__.fuzzyEmail&&this.__compiled__["mailto:"]&&u.indexOf("@")>=0&&u.match(this.re.email_fuzzy)!==null)};A.prototype.pretest=function(u){return this.re.pretest.test(u)};A.prototype.testSchemaAt=function(u,n,t){return this.__compiled__[n.toLowerCase()]?this.__compiled__[n.toLowerCase()].validate(u,t,this):0};A.prototype.match=function(u){const n=[],t=[],r=[],o=[];let i,s,a;function c(h,p){return h?p?h.index!==p.index?h.index<p.index?h:p:h.lastIndex>=p.lastIndex?h:p:h:p}if(!u.length)return null;if(this.re.schema_test.test(u))for(a=this.re.schema_search,a.lastIndex=0;(i=a.exec(u))!==null;)s=this.testSchemaAt(u,i[2],a.lastIndex),s&&t.push({schema:i[2],index:i.index+i[1].length,lastIndex:i.index+i[0].length+s});if(this.__opts__.fuzzyLink&&this.__compiled__["http:"])for(a=this.__opts__.fuzzyIP?this.re.link_fuzzy_global:this.re.link_no_ip_fuzzy_global,a.lastIndex=0;(i=a.exec(u))!==null;)r.push({schema:"",index:i.index+i[1].length,lastIndex:i.index+i[0].length});if(this.__opts__.fuzzyEmail&&this.__compiled__["mailto:"])for(a=this.re.email_fuzzy_global,a.lastIndex=0;(i=a.exec(u))!==null;)o.push({schema:"mailto:",index:i.index+i[1].length,lastIndex:i.index+i[0].length});const l=[0,0,0];let d=0;for(;;){const h=[t[l[0]],o[l[1]],r[l[2]]],p=c(c(h[0],h[1]),h[2]);if(!p)break;if(p===h[0]?l[0]++:p===h[1]?l[1]++:l[2]++,p.index<d)continue;const f=new fn(u,p.schema,p.index,p.lastIndex);this.__compiled__[f.schema].normalize(f,this),n.push(f),d=p.lastIndex}return n.length?n:null};A.prototype.matchAtStart=function(u){if(!u.length)return null;const n=this.re.schema_at_start.exec(u);if(!n)return null;const t=this.testSchemaAt(u,n[2],n[0].length);if(!t)return null;const r=new fn(u,n[2],n.index+n[1].length,n.index+n[0].length+t);return this.__compiled__[r.schema].normalize(r,this),r};A.prototype.tlds=function(u,n){return u=Array.isArray(u)?u:[u],n?(this.__tlds__=this.__tlds__.concat(u).sort().filter(function(t,r,o){return t!==o[r-1]}).reverse(),ye(this),this):(this.__tlds__=u.slice(),this.__tlds_replaced__=!0,ye(this),this)};A.prototype.normalize=function(u){u.schema||(u.url="http://"+u.url),u.schema==="mailto:"&&!/^mailto:/i.test(u.url)&&(u.url="mailto:"+u.url)};A.prototype.onCompile=function(){};const ee=2147483647,I=36,au=1,fe=26,M0=38,O0=700,pn=72,hn=128,bn="-",H0=/^xn--/,N0=/[^\0-\x7F]/,W0=/[\x2E\u3002\uFF0E\uFF61]/g,B0={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},je=I-au,L=Math.floor,Ue=String.fromCharCode;function z(e){throw new RangeError(B0[e])}function z0(e,u){const n=[];let t=e.length;for(;t--;)n[t]=u(e[t]);return n}function mn(e,u){const n=e.split("@");let t="";n.length>1&&(t=n[0]+"@",e=n[1]),e=e.replace(W0,".");const r=e.split("."),o=z0(r,u).join(".");return t+o}function xn(e){const u=[];let n=0;const t=e.length;for(;n<t;){const r=e.charCodeAt(n++);if(r>=55296&&r<=56319&&n<t){const o=e.charCodeAt(n++);(o&64512)==56320?u.push(((r&1023)<<10)+(o&1023)+65536):(u.push(r),n--)}else u.push(r)}return u}const q0=e=>String.fromCodePoint(...e),j0=function(e){return e>=48&&e<58?26+(e-48):e>=65&&e<91?e-65:e>=97&&e<123?e-97:I},Mu=function(e,u){return e+22+75*(e<26)-((u!=0)<<5)},gn=function(e,u,n){let t=0;for(e=n?L(e/O0):e>>1,e+=L(e/u);e>je*fe>>1;t+=I)e=L(e/je);return L(t+(je+1)*e/(e+M0))},_n=function(e){const u=[],n=e.length;let t=0,r=hn,o=pn,i=e.lastIndexOf(bn);i<0&&(i=0);for(let s=0;s<i;++s)e.charCodeAt(s)>=128&&z("not-basic"),u.push(e.charCodeAt(s));for(let s=i>0?i+1:0;s<n;){const a=t;for(let l=1,d=I;;d+=I){s>=n&&z("invalid-input");const h=j0(e.charCodeAt(s++));h>=I&&z("invalid-input"),h>L((ee-t)/l)&&z("overflow"),t+=h*l;const p=d<=o?au:d>=o+fe?fe:d-o;if(h<p)break;const f=I-p;l>L(ee/f)&&z("overflow"),l*=f}const c=u.length+1;o=gn(t-a,c,a==0),L(t/c)>ee-r&&z("overflow"),r+=L(t/c),t%=c,u.splice(t++,0,r)}return String.fromCodePoint(...u)},kn=function(e){const u=[];e=xn(e);const n=e.length;let t=hn,r=0,o=pn;for(const a of e)a<128&&u.push(Ue(a));const i=u.length;let s=i;for(i&&u.push(bn);s<n;){let a=ee;for(const l of e)l>=t&&l<a&&(a=l);const c=s+1;a-t>L((ee-r)/c)&&z("overflow"),r+=(a-t)*c,t=a;for(const l of e)if(l<t&&++r>ee&&z("overflow"),l===t){let d=r;for(let h=I;;h+=I){const p=h<=o?au:h>=o+fe?fe:h-o;if(d<p)break;const f=d-p,g=I-p;u.push(Ue(Mu(p+f%g,0))),d=L(f/g)}u.push(Ue(Mu(d,0))),o=gn(r,c,s===i),r=0,++s}++r,++t}return u.join("")},U0=function(e){return mn(e,function(u){return H0.test(u)?_n(u.slice(4).toLowerCase()):u})},V0=function(e){return mn(e,function(u){return N0.test(u)?"xn--"+kn(u):u})},yn={version:"2.3.1",ucs2:{decode:xn,encode:q0},decode:_n,encode:kn,toASCII:V0,toUnicode:U0},G0={options:{html:!1,xhtmlOut:!1,breaks:!1,langPrefix:"language-",linkify:!1,typographer:!1,quotes:"“”‘’",highlight:null,maxNesting:100},components:{core:{},block:{},inline:{}}},$0={options:{html:!1,xhtmlOut:!1,breaks:!1,langPrefix:"language-",linkify:!1,typographer:!1,quotes:"“”‘’",highlight:null,maxNesting:20},components:{core:{rules:["normalize","block","inline","text_join"]},block:{rules:["paragraph"]},inline:{rules:["text"],rules2:["balance_pairs","fragments_join"]}}},Z0={options:{html:!0,xhtmlOut:!0,breaks:!1,langPrefix:"language-",linkify:!1,typographer:!1,quotes:"“”‘’",highlight:null,maxNesting:20},components:{core:{rules:["normalize","block","inline","text_join"]},block:{rules:["blockquote","code","fence","heading","hr","html_block","lheading","list","reference","paragraph"]},inline:{rules:["autolink","backticks","emphasis","entity","escape","html_inline","image","link","newline","text"],rules2:["balance_pairs","emphasis","fragments_join"]}}},K0={default:G0,zero:$0,commonmark:Z0},J0=/^(vbscript|javascript|file|data):/,Y0=/^data:image\/(gif|png|jpeg|webp);/;function X0(e){const u=e.trim().toLowerCase();return J0.test(u)?Y0.test(u):!0}const Cn=["http:","https:","mailto:"];function Q0(e){const u=nu(e,!0);if(u.hostname&&(!u.protocol||Cn.indexOf(u.protocol)>=0))try{u.hostname=yn.toASCII(u.hostname)}catch{}return he(uu(u))}function eo(e){const u=nu(e,!0);if(u.hostname&&(!u.protocol||Cn.indexOf(u.protocol)>=0))try{u.hostname=yn.toUnicode(u.hostname)}catch{}return ue(uu(u),ue.defaultChars+"%")}function R(e,u){if(!(this instanceof R))return new R(e,u);u||ru(e)||(u=e||{},e="default"),this.inline=new me,this.block=new Fe,this.core=new iu,this.renderer=new re,this.linkify=new A,this.validateLink=X0,this.normalizeLink=Q0,this.normalizeLinkText=eo,this.utils=tr,this.helpers=Ae({},sr),this.options={},this.configure(e),u&&this.set(u)}R.prototype.set=function(e){return Ae(this.options,e),this};R.prototype.configure=function(e){const u=this;if(ru(e)){const n=e;if(e=K0[n],!e)throw new Error('Wrong `markdown-it` preset "'+n+'", check name')}if(!e)throw new Error("Wrong `markdown-it` preset, can't be empty");return e.options&&u.set(e.options),e.components&&Object.keys(e.components).forEach(function(n){e.components[n].rules&&u[n].ruler.enableOnly(e.components[n].rules),e.components[n].rules2&&u[n].ruler2.enableOnly(e.components[n].rules2)}),this};R.prototype.enable=function(e,u){let n=[];Array.isArray(e)||(e=[e]),["core","block","inline"].forEach(function(r){n=n.concat(this[r].ruler.enable(e,!0))},this),n=n.concat(this.inline.ruler2.enable(e,!0));const t=e.filter(function(r){return n.indexOf(r)<0});if(t.length&&!u)throw new Error("MarkdownIt. Failed to enable unknown rule(s): "+t);return this};R.prototype.disable=function(e,u){let n=[];Array.isArray(e)||(e=[e]),["core","block","inline"].forEach(function(r){n=n.concat(this[r].ruler.disable(e,!0))},this),n=n.concat(this.inline.ruler2.disable(e,!0));const t=e.filter(function(r){return n.indexOf(r)<0});if(t.length&&!u)throw new Error("MarkdownIt. Failed to disable unknown rule(s): "+t);return this};R.prototype.use=function(e){const u=[this].concat(Array.prototype.slice.call(arguments,1));return e.apply(e,u),this};R.prototype.parse=function(e,u){if(typeof e!="string")throw new Error("Input data should be a String");const n=new this.core.State(e,this,u);return this.core.process(n),n.tokens};R.prototype.render=function(e,u){return u=u||{},this.renderer.render(this.parse(e,u),this.options,u)};R.prototype.parseInline=function(e,u){const n=new this.core.State(e,this,u);return n.inlineMode=!0,this.core.process(n),n.tokens};R.prototype.renderInline=function(e,u){return u=u||{},this.renderer.render(this.parseInline(e,u),this.options,u)};var Ou=!1,te={false:"push",true:"unshift",after:"push",before:"unshift"},Ce={isPermalinkSymbol:!0};function Xe(e,u,n,t){var r;if(!Ou){var o="Using deprecated markdown-it-anchor permalink option, see https://github.com/valeriangalliat/markdown-it-anchor#permalinks";typeof process=="object"&&process&&process.emitWarning?process.emitWarning(o):console.warn(o),Ou=!0}var i=[Object.assign(new n.Token("link_open","a",1),{attrs:[].concat(u.permalinkClass?[["class",u.permalinkClass]]:[],[["href",u.permalinkHref(e,n)]],Object.entries(u.permalinkAttrs(e,n)))}),Object.assign(new n.Token("html_block","",0),{content:u.permalinkSymbol,meta:Ce}),new n.Token("link_close","a",-1)];u.permalinkSpace&&n.tokens[t+1].children[te[u.permalinkBefore]](Object.assign(new n.Token("text","",0),{content:" "})),(r=n.tokens[t+1].children)[te[u.permalinkBefore]].apply(r,i)}function wn(e){return"#"+e}function Sn(e){return{}}var uo={class:"header-anchor",symbol:"#",renderHref:wn,renderAttrs:Sn};function xe(e){function u(n){return n=Object.assign({},u.defaults,n),function(t,r,o,i){return e(t,n,r,o,i)}}return u.defaults=Object.assign({},uo),u.renderPermalinkImpl=e,u}function cu(e){var u=[],n=e.filter(function(t){if(t[0]!=="class")return!0;u.push(t[1])});return u.length>0&&n.unshift(["class",u.join(" ")]),n}var Le=xe(function(e,u,n,t,r){var o,i=[Object.assign(new t.Token("link_open","a",1),{attrs:cu([].concat(u.class?[["class",u.class]]:[],[["href",u.renderHref(e,t)]],u.ariaHidden?[["aria-hidden","true"]]:[],Object.entries(u.renderAttrs(e,t))))}),Object.assign(new t.Token("html_inline","",0),{content:u.symbol,meta:Ce}),new t.Token("link_close","a",-1)];if(u.space){var s=typeof u.space=="string"?u.space:" ";t.tokens[r+1].children[te[u.placement]](Object.assign(new t.Token(typeof u.space=="string"?"html_inline":"text","",0),{content:s}))}(o=t.tokens[r+1].children)[te[u.placement]].apply(o,i)});Object.assign(Le.defaults,{space:!0,placement:"after",ariaHidden:!1});var $=xe(Le.renderPermalinkImpl);$.defaults=Object.assign({},Le.defaults,{ariaHidden:!0});var Dn=xe(function(e,u,n,t,r){var o=[Object.assign(new t.Token("link_open","a",1),{attrs:cu([].concat(u.class?[["class",u.class]]:[],[["href",u.renderHref(e,t)]],Object.entries(u.renderAttrs(e,t))))})].concat(u.safariReaderFix?[new t.Token("span_open","span",1)]:[],t.tokens[r+1].children,u.safariReaderFix?[new t.Token("span_close","span",-1)]:[],[new t.Token("link_close","a",-1)]);t.tokens[r+1]=Object.assign(new t.Token("inline","",0),{children:o})});Object.assign(Dn.defaults,{safariReaderFix:!1});var Hu=xe(function(e,u,n,t,r){var o;if(!["visually-hidden","aria-label","aria-describedby","aria-labelledby"].includes(u.style))throw new Error("`permalink.linkAfterHeader` called with unknown style option `"+u.style+"`");if(!["aria-describedby","aria-labelledby"].includes(u.style)&&!u.assistiveText)throw new Error("`permalink.linkAfterHeader` called without the `assistiveText` option in `"+u.style+"` style");if(u.style==="visually-hidden"&&!u.visuallyHiddenClass)throw new Error("`permalink.linkAfterHeader` called without the `visuallyHiddenClass` option in `visually-hidden` style");var i=t.tokens[r+1].children.filter(function(d){return d.type==="text"||d.type==="code_inline"}).reduce(function(d,h){return d+h.content},""),s=[],a=[];if(u.class&&a.push(["class",u.class]),a.push(["href",u.renderHref(e,t)]),a.push.apply(a,Object.entries(u.renderAttrs(e,t))),u.style==="visually-hidden"){if(s.push(Object.assign(new t.Token("span_open","span",1),{attrs:[["class",u.visuallyHiddenClass]]}),Object.assign(new t.Token("text","",0),{content:u.assistiveText(i)}),new t.Token("span_close","span",-1)),u.space){var c=typeof u.space=="string"?u.space:" ";s[te[u.placement]](Object.assign(new t.Token(typeof u.space=="string"?"html_inline":"text","",0),{content:c}))}s[te[u.placement]](Object.assign(new t.Token("span_open","span",1),{attrs:[["aria-hidden","true"]]}),Object.assign(new t.Token("html_inline","",0),{content:u.symbol,meta:Ce}),new t.Token("span_close","span",-1))}else s.push(Object.assign(new t.Token("html_inline","",0),{content:u.symbol,meta:Ce}));u.style==="aria-label"?a.push(["aria-label",u.assistiveText(i)]):["aria-describedby","aria-labelledby"].includes(u.style)&&a.push([u.style,e]);var l=[Object.assign(new t.Token("link_open","a",1),{attrs:cu(a)})].concat(s,[new t.Token("link_close","a",-1)]);(o=t.tokens).splice.apply(o,[r+3,0].concat(l)),u.wrapper&&(t.tokens.splice(r,0,Object.assign(new t.Token("html_block","",0),{content:u.wrapper[0]+`
`})),t.tokens.splice(r+3+l.length+1,0,Object.assign(new t.Token("html_block","",0),{content:u.wrapper[1]+`
`})))});function Nu(e,u,n,t){var r=e,o=t;if(n&&Object.prototype.hasOwnProperty.call(u,r))throw new Error("User defined `id` attribute `"+e+"` is not unique. Please fix it in your Markdown to continue.");for(;Object.prototype.hasOwnProperty.call(u,r);)r=e+"-"+o,o+=1;return u[r]=!0,r}function K(e,u){u=Object.assign({},K.defaults,u),e.core.ruler.push("anchor",function(n){for(var t,r={},o=n.tokens,i=Array.isArray(u.level)?(t=u.level,function(d){return t.includes(d)}):(function(d){return function(h){return h>=d}})(u.level),s=0;s<o.length;s++){var a=o[s];if(a.type==="heading_open"&&i(Number(a.tag.substr(1)))){var c=u.getTokensText(o[s+1].children),l=a.attrGet("id");l=l==null?Nu(l=u.slugifyWithState?u.slugifyWithState(c,n):u.slugify(c),r,!1,u.uniqueSlugStartIndex):Nu(l,r,!0,u.uniqueSlugStartIndex),a.attrSet("id",l),u.tabIndex!==!1&&a.attrSet("tabindex",""+u.tabIndex),typeof u.permalink=="function"?u.permalink(l,u,n,s):(u.permalink||u.renderPermalink&&u.renderPermalink!==Xe)&&u.renderPermalink(l,u,n,s),s=o.indexOf(a),u.callback&&u.callback(a,{slug:l,title:c})}}})}Object.assign(Hu.defaults,{style:"visually-hidden",space:!0,placement:"after",wrapper:null}),K.permalink={__proto__:null,legacy:Xe,renderHref:wn,renderAttrs:Sn,makePermalink:xe,linkInsideHeader:Le,ariaHidden:$,headerLink:Dn,linkAfterHeader:Hu},K.defaults={level:1,slugify:function(e){return encodeURIComponent(String(e).trim().toLowerCase().replace(/\s+/g,"-"))},uniqueSlugStartIndex:1,tabIndex:"-1",getTokensText:function(e){return e.filter(function(u){return["text","code_inline"].includes(u.type)}).map(function(u){return u.content}).join("")},permalink:!1,renderPermalink:Xe,permalinkClass:$.defaults.class,permalinkSpace:$.defaults.space,permalinkSymbol:"¶",permalinkBefore:$.defaults.placement==="before",permalinkHref:$.defaults.renderHref,permalinkAttrs:$.defaults.renderAttrs},K.default=K;const En=[{group:"开始使用",items:[{title:"项目总览",path:"overview.md"},{title:"在线 Demo",path:"online-demo.md"},{title:"一键安装器",path:"installers.md"},{title:"排障指南",path:"troubleshooting.md"}]},{group:"集成方案",items:[{title:"Chrome 扩展方案",path:"chrome-extension.md"},{title:"通用组件方案",path:"universal-components.md"},{title:"桌面免插件",path:"desktop-native.md"},{title:"SDK API",path:"sdk-api.md"},{title:"多路与生命周期",path:"multi-stream-lifecycle.md"}]},{group:"协议与运维",items:[{title:"WebRTC / H.265",path:"webrtc-hevc.md"},{title:"小米摄像头",path:"xiaomi-rtsp.md"},{title:"安全模型",path:"security.md"},{title:"部署发布",path:"deployment.md"},{title:"验证记录",path:"validation.md"}]},{group:"文章",items:[{title:"最新实现长文",path:"articles/rtsp-player-latest-wechat.md"},{title:"项目诞生长文",path:"articles/rtsp-player-wechat.md"}]}],no=Object.assign({"../../docs/articles/rtsp-player-latest-wechat.md":Ln,"../../docs/articles/rtsp-player-wechat.md":Mn,"../../docs/chrome-extension.md":On,"../../docs/deployment.md":Hn,"../../docs/desktop-native.md":Nn,"../../docs/installers.md":Wn,"../../docs/multi-stream-lifecycle.md":Bn,"../../docs/online-demo.md":zn,"../../docs/overview.md":qn,"../../docs/sdk-api.md":jn,"../../docs/security.md":Un,"../../docs/troubleshooting.md":Vn,"../../docs/universal-components.md":Gn,"../../docs/validation.md":$n,"../../docs/webrtc-hevc.md":Zn,"../../docs/xiaomi-rtsp.md":Kn}),to=Object.assign({"../../docs/assets/contact.jpg":Jn,"../../docs/assets/donate-alipay.jpg":Yn,"../../docs/assets/donate-wx.jpg":Xn,"../../docs/assets/mp.png":Qn,"../../docs/assets/public-rtsp-e2e.png":et,"../../docs/assets/rtsp-player-latest-architecture.png":ut,"../../docs/assets/rtsp-player-latest-architecture.svg":nt,"../../docs/assets/rtsp-player-latest-cover-bg.png":tt,"../../docs/assets/rtsp-player-latest-cover.png":rt,"../../docs/assets/rtsp-player-wechat-cover.png":ot}),ro=new Map(Object.entries(no).map(([e,u])=>[pe(e.replace(/^.*\/docs\//,"")),u])),oo=new Map(Object.entries(to).map(([e,u])=>[`/docs/assets/${e.split("/").pop()}`,u])),X=new R({html:!1,linkify:!0,typographer:!0}).use(K,{slugify:go,permalink:K.permalink.linkInsideHeader({symbol:"#",placement:"after",class:"docs-anchor",ariaHidden:!0})}),io=X.renderer.rules.link_open||((e,u,n,t,r)=>r.renderToken(e,u,n)),so=X.renderer.rules.image||((e,u,n,t,r)=>r.renderToken(e,u,n));X.renderer.rules.link_open=(e,u,n,t,r)=>{const o=e[u],i=o.attrGet("href");if(i){const s=xo(i,t.currentPath||"overview.md");o.attrSet("href",s),/^https?:\/\//i.test(s)&&(o.attrSet("target","_blank"),o.attrSet("rel","noreferrer"))}return io(e,u,n,t,r)};X.renderer.rules.image=(e,u,n,t,r)=>{const o=e[u],i=o.attrGet("src");return i&&o.attrSet("src",Tn(i,t.currentPath||"overview.md")),o.attrSet("loading","lazy"),o.attrSet("decoding","async"),so(e,u,n,t,r)};X.renderer.rules.table_open=()=>'<div class="docs-table-wrap"><table>';X.renderer.rules.table_close=()=>"</table></div>";const Wu=Array.from(document.querySelectorAll("[data-tab]")),ao=Array.from(document.querySelectorAll("[data-panel]"));for(const e of Wu)e.addEventListener("click",()=>{const u=e.dataset.tab;for(const n of Wu)n.classList.toggle("active",n===e);for(const n of ao)n.classList.toggle("active",n.dataset.panel===u)});const co=Array.from(document.querySelectorAll("main section[id]")),Bu=new Map(Array.from(document.querySelectorAll("nav a[href^='#']")).map(e=>[e.getAttribute("href").slice(1),e])),lo=new IntersectionObserver(e=>{const u=e.filter(n=>n.isIntersecting).sort((n,t)=>t.intersectionRatio-n.intersectionRatio)[0];if(u){for(const n of Bu.values())n.removeAttribute("aria-current");Bu.get(u.target.id)?.setAttribute("aria-current","page")}},{rootMargin:"-20% 0px -60% 0px",threshold:[.1,.4,.7]});for(const e of co)lo.observe(e);const we=document.querySelector("#docs-nav"),se=document.querySelector("#docs-content"),Me=new Map(En.flatMap(e=>e.items.map(u=>[u.path,u])));we&&se&&(fo(),window.addEventListener("hashchange",()=>{location.hash.startsWith("#docs")&&Se(zu(),{scroll:!1})}),Se(zu(),{scroll:!1}));function fo(){we.innerHTML="";for(const e of En){const u=document.createElement("section");u.className="docs-nav-group";const n=document.createElement("h3");n.textContent=e.group,u.appendChild(n);for(const t of e.items){const r=document.createElement("button");r.type="button",r.dataset.docPath=t.path,r.textContent=t.title,r.addEventListener("click",()=>{history.replaceState(null,"",`#docs/${t.path}`),Se(t.path,{scroll:!0})}),u.appendChild(r)}we.appendChild(u)}}function zu(){const e=decodeURIComponent(location.hash||"").match(/^#docs\/(.+)$/),u=pe(e?.[1]||"overview.md");return Me.has(u)?u:"overview.md"}async function Se(e,{scroll:u=!1}={}){e=pe(e),Me.has(e)||(e="overview.md"),po(e),se.innerHTML='<div class="docs-loading">正在加载文档…</div>';try{const n=ro.get(e)??await bo(e);se.innerHTML=mo(n,e),ho(e),u&&document.querySelector("#docs")?.scrollIntoView({block:"start"})}catch(n){se.innerHTML=`
      <div class="docs-error">
        <h2>文档加载失败</h2>
        <p>${_o(n?.message||String(n))}</p>
      </div>
    `}}function po(e){we.querySelectorAll("button[data-doc-path]").forEach(u=>{u.classList.toggle("active",u.dataset.docPath===e)})}function ho(e){se.querySelectorAll("a[href]").forEach(u=>{const n=u.getAttribute("href")||"",t=vn(n,e);!t||!Me.has(t)||u.addEventListener("click",r=>{r.preventDefault(),history.replaceState(null,"",`#docs/${t}`),Se(t,{scroll:!0})})})}function pe(e){return e.replace(/^\/?docs\//,"").replace(/^\.\//,"").replace(/\/+/g,"/")}function vn(e,u){if(!e||e.startsWith("#")||/^https?:\/\//i.test(e))return"";const n=e.split("#")[0].split("?")[0];if(!n.endsWith(".md"))return"";if(n.startsWith("/docs/"))return pe(n);const t=u.split("/").slice(0,-1);for(const r of n.split("/"))!r||r==="."||(r===".."?t.pop():t.push(r));return pe(t.join("/"))}async function bo(e){const u=await fetch(`/docs/${e}`);if(!u.ok)throw new Error(`HTTP ${u.status}`);const n=await u.text();if(/^\s*(<!doctype html|<html\b)/i.test(n))throw new Error("Markdown document endpoint returned HTML fallback.");return n}function mo(e,u){const n=e.replace(/^---[\s\S]*?---\s*/,"").replace(/\r\n/g,`
`);return`<div class="docs-markdown">${X.render(n,{currentPath:u})}</div>`}function Tn(e,u){if(/^(https?:)?\/\//i.test(e)||e.startsWith("data:"))return e;const n=`/docs/${u}`.split("/").slice(0,-1);for(const r of e.split("/"))!r||r==="."||(r===".."?n.pop():n.push(r));const t=n.join("/");return oo.get(t)||t}function xo(e,u){const n=vn(e,u);return n&&Me.has(n)?`#docs/${n}`:/^(https?:)?\/\//i.test(e)||e.startsWith("#")||e.startsWith("/")?e:Tn(e,u)}function go(e){return e.toLowerCase().replace(/<[^>]+>/g,"").replace(/[^\p{Letter}\p{Number}]+/gu,"-").replace(/^-+|-+$/g,"")||"section"}function _o(e){return String(e).replace(/[&<>"']/g,u=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[u])}const B=document.querySelector("#demo-canvas"),Ve=document.querySelector("#demo-toggle"),ko=document.querySelector("#demo-state"),yo=document.querySelector("#demo-fps"),Co=document.querySelector("#demo-latency"),wo=document.querySelector("#demo-queue"),So=document.querySelector("#demo-dropped");if(B){const e=B.getContext("2d",{alpha:!1});let u=!0,n=0,t=performance.now(),r=60,o=0,i=0,s=0;const a=()=>{const d=B.getBoundingClientRect(),h=Math.min(window.devicePixelRatio||1,2),p=Math.max(320,Math.round(d.width*h)),f=Math.max(180,Math.round(d.height*h));return(B.width!==p||B.height!==f)&&(B.width=p,B.height=f),e.setTransform(h,0,0,h,0,0),{width:p/h,height:f/h,ratio:h}},c=(d,h,p)=>{e.strokeStyle="rgba(143, 184, 216, .12)",e.lineWidth=1;const f=p/30%48;for(let g=-48+f;g<d+48;g+=48)e.beginPath(),e.moveTo(g,0),e.lineTo(g,h),e.stroke();for(let g=-48+f;g<h+48;g+=48)e.beginPath(),e.moveTo(0,g),e.lineTo(d,g),e.stroke()},l=d=>{s||(s=d),u&&(i+=d-s),s=d;const h=i,{width:p,height:f}=a(),g=h/1400%1,_=e.createLinearGradient(0,0,p,f);_.addColorStop(0,"#07110f"),_.addColorStop(.55,"#111716"),_.addColorStop(1,"#1b1d19"),e.fillStyle=_,e.fillRect(0,0,p,f),c(p,f,h),e.fillStyle="rgba(154, 210, 157, .10)",e.fillRect(0,f*g,p,3);const C=f*.66;e.fillStyle="rgba(244, 245, 242, .08)",e.fillRect(0,C,p,f*.18),e.fillStyle="rgba(228, 198, 122, .55)";for(let k=0;k<12;k+=1){const y=(h/9+k*120)%(p+140)-100;e.fillRect(y,C+f*.08,62,3)}const x=h/16%(p+260)-180;e.fillStyle="#8fb8d8",e.fillRect(x,C-28,92,26),e.fillStyle="#dfe8dd",e.fillRect(x+18,C-42,38,16),e.fillStyle="#050706",e.beginPath(),e.arc(x+22,C,7,0,Math.PI*2),e.arc(x+72,C,7,0,Math.PI*2),e.fill();const b=p*.76+Math.sin(h/700)*32,m=f*.46;if(e.strokeStyle="#e4c67a",e.lineWidth=5,e.beginPath(),e.arc(b,m-18,9,0,Math.PI*2),e.moveTo(b,m-8),e.lineTo(b,m+24),e.moveTo(b-18,m+3),e.lineTo(b+18,m+3),e.moveTo(b,m+24),e.lineTo(b-16,m+52),e.moveTo(b,m+24),e.lineTo(b+16,m+52),e.stroke(),e.strokeStyle="rgba(154, 210, 157, .9)",e.lineWidth=2,e.strokeRect(b-38,m-42,76,112),e.fillStyle="rgba(154, 210, 157, .15)",e.fillRect(b-38,m-42,76,18),e.fillStyle="rgba(5, 7, 6, .78)",e.fillRect(14,14,260,82),e.fillStyle="#f4f5f2",e.font="700 18px system-ui, sans-serif",e.fillText("RTSP Online Demo",28,44),e.font="13px system-ui, sans-serif",e.fillStyle="#b6bbb4",e.fillText(new Date().toLocaleTimeString("zh-CN",{hour12:!1}),28,70),e.fillText("Simulated low-latency preview",112,70),u){n+=1;const k=d-t;if(k>=500){r=Math.round(n*1e3/k),n=0,t=d;const y=42+Math.round(Math.abs(Math.sin(h/900))*18),S=Math.round(Math.abs(Math.sin(h/1300))*1);Math.sin(h/2800)>.995&&(o+=1),yo.textContent=String(r),Co.textContent=`${y}ms`,wo.textContent=String(S),So.textContent=String(o)}}requestAnimationFrame(l)};Ve?.addEventListener("click",()=>{u=!u,Ve.textContent=u?"Pause":"Play",Ve.setAttribute("aria-pressed",String(u)),ko.textContent=u?"Live Preview":"Paused"}),new ResizeObserver(a).observe(B),requestAnimationFrame(l)}const Do=document.querySelector("#live-demo-form"),Eo=document.querySelector("#live-stop"),De=document.querySelector("#live-player-mount"),Ge=document.querySelector("#live-demo-status"),J=document.querySelector("#live-extension-id"),Ee=document.querySelector("#live-rtsp-url");let v=null,ie=0;const vo="giegomfhcmgebjhdiihnjohoinkbcjbh",qu="rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1",To=new Set(["rtsp://127.0.0.1:8554/local","rtsp://192.168.28.62:8554/local"]),Ao={mac:"/downloads/rtsp-macos-installer.dmg",windows:"/downloads/rtsp-windows-installer.zip",linux:"/downloads/rtsp-linux-installer.tar.gz"},Y=document.querySelector("#install-dialog"),Ro=[document.querySelector("#open-install-assistant"),document.querySelector("#hero-install-assistant")].filter(Boolean),Po=Array.from(document.querySelectorAll("[data-install-close]")),Fo=document.querySelector("#recheck-install-status"),ve=document.querySelector("#install-extension-status"),lu=document.querySelector("#install-native-status"),du=document.querySelector("#install-origin-status"),$e=document.querySelector("#recommended-installer"),ju=document.querySelector("#installer-recommend-title"),Uu=document.querySelector("#installer-recommend-copy"),Vu=document.querySelector("#installer-list");let Te=!1,Qe=0;function q(e,u="neutral"){Ge&&(Ge.textContent=e,Ge.dataset.tone=u)}function Io(e,u){localStorage.setItem("rtsp-demo-extension-id",e),localStorage.setItem("rtsp-demo-url",u)}function Lo(){if(J&&(J.value=localStorage.getItem("rtsp-demo-extension-id")||vo),Ee){const e=(localStorage.getItem("rtsp-demo-url")||"").trim(),u=To.has(e)?qu:e||qu;e&&e!==u&&localStorage.setItem("rtsp-demo-url",u),Ee.value=u}}function Mo(){De&&(De.innerHTML=`
    <div class="mount-placeholder">
      <strong>等待真实 RTSP 输入</strong>
      <span>安装 runtime 后，这里会挂载扩展播放器 iframe。</span>
    </div>
  `)}function Oo(){window.clearTimeout(ie),v?.stop&&v.stop(),v=null,Mo(),q("真实播放已停止。","neutral")}function Ho(){const e=`${navigator.userAgentData?.platform||""} ${navigator.platform||""} ${navigator.userAgent||""}`.toLowerCase();return e.includes("win")?"windows":e.includes("mac")?"mac":e.includes("linux")||e.includes("x11")?"linux":"mac"}function An(){if(!$e||!ju||!Uu)return;const e=Ho(),u={mac:"macOS 安装器",windows:"Windows 安装器",linux:"Linux 安装器"},n={mac:"下载 DMG，打开 RTSP Installer.app，按提示完成安装。",windows:"下载 ZIP，解压后打开 RTSP Installer.hta，按提示完成安装。",linux:"下载压缩包，解压后打开 RTSP Installer.desktop 或运行 install-gui.sh。"};$e.href=Ao[e],$e.textContent=`下载 ${u[e]}`,ju.textContent=u[e],Uu.textContent=n[e],Vu&&Vu.querySelectorAll("[data-installer-platform]").forEach(t=>{t.hidden=t.dataset.installerPlatform!==e})}function M(e,u,n){e&&(e.textContent=u,e.style.color=n?"var(--green)":"var(--amber)")}function fu(){An();const e=Y?.classList.contains("open");Y?.classList.add("open"),Y?.setAttribute("aria-hidden","false"),document.body.style.overflow="hidden",e||pu()}function Rn(){Y?.classList.remove("open"),Y?.setAttribute("aria-hidden","true"),document.body.style.overflow="",sessionStorage.setItem("rtsp-install-assistant-dismissed","1")}function pu(){Te=!1,M(ve,"检测中",!1),window.clearTimeout(Qe),Qe=window.setTimeout(()=>{Te||(M(ve,"未检测到",!1),M(lu,"等待安装",!1),M(du,"等待安装",!1))},1200),window.postMessage({type:"RTSP_INSTALL_STATUS_REQUEST"},location.origin)}function No(e){Te=!0,window.clearTimeout(Qe);const u=!!(e.installed&&e.extensionId),n=!!e.nativeOk,t=!!e.originAllowed;M(ve,u?`已安装 ${e.extensionId}`:"未检测到",u),M(lu,n?`正常 ${e.nativePort||""}`:e.nativeError||"未检测到",n),M(du,t?"已授权":"未授权当前站点",t),u&&J&&!J.value&&(J.value=e.extensionId,localStorage.setItem("rtsp-demo-extension-id",e.extensionId)),!u||!n||!t?sessionStorage.getItem("rtsp-install-assistant-dismissed")||fu():Y?.classList.contains("open")&&q("扩展、Native Runtime 和当前站点授权均已就绪。","ok")}for(const e of Ro)e.addEventListener("click",fu);for(const e of Po)e.addEventListener("click",Rn);Fo?.addEventListener("click",()=>{pu()});window.addEventListener("keydown",e=>{e.key==="Escape"&&Y?.classList.contains("open")&&Rn()});window.addEventListener("message",e=>{if(e.source!==window||e.origin!==location.origin)return;const u=e.data||{};u.source!=="rtsp-web-player-extension"||u.type!=="RTSP_EXTENSION_STATUS"||No(u)});Lo();An();window.setTimeout(()=>{pu(),window.setTimeout(()=>{!Te&&!sessionStorage.getItem("rtsp-install-assistant-dismissed")&&(M(ve,"未检测到",!1),M(lu,"等待安装",!1),M(du,"等待安装",!1),fu())},1100)},400);Do?.addEventListener("submit",e=>{e.preventDefault();const u=J?.value.trim()||"",n=Ee?.value.trim()||"";if(!u){q("请输入 Chrome 扩展 ID。","error"),J?.focus();return}if(!n||!n.startsWith("rtsp://")){q("请输入 rtsp:// 开头的 RTSP URL。","error"),Ee?.focus();return}Io(u,n),ft("rtsp-live-player",{extensionId:u}),De.innerHTML="",v=document.createElement("rtsp-live-player"),v.setAttribute("extension-id",u),v.setAttribute("url",n),v.setAttribute("autoplay",""),v.setAttribute("controls",""),v.setAttribute("transport","auto"),v.setAttribute("codec","auto"),v.setAttribute("width","100%"),v.setAttribute("height","360"),v.addEventListener("ready",()=>{window.clearTimeout(ie),q("真实 RTSP 播放器已就绪。","ok")}),v.addEventListener("error",t=>{window.clearTimeout(ie);const r=t.detail?.error||"播放器返回错误，请检查 RTSP 地址、鉴权和 H.264 编码。";q(r,"error")}),De.appendChild(v),q("正在请求 Chrome 扩展播放器。若画面未出现，请检查扩展 ID、origin 授权和 Native Host。"),window.clearTimeout(ie),ie=window.setTimeout(()=>{q("仍在等待扩展响应。请确认扩展已安装，并已授权当前站点 origin。","error")},5e3)});Eo?.addEventListener("click",Oo);
