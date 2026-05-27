(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))t(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&t(i)}).observe(document,{childList:!0,subtree:!0});function u(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function t(r){if(r.ep)return;r.ep=!0;const o=u(r);fetch(r.href,o)}})();const Qu=`---
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
`,et=`---
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
`,nt=`# Chrome 扩展方案

Chrome 扩展方案适合业务网页、内网控制台、NVR 管理台和 SaaS 页面。用户安装 Runtime 后，页面可以直接使用 \`<rtsp-player>\`，扩展负责启动本地 Gateway、校验页面来源、转发播放控制和收集日志。

## 提供能力

- Chrome MV3 扩展。
- content script 自动挂载 \`<rtsp-player>\`。
- 扩展内 iframe 播放器。
- service worker 通过 Native Messaging 控制本地 host。
- popup 管理授权来源、日志、诊断和 Native Gateway 重启。
- 默认 WebRTC 优先，失败自动回退 WebSocket + WebCodecs。

## 推荐安装

普通用户建议直接使用图形安装器：

\`\`\`txt
https://rtsp.flyfish.dev/#demo
\`\`\`

安装器会复制本地 Runtime、准备扩展目录、注册 Native Messaging Host，并打开 Chrome 扩展页。

固定扩展 ID：

\`\`\`txt
giegomfhcmgebjhdiihnjohoinkbcjbh
\`\`\`

## 开发安装

构建 Native Runtime：

\`\`\`bash
./scripts/build.sh
\`\`\`

Windows：

\`\`\`powershell
./scripts/build.ps1
\`\`\`

加载扩展：

1. 打开 \`chrome://extensions\`。
2. 开启 **Developer mode**。
3. 点击 **Load unpacked**。
4. 选择仓库中的 \`extension/\` 目录。

注册 Native Host：

\`\`\`bash
./scripts/install-host.sh giegomfhcmgebjhdiihnjohoinkbcjbh ./dist/rtsp-web-native-darwin-arm64
\`\`\`

Windows：

\`\`\`powershell
./scripts/install-host.ps1 \`
  -ExtensionId giegomfhcmgebjhdiihnjohoinkbcjbh \`
  -BinaryPath .\\dist\\rtsp-web-native-windows-amd64.exe
\`\`\`

## 授权页面来源

打开扩展 popup，添加业务页面 origin：

\`\`\`txt
http://localhost:5173
https://your-app.example.com
\`\`\`

不要只写域名，必须包含协议和端口。

## 页面使用

\`\`\`html
<rtsp-player
  url="rtsp://user:pass@camera/stream"
  width="960"
  height="540"
  autoplay
  controls>
</rtsp-player>
\`\`\`

## 日志与诊断

客户无法播放时，先打开扩展 popup：

1. 点击 **刷新日志**。
2. 点击 **复制日志**。
3. 把日志发给支持人员。

日志会包含扩展事件、Native Runtime 状态、Gateway PID/端口、RTSP 握手、WebRTC 回退、WebSocket 状态、解码错误和自动恢复记录，并自动遮蔽用户名、密码、token 和 secret。

## 生产建议

- 将 \`extension/manifest.json\` 的 \`content_scripts.matches\` 改成业务域名。
- 企业环境建议通过 Chrome Enterprise policy 分发扩展。
- Native Messaging manifest 只允许固定扩展 ID。
- 业务页面只授权可信 origin。
`,ut=`# 部署发布

## 私有源码仓库

源码仓库位于：

\`\`\`txt
flyfish-dev/rtsp-source
\`\`\`

源码仓库保持私有，用于持续开发、构建和验证。

## 公开产物仓库

公开仓库位于：

\`\`\`txt
flyfish-dev/rtsp
\`\`\`

公开仓库只放完整构建产物、安装包、文档站静态文件和 README。每次公开更新都必须创建 GitHub Release。

推荐命令：

\`\`\`bash
npm run release:public
\`\`\`

脚本会：

1. 重新生成公开工作区。
2. 推送构建产物到 \`flyfish-dev/rtsp\`。
3. 创建时间戳 tag。
4. 上传 macOS / Windows / Linux 安装包。

## Vercel 文档站

站点目录：

\`\`\`txt
site/
\`\`\`

本地构建：

\`\`\`bash
npm run build:site
\`\`\`

生产部署使用 Vercel Build Output API，避免旧项目配置干扰：

\`\`\`bash
npm run build:site
rm -rf /tmp/rtsp-vercel-prebuilt
mkdir -p /tmp/rtsp-vercel-prebuilt/.vercel/output/static
rsync -a site/dist/ /tmp/rtsp-vercel-prebuilt/.vercel/output/static/
printf '{"version":3}\\n' > /tmp/rtsp-vercel-prebuilt/.vercel/output/config.json
vercel deploy /tmp/rtsp-vercel-prebuilt --prebuilt --prod --yes --project rtsp
\`\`\`

正式域名：

\`\`\`txt
https://rtsp.flyfish.dev
\`\`\`

兼容旧 Demo 域名：

\`\`\`txt
https://rtsp-roan.vercel.app
\`\`\`

不要把 \`doc.flyfish.dev\` 绑定到本项目。

## 发布前检查

\`\`\`bash
npm run check
\`\`\`

\`\`\`bash
for target in darwin/arm64 darwin/amd64 linux/amd64 linux/arm64 windows/amd64; do
  GOOS="\${target%/*}" GOARCH="\${target#*/}" CGO_ENABLED=0 ./scripts/build.sh
done
\`\`\`

\`\`\`bash
npm run build:desktop
npm run build:installers
npm run build:site
\`\`\`

## 线上校验

\`\`\`bash
curl -I https://rtsp.flyfish.dev/
curl -I https://rtsp.flyfish.dev/downloads/rtsp-macos-installer.dmg
gh release view <tag> -R flyfish-dev/rtsp
\`\`\`
`,tt=`# Electron / Tauri 免插件桌面方案

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

默认使用 \`transport="auto"\`，播放器会优先尝试 WebRTC。WebRTC 协商失败、9 秒内没有可渲染视频帧、或系统 WebView 不支持当前 codec 时，自动回退到 \`ws-annexb\` + WebCodecs。

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
`,rt=`# Chrome Extension Runtime

The Chrome extension path is recommended for browser pages, intranet dashboards, NVR consoles, and SaaS products.

## Features

- Chrome MV3 extension.
- Content script that mounts \`<rtsp-player>\`.
- Extension-owned iframe player.
- Service worker using Native Messaging for control.
- Popup for allowed origins, logs, diagnostics, and Gateway restart.
- WebRTC first with WebSocket/WebCodecs fallback.

## Recommended Installation

Use the graphical installer from the online assistant:

\`\`\`txt
https://rtsp.flyfish.dev/#demo
\`\`\`

Fixed extension ID:

\`\`\`txt
giegomfhcmgebjhdiihnjohoinkbcjbh
\`\`\`

## Development Setup

Build the native runtime:

\`\`\`bash
./scripts/build.sh
\`\`\`

Load the extension:

1. Open \`chrome://extensions\`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the repository \`extension/\` directory.

Register the native host:

\`\`\`bash
./scripts/install-host.sh giegomfhcmgebjhdiihnjohoinkbcjbh ./dist/rtsp-web-native-darwin-arm64
\`\`\`

Windows:

\`\`\`powershell
./scripts/install-host.ps1 \`
  -ExtensionId giegomfhcmgebjhdiihnjohoinkbcjbh \`
  -BinaryPath .\\dist\\rtsp-web-native-windows-amd64.exe
\`\`\`

## Authorize Origins

Open the extension popup and add the exact page origin:

\`\`\`txt
http://localhost:5173
https://your-app.example.com
\`\`\`

## Page Usage

\`\`\`html
<rtsp-player
  url="rtsp://user:pass@camera/stream"
  width="960"
  height="540"
  autoplay
  controls>
</rtsp-player>
\`\`\`

## Diagnostics

For customer playback failures, open the extension popup, refresh logs, then copy the log bundle. Credentials, tokens, and secrets are redacted automatically.
`,ot=`# Deployment

## Private Source Repository

\`\`\`txt
flyfish-dev/rtsp-source
\`\`\`

The source repository stays private for development, builds, and validation.

## Public Artifact Repository

\`\`\`txt
flyfish-dev/rtsp
\`\`\`

The public repository contains built artifacts, installers, static docs, and README only. Every update must create a GitHub Release.

\`\`\`bash
npm run release:public
\`\`\`

## Vercel Site

Build:

\`\`\`bash
npm run build:site
\`\`\`

Deploy prebuilt output:

\`\`\`bash
rm -rf /tmp/rtsp-vercel-prebuilt
mkdir -p /tmp/rtsp-vercel-prebuilt/.vercel/output/static
rsync -a site/dist/ /tmp/rtsp-vercel-prebuilt/.vercel/output/static/
printf '{"version":3}\\n' > /tmp/rtsp-vercel-prebuilt/.vercel/output/config.json
vercel deploy /tmp/rtsp-vercel-prebuilt --prebuilt --prod --yes --project rtsp
\`\`\`

Official domain:

\`\`\`txt
https://rtsp.flyfish.dev
\`\`\`

Compatibility alias:

\`\`\`txt
https://rtsp-roan.vercel.app
\`\`\`

Do not bind \`doc.flyfish.dev\` to this project.
`,it=`# Electron / Tauri Desktop Native

The desktop path bundles the Go runtime as an application sidecar. The app starts the localhost Gateway and the renderer uses the same \`<rtsp-player>\` component without installing a Chrome extension.

## Pipeline

\`\`\`txt
Electron/Tauri UI
  -> window.rtspNative / Tauri invoke
  -> Go sidecar gateway
  -> RTSP over TCP interleaved
  -> WebRTC first
  -> WebSocket/WebCodecs fallback
\`\`\`

## Electron

\`\`\`bash
npm run build:sdk
./scripts/build.sh
cd apps/electron
npm install
npm run start
\`\`\`

The main process starts the Gateway and exposes IPC methods for \`startStream\`, \`stopStream\`, \`createWebRTCOffer\`, and health checks.

## Tauri

\`\`\`bash
npm run build:sdk
./scripts/build.sh
npm run build:desktop
cd apps/tauri
npm install
npm run dev
\`\`\`

Tauri v2 uses \`bundle.externalBin\` for the sidecar.

## Component Usage

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

H.265 depends on the platform codec stack. Keep an H.264 substream as the stable fallback.
`,at=`# Installers

Online install assistant:

\`\`\`txt
https://rtsp.flyfish.dev/#demo
\`\`\`

The assistant checks the Chrome extension, Native Runtime, and current page authorization, then recommends the correct graphical installer for the current operating system.

Fixed Chrome extension ID:

\`\`\`txt
giegomfhcmgebjhdiihnjohoinkbcjbh
\`\`\`

## Downloads

\`\`\`txt
https://rtsp.flyfish.dev/downloads/rtsp-macos-installer.dmg
https://rtsp.flyfish.dev/downloads/rtsp-macos-installer.zip
https://rtsp.flyfish.dev/downloads/rtsp-windows-installer.zip
https://rtsp.flyfish.dev/downloads/rtsp-linux-installer.tar.gz
\`\`\`

## Installation

### macOS

1. Open \`rtsp-macos-installer.dmg\`.
2. Run \`RTSP Installer.app\`.
3. In Chrome, open \`chrome://extensions\` and enable Developer mode.
4. Click Load unpacked and select the extension directory shown by the installer.
5. Return to the demo and recheck.

If macOS blocks the first launch, right-click the app and choose Open.

### Windows

1. Unzip \`rtsp-windows-installer.zip\`.
2. Run \`RTSP Installer.hta\`.
3. Enable Developer mode in Chrome extensions.
4. Load the prepared extension directory.
5. Return to the demo and recheck.

### Linux

1. Extract \`rtsp-linux-installer.tar.gz\`.
2. Run \`RTSP Installer.desktop\` or \`./install-gui.sh\`.
3. Enable Developer mode in Chrome extensions.
4. Load the prepared extension directory.
5. Return to the demo and recheck.

## What the Installer Does

- Copies the local RTSP Runtime.
- Prepares the Chrome extension directory.
- Registers the Native Messaging Host.
- Opens the Chrome extensions page.
- Shows or copies the extension directory path.
`,st=`# Multi-stream and Lifecycle

Multiple players are supported. Each \`<rtsp-player>\` instance owns its own \`streamId\`, media connection, decoder, and cleanup path.

\`\`\`txt
created -> connecting -> playing -> stopping -> stopped
                         -> error
\`\`\`

## Model

- Each playback request creates a unique \`streamId\`.
- Chrome extension players use separate iframe, WebRTC/WebSocket, decoder, canvas, and RTSP client.
- Electron/Tauri desktop players use the same Gateway API and independent stream IDs.
- Gateway diagnostics track pending and active streams separately.

## Cleanup

- \`startStream\` creates a pending session with a one-time token.
- WebSocket claims the session when the media socket connects.
- WebRTC claims it during offer creation.
- \`stopStream\` cancels the RTSP pull, closes media transport, and removes Gateway state.
- Disconnection, failed WebRTC negotiation, and WebSocket close all remove active records.

## Auto Recovery

- WebCodecs decode errors first rebuild the decoder and wait for the next key frame.
- Repeated decode errors restart the full stream.
- WebSocket close, Gateway errors, and video stalls trigger stream restart.
- WebRTC failure, ended tracks, or video stalls switch to the stable WebSocket fallback.

Recovery uses exponential backoff and emits \`recovering\` / \`recovered\` events.

## Validation

The current build has been validated with 4 simultaneous local H.264 RTSP streams. After stopping all streams, diagnostics returned \`pendingStreams = 0\` and \`activeStreams = 0\`.
`,ct=`# Online Demo

Demo URL:

\`\`\`txt
https://rtsp.flyfish.dev/#demo
\`\`\`

## Two Modes

The left preview is a simulated low-latency canvas view. It does not require a camera or local runtime.

The real RTSP lab mounts the extension player iframe. It requires:

1. Chrome Runtime extension.
2. Native Runtime registration.
3. Current site origin authorized in the extension popup.

Allowed production origins:

\`\`\`txt
https://rtsp.flyfish.dev
https://rtsp-roan.vercel.app
\`\`\`

## Public Test Stream

\`\`\`txt
rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1
\`\`\`

Public streams may be rate-limited or temporarily unavailable. Production validation should use your own camera or NVR, preferably with an H.264 substream.

## If the Page Keeps Waiting

- The extension is not loaded or disabled.
- The extension ID is not the fixed ID.
- The current site origin is not allowed.
- Native Messaging Host registration failed.
- An older installer is still installed.
`,lt=`# Overview

RTSP is a local playback runtime for browser pages and desktop apps. It pulls camera or NVR RTSP streams through a local Go Gateway and renders them with WebRTC first, then WebSocket + WebCodecs fallback.

## Integration Paths

1. **Chrome Runtime Extension**: recommended for normal browser pages. The extension owns page authorization, iframe playback, Native Messaging, and Gateway startup.
2. **Universal Components SDK**: Web Component, React, Vue, and script-tag APIs for application teams.
3. **Electron / Tauri Desktop**: bundles the Go sidecar and plays without installing a Chrome extension.

## Pipeline

\`\`\`txt
Web page / desktop WebView
  -> RTSP component
  -> Chrome extension or desktop IPC
  -> Go Gateway on 127.0.0.1
  -> RTSP over TCP interleaved
  -> WebRTC RTP passthrough first
  -> WebSocket Annex-B + WebCodecs fallback
  -> Canvas / Video render
\`\`\`

## Why a Local Gateway Is Required

Browsers cannot open \`rtsp://\` URLs or arbitrary RTSP TCP sockets. The local Gateway handles RTSP, RTP, authentication, and H.264/H.265 payloads, then exposes browser-safe media paths on localhost.

## RTSP Stability Strategy

The protocol layer follows field-proven patterns used by mature RTSP clients such as go2rtc: RTSP over TCP interleaved by default, server-returned \`interleaved\` channel parsing, \`Content-Base\` / \`Content-Location\` control URL correction, \`Session timeout\` driven \`OPTIONS\` keepalive, and replies to in-stream server \`OPTIONS\` / \`GET_PARAMETER\` / \`SET_PARAMETER\` requests.

The latency policy is minimal buffering with fast recovery. WebRTC forwards RTP first and normalizes abnormal SPS/PPS/AUD markers; the WebSocket fallback sends Annex-B access units only. H.264 startup detects IDR, non-IDR I/SI slices, intra AUDs, refresh frames after split SPS/PPS packets, and the first VCL candidate when SDP parameter sets are already known. Decoder errors rebuild the decoder first, then restart the stream if failures repeat.

## Support Matrix

| Area | Status |
| --- | --- |
| Video codec | H.264 stable, H.265 capability-gated |
| RTSP transport | TCP interleaved |
| RTSP auth | Basic and Digest |
| Browser decode | WebRTC first, WebCodecs fallback |
| Hardware decode | Platform WebRTC / \`prefer-hardware\` |
| Audio | Not included |
| UDP RTP | Not included |
| FFmpeg | Not used |

![Public RTSP validation](../assets/public-rtsp-e2e.png)
`,dt='# SDK API\n\n## `configureRTSP(options)`\n\nSets global defaults.\n\n```js\nconfigureRTSP({\n  extensionId: "YOUR_CHROME_EXTENSION_ID",\n  tagName: "rtsp-player",\n  runtime: "extension",\n});\n```\n\n| Option | Type | Description |\n| --- | --- | --- |\n| `extensionId` | `string` | Chrome extension ID |\n| `tagName` | `string` | Custom element name |\n| `runtime` | `extension` / `desktop` / `auto` | Runtime bridge |\n\n## `defineRTSPPlayer(tagName?, options?)`\n\nRegisters the Web Component. It is safe to call multiple times.\n\n## `createRTSPPlayer(options)`\n\n```js\nconst player = createRTSPPlayer({\n  extensionId: "YOUR_CHROME_EXTENSION_ID",\n  url: "rtsp://camera/stream",\n  autoplay: true,\n  controls: true,\n  transport: "auto",\n  codec: "auto",\n});\n```\n\n## Attributes\n\n| Attribute | Description |\n| --- | --- |\n| `url` / `src` | RTSP URL |\n| `runtime` | `extension`, `desktop`, or `auto` |\n| `transport` | `auto`, `webrtc`, `ws-annexb`, or legacy `tcp` |\n| `rtsp-transport` | RTSP transport, currently `tcp` |\n| `codec` | `auto`, `h264`, or `h265` |\n| `extension-id` | Per-element extension ID |\n\n## Methods\n\n```js\nplayer.play("rtsp://camera/stream");\nplayer.stop();\n```\n\nRecoverable failures emit `recovering`; successful recovery emits `recovered`; final failure emits `error`.\n',ft=`# Security Model

RTSP keeps the trust boundary small and local.

## Local Gateway

- Binds only to \`127.0.0.1\`.
- Uses a random per-Gateway secret for control APIs.
- Uses one-time stream tokens for playback sessions.
- Validates WebSocket token and origin.
- Cleans pending and active state on stop.

## Native Messaging

The native host handles one length-prefixed JSON request and exits. The long-running process is the local Gateway daemon. Video frames do not travel through Native Messaging.

## RTSP URL Handling

- RTSP URLs are not placed in iframe query strings.
- Logs redact credentials.
- Authorized pages send URLs to the extension iframe by \`postMessage\`.
- The extension passes control messages through Chrome APIs.

## Production Advice

- Restrict \`content_scripts.matches\` to business domains.
- Avoid wildcard allowed origins.
- Keep the extension ID stable.
- Register Native Messaging manifests only for trusted extension IDs.
`,pt=`# Troubleshooting

## Native Runtime Missing

Check the Native Messaging manifest.

macOS:

\`\`\`txt
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.rtspweb.player.json
\`\`\`

Linux:

\`\`\`txt
~/.config/google-chrome/NativeMessagingHosts/com.rtspweb.player.json
\`\`\`

The manifest must allow the fixed extension ID:

\`\`\`txt
chrome-extension://giegomfhcmgebjhdiihnjohoinkbcjbh/
\`\`\`

## VLC Works but Browser Does Not

Open the extension popup:

1. Click Refresh logs.
2. Click Copy logs.
3. Send the copied bundle to support.

Logs include extension events, Native Runtime health, Gateway PID/port, RTSP handshake, selected track, WebRTC negotiation, WebSocket fallback, decoder recovery, and auto-restart attempts. Credentials and tokens are redacted.

Common log meanings:

- \`PLAY: not RTSP response: "$..."\`: some cameras send an RTCP interleaved packet before the PLAY response. \`0.1.6\` skips those packets and continues reading the real RTSP response.
- \`FU-A continuation without start\`: playback joined the live H.264 stream in the middle of a fragmented frame. This is normal for live streams. The player waits for the next IDR keyframe instead of restarting too early.
- \`first access unit ... key=false bytes=...\` while VLC plays: some cameras encode startup pictures as non-IDR I-slices or split SPS/PPS into standalone RTP marker packets. \`0.1.9\` treats I/SI slices, intra AUDs, VCL after split SPS/PPS, and the first VCL with known SDP parameter sets as key/startup frame candidates.
- \`DESCRIBE/SETUP/PLAY status 401\`: the camera rejected RTSP authentication. Verify username, password, and live-view permissions. \`0.1.9\` adds Digest URI compatibility retries; if it still fails, try removing URL parameters such as \`?transportmode=...&profile=...\`.
- \`Waiting for the first camera key/startup frame\`: RTSP is connected and the browser is waiting for the first decodable frame. Set camera GOP to 1-2 seconds for faster first paint.

## Stale Gateway After Upgrade

Click Restart Native in the extension popup. The current Native Host will clear stale state, stop identifiable old Gateway processes, and start the installed runtime version.

## Origin Not Allowed

Add the exact page origin in the extension popup:

\`\`\`txt
http://localhost:5173
https://your-app.example.com
\`\`\`

Production demo origins:

\`\`\`txt
https://rtsp.flyfish.dev
https://rtsp-roan.vercel.app
\`\`\`

## Black Screen or Decode Error

Recoverable errors are handled automatically. The player first rebuilds the WebCodecs decoder; repeated failures clean the current \`streamId\` and restart the stream.

Useful log keywords:

\`\`\`txt
RTSP_PLAYER_RECOVERING
decoder-error-loop
video-stall
websocket-closed
gateway-error
\`\`\`

If recovery keeps failing, use an H.264 substream, set GOP to 1-2 seconds, and reduce bitrate.
`,ht=`# Universal Components

The SDK provides Web Component, React, Vue, and script-tag APIs.

Important boundary: **a normal browser page cannot play RTSP without installing a runtime**. Browsers cannot open RTSP sockets or start local executables. Without the Chrome extension, use Electron/Tauri or another trusted host that exposes a Gateway bridge.

## Plain HTML

\`\`\`html
<script
  src="/rtsp-player-sdk.js"
  data-extension-id="YOUR_CHROME_EXTENSION_ID"><\/script>

<rtsp-player
  url="rtsp://user:pass@camera/stream"
  transport="auto"
  codec="auto"
  autoplay
  controls>
</rtsp-player>
\`\`\`

## JavaScript

\`\`\`js
import { configureRTSP, createRTSPPlayer, defineRTSPPlayer } from "@rtsp/player";

configureRTSP({ extensionId: "YOUR_CHROME_EXTENSION_ID" });
defineRTSPPlayer();

const player = createRTSPPlayer({
  url: "rtsp://camera/stream",
  autoplay: true,
  controls: true,
  transport: "auto",
  codec: "auto",
});

player.addEventListener("ready", () => console.log("ready"));
player.addEventListener("recovering", (event) => console.log(event.detail));
player.addEventListener("recovered", () => console.log("recovered"));
player.addEventListener("error", (event) => console.error(event.detail.error));
\`\`\`

## React

\`\`\`jsx
import { RtspPlayer } from "@rtsp/player/react";

<RtspPlayer
  extensionId="YOUR_CHROME_EXTENSION_ID"
  url="rtsp://camera/stream"
  transport="auto"
  codec="auto"
  autoplay
  controls
/>;
\`\`\`

## Vue

\`\`\`vue
<RtspPlayer
  extension-id="YOUR_CHROME_EXTENSION_ID"
  url="rtsp://camera/stream"
  transport="auto"
  codec="auto"
  autoplay
  controls
/>
\`\`\`

## Extension-free Usage

Use desktop mode:

\`\`\`html
<rtsp-player runtime="desktop" url="rtsp://camera/stream" autoplay controls></rtsp-player>
\`\`\`

The host must expose \`window.rtspNative\` or \`window.__RTSP_DESKTOP__\` with \`startStream\`, \`stopStream\`, and optionally \`createWebRTCOffer\`.

See [Gateway for Web Components](web-component-gateway.md).
`,bt=`# Validation

## Checks

\`\`\`bash
npm run check
\`\`\`

Includes SDK build, JS syntax checks, Go tests, and site build.

\`\`\`bash
cd native
go test ./...
\`\`\`

\`\`\`bash
npm run build:installers
cd apps/tauri/src-tauri && cargo check
\`\`\`

## Native Messaging

The native host reads one message, responds, and exits. The Gateway daemon stays alive and writes its state file.

Expected ping:

\`\`\`json
{
  "ok": true,
  "type": "ping",
  "port": 53745,
  "version": "0.1.9"
}
\`\`\`

## Public RTSP E2E

\`\`\`txt
rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1
\`\`\`

Public streams may be rate-limited or unavailable. Production validation should use your own camera/NVR.

## Local Multi-stream Validation

Validated local source:

\`\`\`txt
rtsp://127.0.0.1:8554/local
\`\`\`

\`0.1.9\` compatibility regression also used a MediaMTX + FFmpeg H.264 TCP interleaved source:

\`\`\`txt
rtsp://127.0.0.1:18554/codex-test
\`\`\`

Result:

\`\`\`txt
DESCRIBE/SETUP/PLAY passed
received codec config: avc1.42C01E
first access unit key=true
received continuous H.264 Annex-B binary frames
\`\`\`

Result:

\`\`\`txt
4 simultaneous startStream calls
each stream received H.264 Annex-B binary frames
activeStreams = 4
after stopStream: pendingStreams = 0, activeStreams = 0
\`\`\`
`,mt=`# Gateway for Web Components Without Chrome Extension

This guide is for customers who want to integrate the Web Component without installing the Chrome extension.

Clear rule:

- A normal browser page cannot play RTSP by Web Component alone.
- If the Chrome extension is not installed, a trusted host application must install and start the local Gateway.
- The recommended extension-free path is Electron or Tauri.

## Why Pure Web Is Not Enough

Browser sandboxing prevents a page from:

- Opening \`rtsp://\` directly.
- Creating arbitrary RTSP TCP sockets.
- Starting local executables.
- Reading a local Gateway secret safely.

## Customer Installation Paths

### Path A: Desktop App

Use this when customers should install one app and play directly.

1. Bundle \`rtsp-web-native\` as an Electron/Tauri sidecar.
2. Start the Go Gateway from the main process.
3. Expose a safe bridge as \`window.rtspNative\` or \`window.__RTSP_DESKTOP__\`.
4. Use \`<rtsp-player runtime="desktop">\`.

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

### Path B: Browser Page + Chrome Runtime

Use this when customers must open a business page in Chrome.

1. Run the graphical installer.
2. Install the Native Runtime.
3. Load the fixed-ID Chrome extension.
4. Allow the business origin in the extension popup.
5. Use the Web Component, React component, or Vue component.

## Required Bridge API

\`\`\`ts
window.rtspNative = {
  startStream(input): Promise<{
    ok: boolean;
    streamId: string;
    streamToken?: string;
    wsUrl?: string;
    webRTCUrl?: string;
    codec?: string;
    error?: string;
  }>,
  stopStream(input): Promise<{ ok: boolean; stopped?: boolean }>,
  createWebRTCOffer?(input): Promise<{
    ok: boolean;
    streamId?: string;
    answer?: string;
    codec?: string;
    fallback?: string;
    error?: string;
  }>
};
\`\`\`

\`startStream\` and \`stopStream\` are enough for WebSocket + WebCodecs. Add \`createWebRTCOffer\` for WebRTC/H.265-first playback.

## Recommended Customer Message

> Browsers do not support RTSP directly and cannot start local programs. RTSP Gateway is the local video runtime that connects to the camera and exposes browser-safe WebRTC/WebSocket playback. If you do not install the Chrome extension, use the desktop installer; the desktop app includes and starts the Gateway automatically.
`,gt=`# WebRTC / H.265

WebRTC is the default preferred media path. It allows Chromium or the system WebView to use the platform media pipeline and hardware decoding.

## Strategy

\`\`\`txt
transport="auto"
  1. Probe RTCPeerConnection and receiver video capabilities
  2. Create a recvonly video offer
  3. Go Gateway creates an answer through Pion
  4. RTSP RTP packets are written into WebRTC TrackLocalStaticRTP
  5. If negotiation or the first rendered frame fails within 9 seconds, fallback to ws-annexb
\`\`\`

\`codec="auto"\` prefers the most stable path. H.265 can be requested with \`codec="h265"\`, but it only works when the browser, OS, and hardware expose HEVC capability.

For H.264, the Gateway caches live SPS/PPS and normalizes abnormal SPS/PPS/AUD RTP markers so browsers do not treat parameter sets as complete video frames.

## Fallback

\`\`\`txt
RTSP RTP/H.264 or H.265
  -> depay + Annex-B access unit
  -> Gateway WebSocket
  -> WebCodecs VideoDecoder prefer-hardware
  -> Canvas
\`\`\`

H.264 WebCodecs is the safest fallback. H.265 WebCodecs is also platform-dependent.
`,xt=`# Xiaomi / Mi Camera RTSP Bridge

Most Xiaomi / Mi cameras do not expose standard RTSP directly. Use [miiot/micam](https://github.com/miiot/micam) to bridge the camera stream to local RTSP through Docker Compose, Miloco, go2rtc, and micam.

Recommended path:

\`\`\`txt
Xiaomi camera
  -> Xiaomi account / Miloco
  -> miiot/micam
  -> go2rtc RTSP
  -> rtsp://bridge-host:8554/stream_name
  -> RTSP Player
\`\`\`

## Requirements

- Always-on host such as NAS, Linux box, Home Assistant, or server.
- Docker and Docker Compose.
- Same LAN as the camera.
- Xiaomi account with the target camera bound.

## Deploy micam

\`\`\`bash
mkdir -p /opt/micam
cd /opt/micam
wget https://raw.githubusercontent.com/miiot/micam/refs/heads/main/docker-compose.yml
docker compose up -d
\`\`\`

## Configure

1. Open Miloco at \`https://bridge-host:8000\`.
2. Bind the Xiaomi account.
3. Find the target camera DID.
4. Open go2rtc config at \`http://bridge-host:1984/config.html\`.
5. Add a stream name such as \`mi_camera_1\`.
6. Configure micam to push that camera into the go2rtc stream.

RTSP URL:

\`\`\`txt
rtsp://bridge-host:8554/mi_camera_1
\`\`\`

Use H.264 first for broad browser compatibility.
`,_t=`# 一键安装器

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
`,yt=`# 多路播放与生命周期

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

## 自动恢复

播放中途出现可恢复错误时，播放器会先保留低延迟路径并尝试局部恢复：

- WebCodecs 解码错误：先关闭并重建 \`VideoDecoder\`，丢弃旧 delta frame，等待下一帧 key frame 继续播放。
- 解码错误短时间内连续出现：停止当前 \`streamId\`，清理 native gateway 状态，然后整路重启。
- WebSocket 异常关闭、gateway 上报 RTSP 中断、长时间无渲染帧：触发整路重启。
- WebRTC 连接失败、track 结束或长时间无渲染帧：自动切到更稳的 WebSocket + WebCodecs 回退路径。

整路重启使用指数退避，默认最多尝试 6 次。恢复过程中会发出 \`recovering\` / \`recovered\` 事件；超过最大次数后才发出最终 \`error\`。

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
`,kt=`# 在线 Demo

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
`,Ct=`# 项目总览

RTSP 是一套面向浏览器与桌面应用的本地 RTSP 播放运行时。它把摄像头或 NVR 的 RTSP 流拉到本机 Gateway，再交给浏览器使用 WebRTC 或 WebCodecs 硬件优先解码。

## 交付路径

1. **Chrome 扩展 Runtime**：适合普通网页和业务后台。扩展负责页面授权、iframe 播放器、Native Messaging 和 Gateway 启动。
2. **通用组件 SDK**：适合前端团队显式接入 Web Component、React 或 Vue。浏览器网页仍需要安装 Runtime；桌面应用可切到 \`runtime="desktop"\`。
3. **Electron / Tauri 免扩展**：适合桌面监控台。应用内打包 Go sidecar，不需要用户安装 Chrome 扩展。

## 核心链路

\`\`\`txt
业务页面 / 桌面 WebView
  -> RTSP 组件
  -> Chrome 扩展或桌面 IPC
  -> Go Gateway 127.0.0.1
  -> RTSP over TCP interleaved
  -> WebRTC RTP passthrough first
  -> WebSocket Annex-B + WebCodecs fallback
  -> Canvas / Video render
\`\`\`

## 为什么需要本地 Gateway

浏览器不能直接打开 \`rtsp://\`，也不能随意创建 RTSP TCP 连接。RTSP 使用本地 Gateway 处理 RTSP、RTP、鉴权和 H.264/H.265 payload，再把浏览器能消费的视频路径暴露到本机。

默认优先 WebRTC，让 Chromium 或系统 WebView 走平台媒体管线；WebRTC 协商失败或短时间没有视频帧时，自动回退到本机 WebSocket + WebCodecs。

## RTSP 稳定性策略

协议层按 go2rtc 等成熟 RTSP 客户端的现场经验处理：默认使用 RTSP over TCP interleaved，读取服务端实际返回的 \`interleaved\` 通道号，支持 \`Content-Base\` / \`Content-Location\` 修正控制 URL，按 \`Session timeout\` 发送 \`OPTIONS\` keepalive，并能响应播放中的服务端 \`OPTIONS\` / \`GET_PARAMETER\` / \`SET_PARAMETER\` 请求。

低延迟策略是“少缓存、快起播、可恢复”：WebRTC 直转 RTP 优先，并修正异常 SPS/PPS/AUD marker；WebSocket 回退只传 Annex-B access unit。H.264 起播会识别 IDR、non-IDR I/SI slice、AUD intra、拆包 SPS/PPS 后的刷新帧，以及带 SDP 参数集的首个 VCL 候选帧；解码异常时先重建解码器，连续失败再自动重拉流。

## 支持矩阵

| 能力 | 状态 |
| --- | --- |
| 视频编码 | H.264 稳定支持，H.265 按平台能力启用 |
| RTSP 传输 | TCP interleaved |
| RTSP 鉴权 | Basic / Digest |
| 浏览器解码 | WebRTC 优先，WebCodecs 回退 |
| 硬解 | \`prefer-hardware\` / 平台 WebRTC |
| 音频 | 暂不支持 |
| UDP RTP | 暂不支持 |
| FFmpeg | 不使用 |
| Node 网关 | 不使用 |

## 验证

项目已完成公开 H.264 RTSP 源、WebSocket/WebCodecs 回退、本机 4 路并发、生命周期清理、安装包和线上站点验证。

\`\`\`txt
rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1
\`\`\`

![公开 RTSP 验证](assets/public-rtsp-e2e.png)
`,wt='# SDK API\n\n## `configureRTSP(options)`\n\n设置 SDK 全局默认值。\n\n```js\nconfigureRTSP({\n  extensionId: "YOUR_CHROME_EXTENSION_ID",\n  tagName: "rtsp-player",\n  runtime: "extension",\n});\n```\n\n| 参数 | 类型 | 说明 |\n| --- | --- | --- |\n| `extensionId` | `string` | 暴露 `player/player.html` 的 Chrome 扩展 ID |\n| `tagName` | `string` | 自定义元素标签名，默认 `rtsp-player` |\n| `runtime` | `extension` / `desktop` / `auto` | 运行时。桌面模式需要 `window.rtspNative` 或 `window.__RTSP_DESKTOP__` |\n\n## `defineRTSPPlayer(tagName?, options?)`\n\n注册 Web Component。可以重复调用；如果标签已注册，会返回已有构造器。\n\n```js\ndefineRTSPPlayer();\n```\n\n## `createRTSPPlayer(options)`\n\n创建并配置播放器元素。\n\n```js\nconst player = createRTSPPlayer({\n  extensionId: "YOUR_CHROME_EXTENSION_ID",\n  url: "rtsp://camera/stream",\n  width: 960,\n  height: 540,\n  autoplay: true,\n  controls: true,\n  transport: "auto",\n  codec: "auto",\n});\n```\n\n## `updateRTSPPlayer(element, options)`\n\n更新已有播放器属性。\n\n```js\nupdateRTSPPlayer(player, {\n  url: "rtsp://camera/stream2",\n  autoplay: true,\n});\n```\n\n## 元素属性\n\n| 属性 | 说明 |\n| --- | --- |\n| `url` | RTSP 地址 |\n| `src` | `url` 的别名 |\n| `width` | CSS 宽度或数字 px |\n| `height` | CSS 高度或数字 px |\n| `autoplay` | 初始化后自动播放 |\n| `controls` | 保留播放器控制能力 |\n| `muted` | 预留给未来音频 |\n| `runtime` | `extension`、`desktop` 或 `auto` |\n| `transport` | 媒体传输，默认 `auto`，表示 WebRTC 优先、WebSocket 回退 |\n| `media-transport` | 显式媒体传输：`auto`、`webrtc`、`ws-annexb` |\n| `rtsp-transport` | RTSP 传输；当前原生实现支持 `tcp` |\n| `codec` | `auto`、`h264` 或 `h265` |\n| `extension-id` | 单个元素覆盖扩展 ID |\n\n## `probeRTSPCapabilities(codec?)`\n\n探测当前运行时的视频能力。\n\n```js\nconst caps = await probeRTSPCapabilities("h265");\nconsole.log(caps.h265WebRTC, caps.h265WebCodecs);\n```\n\n## 元素方法\n\n```js\nplayer.play("rtsp://camera/stream");\nplayer.stop();\n```\n\n`stop()` 会关闭当前媒体路径，并通知本地 Gateway 停止对应 `streamId`。播放中发生可恢复错误时，组件会发出 `recovering`，恢复成功后发出 `recovered`；超过重试预算才发出最终 `error`。\n\n## 全局脚本 API\n\n使用 `rtsp-player.global.js` 时，SDK 会暴露 `window.RTSP`：\n\n```js\nwindow.RTSP.configure({ extensionId: "YOUR_CHROME_EXTENSION_ID" });\nwindow.RTSP.definePlayer();\n\nconst player = window.RTSP.createPlayer({\n  url: "rtsp://camera/stream",\n  autoplay: true,\n});\n```\n',St=`# 安全模型

RTSP 尽量把信任边界收窄在本机和已授权页面之间。

## 本地 Gateway

- 只监听 \`127.0.0.1\`。
- HTTP 控制 API 使用每次启动随机生成的 gateway secret。
- 每路播放使用一次性 \`streamToken\`。
- WebSocket 会校验来源和 token。
- 停止播放时会清理 pending / active 状态。

## Native Messaging

Chrome 通过 Native Messaging 启动 native host，并传入一条带长度前缀的 JSON 消息。native host 处理一次请求后退出；真正常驻的是本地 Gateway daemon。

这样可以避免 \`sendNativeMessage\` 因 stdio 长时间打开而挂起，也能让视频帧避开 JSON 通道的性能限制。

## RTSP URL 处理

- RTSP URL 不放进 iframe query string。
- Gateway 日志会遮蔽用户名和密码。
- 页面通过 \`postMessage\` 把 RTSP URL 发给扩展 iframe。
- 扩展再通过 Chrome API 将控制请求交给 Native Runtime。

## 页面授权

扩展 popup 保存允许访问的网页 origin。未授权页面无法初始化 iframe 播放器。

生产环境建议：

1. 将 \`content_scripts.matches\` 限定为业务域名。
2. 避免使用 \`*\` 作为 allowed origin。
3. 固定扩展 ID，或通过 Chrome Web Store / 企业策略分发。
4. Native Messaging manifest 只允许可信扩展 ID。

## 网络范围

Gateway 不暴露局域网或公网端口，只在本机监听。它只会向授权页面提供的摄像头或 NVR 地址发起出站 RTSP 连接。
`,vt=`# 排障指南

## Popup 显示 Native Runtime 未检测到

检查 Native Messaging manifest 路径。

macOS：

\`\`\`txt
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.rtspweb.player.json
\`\`\`

Linux：

\`\`\`txt
~/.config/google-chrome/NativeMessagingHosts/com.rtspweb.player.json
\`\`\`

manifest 里的 \`allowed_origins\` 必须包含固定扩展 ID：

\`\`\`json
{
  "allowed_origins": [
    "chrome-extension://giegomfhcmgebjhdiihnjohoinkbcjbh/"
  ]
}
\`\`\`

macOS 推荐使用当前图形安装器，或通过 \`scripts/install-host.sh\` 安装。脚本会把二进制复制到 \`~/Library/Application Support/rtsp-web-player/\`。

## VLC 能播放，浏览器不能播放

先收集日志：

1. 打开 RTSP Web Player 扩展 popup。
2. 点击 **刷新日志**。
3. 点击 **复制日志**，发送给支持人员。

日志包含扩展事件、Native Runtime 健康状态、Gateway PID/端口、RTSP 握手、选中的 H.264/H.265 track、WebRTC 协商、WebSocket 回退、解码恢复和自动重启记录。用户名、密码、token 和 secret 会自动遮蔽。

常见日志解释：

- \`PLAY: not RTSP response: "$..."\`：部分摄像头会在 PLAY 响应前先发送 RTCP interleaved 包。\`0.1.6\` 已兼容跳过这些包并继续读取真正的 RTSP 响应。
- \`FU-A continuation without start\`：播放器从 H.264 分片帧中段接入，属于实时流常见现象。播放器会等待下一个 IDR 关键帧，不再在首帧前过早重启。
- \`first access unit ... key=false bytes=...\` 但 VLC 能播放：部分摄像头会把可起播帧编码为 non-IDR I-slice，或把 SPS/PPS 参数集拆成独立 RTP marker 包。\`0.1.9\` 会把 I/SI slice、AUD intra、拆包 SPS/PPS 后的 VCL、以及带 SDP 参数集的首个 VCL 都作为关键帧/起播帧候选处理。
- \`DESCRIBE/SETUP/PLAY status 401\`：摄像头拒绝 RTSP 鉴权。先确认 URL 中用户名密码正确，再检查账号是否有实时预览权限。\`0.1.9\` 已增加 Digest URI 兼容重试；如果仍是 401，优先尝试去掉 \`?transportmode=...&profile=...\` 这类 URL 参数。
- \`正在等待摄像头关键帧/起播帧\`：RTSP 链路已通，浏览器正在等可解码首帧。建议把摄像头 GOP 设置为 1-2 秒，首屏会明显更快。

## 升级后旧进程影响播放

打开扩展 popup，点击 **重启 Native**。当前 Native Host 会清理旧 Gateway 状态，停止可识别的旧 Gateway 进程，并启动已安装的新版本。

## macOS 提示无法验证 rtsp-web-native

使用当前 \`rtsp-macos-installer.dmg\`。如果首次启动被系统拦截，请右键 \`RTSP Installer.app\`，选择 **打开**，再确认打开。

## 页面提示 Origin not allowed

打开扩展 popup，添加页面 origin，必须包含协议和端口：

\`\`\`txt
http://localhost:5173
https://your-app.example.com
\`\`\`

在线 Demo 需要：

\`\`\`txt
https://rtsp.flyfish.dev
https://rtsp-roan.vercel.app
\`\`\`

如果安装助手显示已授权，但播放器仍提示未授权，请重新加载 unpacked 扩展，或重新运行当前安装器。

## 播放中途黑屏或解码报错

当前版本会自动恢复可恢复错误：先重建 WebCodecs 解码器，连续失败时清理当前 \`streamId\` 并重新拉流。

重点查看日志关键词：

\`\`\`txt
RTSP_PLAYER_RECOVERING
decoder-error-loop
video-stall
websocket-closed
gateway-error
\`\`\`

如果反复恢复失败，通常是源端问题：关键帧间隔过长、码流缺少 SPS/PPS、H.265 平台不可解、摄像头连接数满，或 RTSP over TCP 被网络中断。建议先切 H.264 子码流，GOP 设置为 1-2 秒，并限制码率。

## H.265 无画面

H.265 依赖平台能力。Chrome、Electron、Tauri 和系统 WebView 并不保证都能硬解 HEVC。生产建议默认 \`codec="auto"\`，无法播放时提示客户切换摄像头到 H.264 子码流。
`,Tt=`# 通用组件方案

通用组件适合前端团队显式接入，不依赖 content script 自动扫描。SDK 提供 Web Component、React、Vue 和免构建脚本。

重要边界：**普通浏览器网页不安装 Chrome 扩展时，不能直接播放 RTSP。** 浏览器无法直接打开 RTSP socket，也不能自行启动本地 Gateway。免扩展接入需要 Electron/Tauri 这类桌面容器，或由宿主页面提供 \`window.rtspNative\` / \`window.__RTSP_DESKTOP__\` Gateway bridge。

## Plain HTML

\`\`\`html
<script
  src="/rtsp-player-sdk.js"
  data-extension-id="YOUR_CHROME_EXTENSION_ID"><\/script>

<rtsp-player
  url="rtsp://user:pass@camera/stream"
  width="960"
  height="540"
  transport="auto"
  codec="auto"
  autoplay
  controls>
</rtsp-player>
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
  url: "rtsp://user:pass@camera/stream",
  width: "100%",
  height: 540,
  autoplay: true,
  controls: true,
  transport: "auto",
  codec: "auto",
});

player.addEventListener("ready", () => console.log("ready"));
player.addEventListener("recovering", (event) => console.log(event.detail));
player.addEventListener("recovered", () => console.log("recovered"));
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
      url="rtsp://user:pass@camera/stream"
      width="100%"
      height={540}
      autoplay
      controls
      transport="auto"
      codec="auto"
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
    url="rtsp://user:pass@camera/stream"
    width="100%"
    :height="540"
    autoplay
    controls
    transport="auto"
    codec="auto"
  />
</template>
\`\`\`

## 免扩展接入

如果客户明确不安装 Chrome 扩展，请使用桌面 Gateway 模式：

\`\`\`html
<rtsp-player
  runtime="desktop"
  transport="auto"
  codec="auto"
  url="rtsp://camera/stream"
  autoplay
  controls>
</rtsp-player>
\`\`\`

前提条件：

1. 已安装或打包 Go Gateway。
2. 页面宿主暴露 \`window.rtspNative\` 或 \`window.__RTSP_DESKTOP__\`。
3. bridge 至少实现 \`startStream\`、\`stopStream\`，WebRTC 模式还需要 \`createWebRTCOffer\`。

普通公网网页无法只靠 \`<script>\` 启动本地 Gateway。客户需要安装 Chrome Runtime，或者使用 Electron/Tauri 桌面应用。详细步骤见 [Web 组件免扩展 Gateway 指引](web-component-gateway.md)。

## 事件

| 事件 | 含义 |
| --- | --- |
| \`starting\` | 开始启动本地 runtime 或创建播放会话 |
| \`ready\` | WebRTC track 或 WebCodecs decoder 已就绪 |
| \`recovering\` | 播放发生可恢复错误，正在自动重启 |
| \`recovered\` | 自动恢复后重新渲染视频帧 |
| \`error\` | Native、RTSP、WebRTC、WebSocket 或解码最终失败 |

## 运行要求

浏览器网页：

1. 安装 Chrome Runtime 扩展。
2. 注册 Native Messaging Host。
3. 在扩展 popup 中授权页面 origin。

桌面应用：

1. Electron/Tauri 打包 Go sidecar。
2. 主进程启动 Gateway。
3. 渲染层暴露桌面 bridge。

RTSP 源建议支持 TCP interleaved。H.264 是最稳基线；H.265 依赖 WebRTC/WebCodecs 和系统 codec 能力。
`,Rt=`# 验证记录

## 基础检查

\`\`\`bash
npm run check
\`\`\`

覆盖：

- SDK 构建。
- JS 语法检查。
- Go 单元测试。
- 文档站构建。

Go 测试：

\`\`\`bash
cd native
go test ./...
\`\`\`

安装包构建：

\`\`\`bash
npm run build:installers
\`\`\`

Tauri 检查：

\`\`\`bash
cd apps/tauri/src-tauri
cargo check
\`\`\`

## Native Messaging Ping

native host 每次读取一条 Chrome Native Messaging 消息，返回后退出。Gateway daemon 独立常驻，并写入状态文件。

期望响应：

\`\`\`json
{
  "ok": true,
  "type": "ping",
  "port": 53745,
  "version": "0.1.9"
}
\`\`\`

## 公开 RTSP E2E

公开测试源：

\`\`\`txt
rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1
\`\`\`

完整路径：

\`\`\`txt
demo page -> content script -> extension iframe -> service worker
-> Chrome Native Messaging -> Go host -> Go gateway
-> RTSP over TCP -> WebRTC first
-> WebSocket/WebCodecs fallback -> Canvas
\`\`\`

公开源可能临时限流或返回 403，因此生产验收建议使用自己的摄像头或 NVR。

截图：

![公开 RTSP 验证](assets/public-rtsp-e2e.png)

## 本机回放源验证

本机循环 RTSP 源：

\`\`\`txt
rtsp://127.0.0.1:8554/local
\`\`\`

\`0.1.9\` 兼容性回归额外使用 MediaMTX + FFmpeg 生成 H.264 TCP interleaved 流：

\`\`\`txt
rtsp://127.0.0.1:18554/codex-test
\`\`\`

结果：

\`\`\`txt
DESCRIBE/SETUP/PLAY 通过
收到 codec config: avc1.42C01E
首个 access unit key=true
连续收到 H.264 Annex-B 二进制帧
\`\`\`

已验证：

\`\`\`txt
4 路同时 startStream
每路收到 H.264 Annex-B 二进制帧
diagnostics activeStreams = 4
逐路 stopStream
diagnostics pendingStreams = 0, activeStreams = 0
\`\`\`

## 安装包验证

- macOS DMG 可下载，Content-Type 为 \`application/x-apple-diskimage\`。
- Windows ZIP 和 Linux tar.gz 已复制到站点 \`/downloads/\`。
- 安装器会清理旧 Gateway 进程，复制最新 runtime，并写入固定扩展 ID。

## 已知边界

- 音频暂不支持。
- UDP RTP 暂不支持。
- H.265 依赖浏览器、系统和硬件能力。
- 普通网页免扩展时不能自行启动 Gateway，必须通过桌面 bridge。
`,Dt=`# Web 组件免扩展 Gateway 指引

这篇文档面向“不想让客户安装 Chrome 扩展，只想用 Web 组件接入”的场景。

结论先说清楚：

- **普通浏览器网页不能只靠 Web 组件直接播放 RTSP。**
- 如果不安装 Chrome 扩展，必须让宿主应用安装并启动本地 Gateway，并向页面暴露安全 bridge。
- 最推荐的免扩展方案是 Electron 或 Tauri 桌面应用。

## 为什么不能纯网页直连

浏览器有安全沙箱：

- 不能直接打开 \`rtsp://\`。
- 不能创建任意 RTSP TCP socket。
- 不能自行启动本地可执行文件。
- 不能读取本地 Gateway 的 secret。

因此，普通网页要播放 RTSP 必须有一个受信任的本地运行时。Chrome 方案用扩展 + Native Messaging；免扩展方案用桌面宿主进程。

## 客户安装路径

### 路径 A：桌面应用免扩展

适合希望客户“安装一个应用后直接播放”的产品。

1. 使用 Electron 或 Tauri 打包应用。
2. 将 \`rtsp-web-native\` 作为 sidecar 放入安装包。
3. 应用启动时启动 Go Gateway。
4. 渲染层挂载 \`<rtsp-player runtime="desktop">\`。
5. 通过 \`window.rtspNative\` 或 \`window.__RTSP_DESKTOP__\` 暴露 Gateway bridge。

组件写法：

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

详见 [Electron / Tauri 免插件桌面方案](desktop-native.md)。

### 路径 B：浏览器网页 + Chrome Runtime

适合客户必须在 Chrome 中打开业务网页的场景。

1. 下载图形安装器。
2. 安装 Native Runtime。
3. 加载固定 ID 的 Chrome 扩展。
4. 在扩展 popup 中授权业务页面 origin。
5. 页面使用 Web Component、React 或 Vue 组件。

这是浏览器中最清晰、最安全的方案。详见 [一键安装器](installers.md)。

## Gateway bridge 需要实现什么

免扩展桌面模式下，SDK 会调用以下方法：

\`\`\`ts
window.rtspNative = {
  startStream(input): Promise<{
    ok: boolean;
    streamId: string;
    streamToken?: string;
    wsUrl?: string;
    webRTCUrl?: string;
    codec?: string;
    error?: string;
  }>,

  stopStream(input): Promise<{ ok: boolean; stopped?: boolean }>,

  createWebRTCOffer?(input): Promise<{
    ok: boolean;
    streamId?: string;
    answer?: string;
    codec?: string;
    fallback?: string;
    error?: string;
  }>
};
\`\`\`

最小可用版本只需要 \`startStream\` 和 \`stopStream\`，播放会走 WebSocket + WebCodecs。需要 WebRTC/H.265 优先链路时，再实现 \`createWebRTCOffer\`。

## Gateway 安装检查

安装后应确认：

\`\`\`txt
rtsp-web-native --version
\`\`\`

输出版本应与当前 SDK/安装包一致。

如果是桌面 sidecar，由应用主进程负责健康检查：

\`\`\`txt
GET http://127.0.0.1:<port>/health
\`\`\`

如果是 Chrome Runtime，由扩展 popup 检测 Native Runtime、Gateway 端口和当前页面授权状态。

## 给客户的推荐话术

如果客户问“为什么网页组件还要装东西”，可以这样解释：

> 浏览器本身不支持 RTSP，也不能直接启动本地程序。RTSP Gateway 是本机视频运行时，负责连接摄像头并把视频转成浏览器能播放的 WebRTC/WebSocket。若不安装 Chrome 扩展，请使用桌面安装包；桌面应用会内置并自动启动 Gateway。

## 常见错误

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 页面提示缺少 Gateway bridge | 使用了 \`runtime="desktop"\`，但没有 \`window.rtspNative\` | 检查 Electron preload 或 Tauri command |
| 只安装了 Gateway 但普通网页仍不能播放 | 网页无法读取 Gateway secret，也无法启动本地程序 | 使用 Chrome Runtime 或桌面应用 |
| VLC 能播但组件不能播 | 编码、GOP、鉴权或 RTSP TCP 兼容问题 | 先切 H.264 子码流，查看 Gateway 日志 |
| 播放一会儿黑屏 | 源端断流或解码错误 | 当前版本会自动恢复；若反复失败，检查码流和网络 |
`,Et=`# WebRTC / H.265 方案

WebRTC 是桌面端和扩展播放器的默认优先链路。它可以让浏览器或系统 WebView 直接走硬件解码路径，避免把视频帧塞进 Native Messaging JSON，也避免在 Go 端转码。

## 策略

\`\`\`txt
transport="auto"
  1. 探测 RTCPeerConnection + RTCRtpReceiver video capabilities
  2. 创建 recvonly video offer
  3. Go gateway 使用 Pion 创建 answer
  4. RTSP over TCP 收到的 RTP 直接写入 WebRTC TrackLocalStaticRTP
  5. 9 秒内没有可渲染视频帧或协商失败，回退 ws-annexb
\`\`\`

默认 \`codec="auto"\` 会优先使用 H.264 WebRTC，因为 H.264 的浏览器支持最稳。H.265 摄像头可显式设置 \`codec="h265"\`；如果浏览器 offer 不包含 H.265，SDK 会立即回退。

## Native 实现

Go gateway 通过 Pion WebRTC 实现：

- \`POST /api/webrtc/offer\` 接收浏览器 offer。
- 根据 offer 与 \`codec\` 选择 H.264 或 H.265。
- 通过 RTSP DESCRIBE/SETUP/PLAY 拉取同 codec track。
- \`OnRTP\` 将摄像头 RTP 包写入 \`TrackLocalStaticRTP\`。
- Pion 会按协商结果改写 SSRC 和 PayloadType。
- H.264 会缓存实时收到的 SPS/PPS，并修正异常 SPS/PPS/AUD marker，避免浏览器把参数集当成完整视频帧。

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
`,Pt=`# 小米 / 米家摄像头 RTSP 桥接指南

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
`,At="/assets/contact-CNdl1USL.jpg",Ft="/assets/donate-alipay-BSmrWLPt.jpg",It="/assets/donate-wx-Dn3cqFoe.jpg",Lt="/assets/mp-CqDGcv-x.png",Mt="/assets/public-rtsp-e2e-SF2azekD.png",Wt="/assets/rtsp-player-latest-architecture-DXNX5NGC.png",Ot="/assets/rtsp-player-latest-architecture-DHNnpsnF.svg",Nt="/assets/rtsp-player-latest-cover-bg-DdSb4E2y.png",Ht="/assets/rtsp-player-latest-cover-B7Gc5T4f.png",zt="/assets/rtsp-player-wechat-cover-BddK3DxA.png",tn="rtsp-player",Bt="640px",qt="360px",Y={extensionId:"",tagName:tn,runtime:"extension"},Ue=new WeakMap,Ve=6,Gt=700,jt=8e3,Ut=45e3,Vt=3e3,$t=9e3;function Kt(){return typeof document>"u"?"":document.currentScript?.dataset?.extensionId||""}function cn(e){return String(e||"").trim().replace(/^chrome-extension:\/\//,"").replace(/\/.*$/,"")}function Zt(e){const n=cn(e);return n?`chrome-extension://${n}`:""}function vn(e,n){if(e==null||e==="")return n;const u=String(e);return/^\d+$/.test(u)?`${u}px`:u}function ru(e){const n=String(e||"").trim().toLowerCase();return n==="desktop"||n==="auto"||n==="extension"?n:"extension"}function Yt(e){const n=String(e).trim().toLowerCase();return n==="webrtc"||n==="ws-annexb"||n==="auto"?n:"auto"}function ou(e){const n=String(e||"").trim().toLowerCase();return n==="h265"||n==="hevc"?"h265":n==="h264"||n==="avc"?"h264":"auto"}function de(){return typeof window>"u"?null:window.rtspNative||window.__RTSP_DESKTOP__||null}function iu(){return!!de()?.startStream}function L(e,n,u={}){e.dispatchEvent(new CustomEvent(n,{detail:u,bubbles:!0,composed:!0}))}function Xt(e={}){return e.extensionId!==void 0&&(Y.extensionId=cn(e.extensionId)),e.tagName&&(Y.tagName=String(e.tagName)),e.runtime&&(Y.runtime=ru(e.runtime)),{...Y}}async function Tn(e="auto"){const n=ou(e),u={desktopRuntime:iu(),webcodecs:"VideoDecoder"in globalThis,webrtc:"RTCPeerConnection"in globalThis,h264WebRTC:!1,h265WebRTC:!1,h264WebCodecs:!1,h265WebCodecs:!1};try{const r=(globalThis.RTCRtpReceiver?.getCapabilities?.("video")?.codecs||[]).map(o=>String(o.mimeType||"").toLowerCase());u.h264WebRTC=r.includes("video/h264"),u.h265WebRTC=r.includes("video/h265")||r.includes("video/hevc")}catch{}if(u.webcodecs){try{u.h264WebCodecs=!!(await VideoDecoder.isConfigSupported({codec:"avc1.42E01E",hardwareAcceleration:"prefer-hardware",optimizeForLatency:!0})).supported}catch{}try{u.h265WebCodecs=!!(await VideoDecoder.isConfigSupported({codec:"hvc1.1.6.L93.B0",hardwareAcceleration:"prefer-hardware",optimizeForLatency:!0})).supported}catch{}}return u.requestedCodec=n,u}function Jt(e=Y.tagName||tn,n={}){if(typeof window>"u"||typeof customElements>"u")return;Xt(n);const u=String(e||tn),t=customElements.get(u);if(t)return t;class r extends HTMLElement{static get observedAttributes(){return["url","src","width","height","autoplay","controls","muted","transport","media-transport","rtsp-transport","codec","runtime","extension-id"]}constructor(){super(),this._iframe=null,this._loaded=!1,this._player=null,this._pc=null,this._video=null,this._mode="",this._streamId="",this._streamToken="",this._playGeneration=0,this._recoveryAttempts=0,this._recoveryTimer=0,this._userStopped=!1,this.attachShadow({mode:"open"})}connectedCallback(){this._render()}disconnectedCallback(){this.stop(),this._iframe?.contentWindow&&Ue.delete(this._iframe.contentWindow)}attributeChangedCallback(i){if(i==="runtime"||i==="extension-id"){this.stop(),this._iframe=null,this._loaded=!1,this.shadowRoot&&(this.shadowRoot.innerHTML=""),this._render();return}this._resize(),this._mode==="extension"?this._sendInit():this.hasAttribute("autoplay")&&(i==="url"||i==="src")&&this.play()}play(i){i&&this.setAttribute("url",i),this._mode==="extension"?this._sendInit():this._startDesktop()}stop(){this._userStopped=!0,this._playGeneration+=1,this._clearRecoveryTimer(),this._recoveryAttempts=0;const i=this._streamId;if(this._streamId="",this._streamToken="",this._iframe?.contentWindow&&this._iframe.contentWindow.postMessage({type:"RTSP_PLAYER_STOP"},this._origin()),this._player&&(this._player.close(),this._player=null),this._pc){try{this._pc.close()}catch{}this._pc=null}if(this._video){try{this._video.srcObject=null}catch{}this._video.remove(),this._video=null}const a=de();i&&a?.stopStream&&a.stopStream({streamId:i}).catch?.(()=>{})}async capabilities(){return Tn(this._codec())}_runtime(){const i=ru(this.getAttribute("runtime")||Y.runtime);return i==="auto"?iu()?"desktop":"extension":i}_extensionId(){return cn(this.getAttribute("extension-id")||Y.extensionId||window.RTSP_EXTENSION_ID||window.RTSP_WEB_PLAYER_EXTENSION_ID||Kt())}_origin(){return Zt(this._extensionId())}_url(){return this.getAttribute("url")||this.getAttribute("src")||""}_rtspTransport(){const i=this.getAttribute("rtsp-transport"),a=this.getAttribute("transport");return i||(a==="tcp"||a==="udp"?a:"tcp")}_mediaTransport(){return Yt(this.getAttribute("media-transport")||this.getAttribute("transport")||"auto")}_codec(){return ou(this.getAttribute("codec")||"auto")}_render(){if(!this.shadowRoot||this.shadowRoot.innerHTML)return;this._resize(),this._runtime()==="desktop"?this._renderDesktop():this._renderExtension()}_renderExtension(){this._mode="extension",this.shadowRoot.innerHTML=`
        <style>
          :host{display:inline-block;background:#050505;min-width:160px;min-height:90px;contain:content;}
          .rtsp-host{width:100%;height:100%;background:#050505;position:relative;overflow:hidden;border-radius:6px;}
          iframe{width:100%;height:100%;border:0;background:#050505;display:block;}
          .missing{height:100%;min-height:120px;display:flex;align-items:center;justify-content:center;background:#151515;color:#ddd;font:12px system-ui,sans-serif;text-align:center;padding:12px;box-sizing:border-box;}
          .gateway-guide{height:100%;min-height:170px;display:grid;align-content:center;gap:10px;padding:18px;background:#111312;color:#e9ede8;font:13px system-ui,sans-serif;box-sizing:border-box;}
          .gateway-guide strong{color:#f4f5f2;font-size:15px;}
          .gateway-guide span{color:#b6bbb4;line-height:1.5;}
          .gateway-guide a{display:inline-flex;width:max-content;max-width:100%;align-items:center;min-height:34px;padding:0 10px;border:1px solid #435048;border-radius:6px;background:#223423;color:#ecfff0;text-decoration:none;}
        </style>
        <div class="rtsp-host"></div>
      `;const i=this.shadowRoot.querySelector(".rtsp-host"),a=this._origin();if(!a){i.innerHTML=this._gatewayGuideHTML("需要安装 RTSP Gateway","普通网页不能直接访问 rtsp://。请先安装 RTSP Gateway 与 Chrome 扩展，或在 Electron/Tauri 中使用 desktop runtime bridge。");return}const s=document.createElement("iframe");s.src=`${a}/player/player.html`,s.allow="autoplay; fullscreen",s.referrerPolicy="no-referrer",s.addEventListener("load",()=>{this._loaded=!0,Ue.set(s.contentWindow,this),this._sendInit()}),i.appendChild(s),this._iframe=s}_renderDesktop(){this._mode="desktop",this.shadowRoot.innerHTML=`
        <style>
          :host{display:inline-block;background:#050505;min-width:160px;min-height:90px;contain:content;}
          .rtsp-host{width:100%;height:100%;background:#050505;position:relative;overflow:hidden;border-radius:6px;}
          canvas{width:100%;height:100%;display:block;background:#050505;}
          .status{position:absolute;left:10px;right:10px;bottom:10px;padding:8px 10px;border-radius:6px;background:rgba(0,0,0,.62);color:#f5f5f5;font:12px system-ui,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
          .status.ok{color:#9ad29d}.status.error{color:#e08d7a}
          .gateway-guide{position:absolute;inset:0;display:grid;align-content:center;gap:10px;padding:18px;background:#111312;color:#e9ede8;font:13px system-ui,sans-serif;box-sizing:border-box;}
          .gateway-guide strong{color:#f4f5f2;font-size:15px;}
          .gateway-guide span{color:#b6bbb4;line-height:1.5;}
          .gateway-guide a{display:inline-flex;width:max-content;max-width:100%;align-items:center;min-height:34px;padding:0 10px;border:1px solid #435048;border-radius:6px;background:#223423;color:#ecfff0;text-decoration:none;}
        </style>
        <div class="rtsp-host">
          <canvas part="canvas"></canvas>
          <div class="status" part="status">Desktop runtime ready.</div>
        </div>
      `,this.hasAttribute("autoplay")&&this._url()&&this._startDesktop()}_resize(){this.style.width=vn(this.getAttribute("width")||this.style.width,Bt),this.style.height=vn(this.getAttribute("height")||this.style.height,qt)}_sendInit(){const i=this._origin();!this._loaded||!this._iframe?.contentWindow||!i||this._iframe.contentWindow.postMessage({type:"RTSP_PLAYER_INIT",url:this._url(),autoplay:this.hasAttribute("autoplay"),controls:this.hasAttribute("controls"),muted:this.hasAttribute("muted"),transport:this._rtspTransport(),rtspTransport:this._rtspTransport(),mediaTransport:this._mediaTransport(),codec:this._codec()},i)}async _startDesktop(){const i=de(),a=this._url().trim();if(!i?.startStream){this._showGatewayGuide("未检测到 RTSP Gateway bridge","Web 组件免插件接入需要先安装 Gateway，并在页面中注入 window.rtspNative 或 window.__RTSP_DESKTOP__。"),this._status("Desktop runtime bridge is not available.","error"),L(this,"error",{error:"Desktop runtime bridge is not available."});return}if(!/^rtsps?:\/\//i.test(a)){this._status("RTSP URL must start with rtsp:// or rtsps://.","error");return}this._stopMediaOnly(),this._userStopped=!1,this._clearRecoveryTimer(),this._recoveryAttempts=0;const s=++this._playGeneration;L(this,"starting",{runtime:"desktop",transport:this._mediaTransport(),codec:this._codec()}),this._status("Starting desktop runtime...");const c=this._mediaTransport(),l=this._codec();(c==="auto"||c==="webrtc")&&await this._canAttemptWebRTC(l)&&await this._startWebRTC(i,a,l,s)||await this._startWebSocket(i,a,l,s)}async _canAttemptWebRTC(i){if(!("RTCPeerConnection"in window))return!1;const a=await Tn(i);return i==="h265"?a.h265WebRTC:i==="h264"?a.h264WebRTC:a.h265WebRTC||a.h264WebRTC}async _startWebRTC(i,a,s,c){if(!i.createWebRTCOffer||!i.startStream)return!1;const l=await i.startStream({url:a,codec:s,transport:this._rtspTransport(),mediaTransport:"webrtc",origin:location.origin});if(!l?.ok||!l.streamId)return this._status(l?.error||"Desktop runtime WebRTC start failed."),!1;this._streamId=l.streamId||"",this._streamToken=l.streamToken||"";const d=new RTCPeerConnection({iceServers:[]});this._pc=d;const h=new MediaStream;let p=!1;d.addTransceiver("video",{direction:"recvonly"}),d.addEventListener("connectionstatechange",()=>{const g=d.connectionState;p&&(g==="failed"||g==="disconnected")&&this._scheduleRecovery(c,`webrtc-connection-${g}`,{codec:s,state:g})}),d.ontrack=g=>{p=!0,g.track?.addEventListener?.("ended",()=>this._scheduleRecovery(c,"webrtc-track-ended",{codec:s})),h.addTrack(g.track),this._attachVideoStream(h,c),this._status(`WebRTC ${s||"auto"} ready.`,"ok"),L(this,"ready",{runtime:"desktop",mediaTransport:"webrtc",codec:s})};const f=await d.createOffer();await d.setLocalDescription(f),await Qt(d);const m=await i.createWebRTCOffer({url:a,codec:s,origin:location.origin,streamId:this._streamId,streamToken:this._streamToken,offer:d.localDescription?.sdp||f.sdp});if(!m?.ok||!m.answer){this._status(m?.error||"WebRTC unavailable, falling back to WebSocket.");try{d.close()}catch{}return this._pc=null,await i.stopStream?.({streamId:this._streamId}).catch?.(()=>{}),this._streamId="",this._streamToken="",!1}if(await d.setRemoteDescription({type:"answer",sdp:m.answer}),s=m.codec||s,await er($t),p)return!0;this._status("WebRTC negotiated but no video arrived; falling back to WebSocket.");try{d.close()}catch{}return this._pc=null,await i.stopStream?.({streamId:this._streamId}).catch?.(()=>{}),this._streamId="",this._streamToken="",!1}async _startWebSocket(i,a,s,c){const l=await i.startStream({url:a,codec:s,transport:this._rtspTransport(),mediaTransport:"ws-annexb",origin:location.origin});if(!l?.ok||!l.wsUrl){const h=l?.error||"Desktop runtime start failed.";if(this._recoveryAttempts>0){this._scheduleRecovery(c,"desktop-start-failed",{error:h});return}this._status(h,"error"),L(this,"error",{error:h});return}this._streamId=l.streamId||"",this._streamToken=l.streamToken||"";const d=this.shadowRoot.querySelector("canvas");this._player=new nr(d,{onStatus:(h,p)=>this._status(h,p),onReady:()=>L(this,"ready",{runtime:"desktop",mediaTransport:"ws-annexb",codec:s}),onError:h=>L(this,"error",{error:h}),onHealthy:()=>this._markHealthy(c),onRecoverableError:(h,p)=>this._scheduleRecovery(c,h,p)}),this._player.connect(l.wsUrl)}_attachVideoStream(i,a){const s=document.createElement("video");s.muted=!0,s.autoplay=!0,s.playsInline=!0,s.srcObject=i,s.play().catch(()=>{}),this._video=s;const c=this.shadowRoot.querySelector("canvas"),l=c.getContext("2d");let d=0,h=!1;const p=()=>{this._video&&(s.videoWidth&&s.videoHeight&&((c.width!==s.videoWidth||c.height!==s.videoHeight)&&(c.width=s.videoWidth,c.height=s.videoHeight),l.drawImage(s,0,0,c.width,c.height),d=performance.now(),h||(h=!0,this._markHealthy(a))),requestAnimationFrame(p))};requestAnimationFrame(p);const f=setInterval(()=>{if(this._video!==s){clearInterval(f);return}d&&performance.now()-d>1e4&&(clearInterval(f),this._scheduleRecovery(a,"webrtc-video-stall",{msSinceFrame:Math.round(performance.now()-d)}))},2e3)}_status(i,a=""){const s=this.shadowRoot?.querySelector(".status");s&&(s.textContent=i||"",s.className=`status ${a||""}`)}_gatewayGuideHTML(i,a){return`
        <div class="gateway-guide">
          <strong>${Rn(i)}</strong>
          <span>${Rn(a)}</span>
          <a href="https://rtsp.flyfish.dev/#docs/web-component-gateway.md" target="_blank" rel="noreferrer">查看 Gateway 安装指引</a>
        </div>
      `}_showGatewayGuide(i,a){const s=this.shadowRoot?.querySelector(".rtsp-host");!s||s.querySelector(".gateway-guide")||s.insertAdjacentHTML("beforeend",this._gatewayGuideHTML(i,a))}_stopMediaOnly(){const i=this._streamId;if(this._streamId="",this._streamToken="",this._player&&(this._player.close(),this._player=null),this._pc){try{this._pc.close()}catch{}this._pc=null}if(this._video){try{this._video.srcObject=null}catch{}this._video.remove(),this._video=null}const a=de();i&&a?.stopStream&&a.stopStream({streamId:i}).catch?.(()=>{})}_clearRecoveryTimer(){this._recoveryTimer&&(clearTimeout(this._recoveryTimer),this._recoveryTimer=0)}_markHealthy(i){i!==this._playGeneration||this._userStopped||(this._recoveryAttempts>0&&L(this,"recovered",{attempt:this._recoveryAttempts}),this._recoveryAttempts=0)}_scheduleRecovery(i,a,s={}){if(i!==this._playGeneration||this._userStopped||this._recoveryTimer)return;if(this._recoveryAttempts>=Ve){const l=`Playback recovery failed: ${a}`;this._status(l,"error"),L(this,"error",{error:l,reason:a,details:s});return}this._recoveryAttempts+=1;const c=Math.min(jt,Gt*2**Math.max(0,this._recoveryAttempts-1));this._status(`Playback interrupted. Recovering (${this._recoveryAttempts}/${Ve})...`,"error"),L(this,"recovering",{reason:a,details:s,attempt:this._recoveryAttempts,maxAttempts:Ve,delay:c}),this._stopMediaOnly(),this._recoveryTimer=setTimeout(()=>{this._recoveryTimer=0,this._restartDesktopAfterRecovery(i)},c)}async _restartDesktopAfterRecovery(i){if(this._userStopped||i!==this._playGeneration)return;const a=de(),s=this._url().trim();if(!a?.startStream||!/^rtsps?:\/\//i.test(s))return;const c=++this._playGeneration,l=this._codec();await this._startWebSocket(a,s,l,c)}}return customElements.define(u,r),window.__RTSP_PLAYER_MESSAGE_BRIDGE__||(window.__RTSP_PLAYER_MESSAGE_BRIDGE__=!0,window.addEventListener("message",o=>{const i=o.source,a=i?Ue.get(i):null;if(!a||!o.data?.type?.startsWith?.("RTSP_PLAYER_")||o.origin!==a._origin())return;const s=o.data.type.replace(/^RTSP_PLAYER_/,"").toLowerCase();L(a,s,o.data)})),r}function Qt(e){return e.iceGatheringState==="complete"?Promise.resolve():new Promise(n=>{const u=setTimeout(t,1200);function t(){clearTimeout(u),e.removeEventListener("icegatheringstatechange",r),n()}function r(){e.iceGatheringState==="complete"&&t()}e.addEventListener("icegatheringstatechange",r)})}function er(e){return new Promise(n=>setTimeout(n,e))}function Rn(e){return String(e).replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n])}class nr{constructor(n,u={}){this.canvas=n,this.ctx=n.getContext("2d"),this.hooks=u,this.ws=null,this.decoder=null,this.codec="",this.gotKey=!1,this.closed=!1,this.lastTimestamp=-1,this.configuredAt=0,this.lastFrameAt=0,this.reportedHealthy=!1,this.decoderErrorTimes=[],this.recovering=!1,this.watchdog=0,this.waitingKeyLogged=!1,this.waitingKeyStatusAt=0}connect(n){this.ws=new WebSocket(n),this.ws.binaryType="arraybuffer",this.ws.onopen=()=>this.hooks.onStatus?.("Connected to desktop gateway."),this.ws.onerror=()=>this.hooks.onStatus?.("WebSocket connection error.","error"),this.ws.onclose=()=>{this.closed||(this.hooks.onStatus?.("Video connection closed.","error"),this.notifyRecoverable("websocket-closed"))},this.ws.onmessage=u=>this.handleMessage(u.data),this.startWatchdog()}async handleMessage(n){if(typeof n=="string"){let u;try{u=JSON.parse(n)}catch{return}u.type==="config"?await this.configure(u.codec):u.type==="error"&&this.notifyRecoverable("gateway-error",{error:u.error||"RTSP error"});return}n instanceof ArrayBuffer&&this.handleAccessUnit(n)}async configure(n){if(n||="avc1.42E01E",this.decoder&&this.codec===n)return;if(this.codec=n,this.decoder)try{this.decoder.close()}catch{}if(!("VideoDecoder"in window)){this.hooks.onStatus?.("VideoDecoder is not supported in this runtime.","error"),this.hooks.onError?.("VideoDecoder is not supported in this runtime.");return}const u={codec:n,hardwareAcceleration:"prefer-hardware",optimizeForLatency:!0};try{if(!(await VideoDecoder.isConfigSupported(u)).supported){const r=`Runtime does not support codec ${n}.`;this.hooks.onStatus?.(r,"error"),this.hooks.onError?.(r);return}}catch{}this.decoder=new VideoDecoder({output:t=>this.render(t),error:t=>this.recoverDecoder(t?.message||String(t))}),this.decoder.configure(u),this.gotKey=!1,this.configuredAt=performance.now(),this.waitingKeyLogged=!1,this.waitingKeyStatusAt=0,this.hooks.onStatus?.(`Decoder ready: ${n}. Waiting for the first key/startup frame...`,"ok")}handleAccessUnit(n){if(n.byteLength<16||!this.decoder||this.decoder.state!=="configured")return;const u=new DataView(n);if(u.getUint8(0)!==1)return;const t=u.getUint8(1)===1;let r=Number(u.getBigUint64(4,!0));const o=u.getUint32(12,!0);if(!(o<=0||16+o>n.byteLength)){if(!t&&!this.gotKey){const i=performance.now();(!this.waitingKeyLogged||i-this.waitingKeyStatusAt>5e3)&&(this.waitingKeyLogged=!0,this.waitingKeyStatusAt=i,this.hooks.onStatus?.("Waiting for the first camera key/startup frame..."));return}if(t&&!this.gotKey&&(this.gotKey=!0,this.hooks.onStatus?.("Keyframe received. Rendering first frame...")),r<=this.lastTimestamp&&(r=this.lastTimestamp+1),this.lastTimestamp=r,!(!t&&this.decoder.decodeQueueSize>6))try{this.decoder.decode(new EncodedVideoChunk({type:t?"key":"delta",timestamp:r,data:new Uint8Array(n,16,o)}))}catch(i){this.recoverDecoder(i?.message||String(i))}}}render(n){try{(this.canvas.width!==n.displayWidth||this.canvas.height!==n.displayHeight)&&(this.canvas.width=n.displayWidth,this.canvas.height=n.displayHeight),this.ctx.drawImage(n,0,0,this.canvas.width,this.canvas.height),this.lastFrameAt=performance.now(),this.reportedHealthy||(this.reportedHealthy=!0,this.hooks.onStatus?.(`Video ready: ${n.displayWidth}x${n.displayHeight}`,"ok"),this.hooks.onReady?.(),this.hooks.onHealthy?.())}finally{n.close()}}recoverDecoder(n){if(this.closed||this.recovering)return;const u=performance.now();if(this.decoderErrorTimes=this.decoderErrorTimes.filter(t=>u-t<1e4),this.decoderErrorTimes.push(u),this.decoderErrorTimes.length>2){this.notifyRecoverable("decoder-error-loop",{error:n,codec:this.codec,decoderErrors:this.decoderErrorTimes.length});return}this.recovering=!0;try{this.decoder&&this.decoder.close()}catch{}this.decoder=null,this.gotKey=!1,this.hooks.onStatus?.("Decoder error. Rebuilding decoder...","error"),setTimeout(()=>{this.closed||(this.recovering=!1,this.configure(this.codec).catch(t=>{this.notifyRecoverable("decoder-reconfigure-failed",{error:t?.message||String(t),codec:this.codec})}))},180)}startWatchdog(){this.watchdog||(this.watchdog=setInterval(()=>{if(this.closed||this.recovering)return;const n=performance.now();if(this.configuredAt&&!this.lastFrameAt&&n-this.configuredAt>Vt&&!this.waitingKeyLogged&&(this.waitingKeyLogged=!0,this.waitingKeyStatusAt=n,this.hooks.onStatus?.("Waiting for the first camera key/startup frame...")),this.configuredAt&&!this.lastFrameAt&&n-this.configuredAt>Ut){this.notifyRecoverable("video-stall-before-first-frame",{codec:this.codec});return}this.lastFrameAt&&n-this.lastFrameAt>1e4&&this.notifyRecoverable("video-stall",{codec:this.codec,msSinceFrame:Math.round(n-this.lastFrameAt)})},2e3))}notifyRecoverable(n,u={}){this.closed||this.recovering||(this.recovering=!0,this.hooks.onRecoverableError?.(n,u))}close(){if(this.closed=!0,this.watchdog&&(clearInterval(this.watchdog),this.watchdog=0),this.ws){try{this.ws.close()}catch{}this.ws=null}if(this.decoder){try{this.decoder.close()}catch{}this.decoder=null}}}const Dn={};function ur(e){let n=Dn[e];if(n)return n;n=Dn[e]=[];for(let u=0;u<128;u++){const t=String.fromCharCode(u);n.push(t)}for(let u=0;u<e.length;u++){const t=e.charCodeAt(u);n[t]="%"+("0"+t.toString(16).toUpperCase()).slice(-2)}return n}function re(e,n){typeof n!="string"&&(n=re.defaultChars);const u=ur(n);return e.replace(/(%[a-f0-9]{2})+/gi,function(t){let r="";for(let o=0,i=t.length;o<i;o+=3){const a=parseInt(t.slice(o+1,o+3),16);if(a<128){r+=u[a];continue}if((a&224)===192&&o+3<i){const s=parseInt(t.slice(o+4,o+6),16);if((s&192)===128){const c=a<<6&1984|s&63;c<128?r+="��":r+=String.fromCharCode(c),o+=3;continue}}if((a&240)===224&&o+6<i){const s=parseInt(t.slice(o+4,o+6),16),c=parseInt(t.slice(o+7,o+9),16);if((s&192)===128&&(c&192)===128){const l=a<<12&61440|s<<6&4032|c&63;l<2048||l>=55296&&l<=57343?r+="���":r+=String.fromCharCode(l),o+=6;continue}}if((a&248)===240&&o+9<i){const s=parseInt(t.slice(o+4,o+6),16),c=parseInt(t.slice(o+7,o+9),16),l=parseInt(t.slice(o+10,o+12),16);if((s&192)===128&&(c&192)===128&&(l&192)===128){let d=a<<18&1835008|s<<12&258048|c<<6&4032|l&63;d<65536||d>1114111?r+="����":(d-=65536,r+=String.fromCharCode(55296+(d>>10),56320+(d&1023))),o+=9;continue}}r+="�"}return r})}re.defaultChars=";/?:@&=+$,#";re.componentChars="";const En={};function tr(e){let n=En[e];if(n)return n;n=En[e]=[];for(let u=0;u<128;u++){const t=String.fromCharCode(u);/^[0-9a-z]$/i.test(t)?n.push(t):n.push("%"+("0"+u.toString(16).toUpperCase()).slice(-2))}for(let u=0;u<e.length;u++)n[e.charCodeAt(u)]=e[u];return n}function Ce(e,n,u){typeof n!="string"&&(u=n,n=Ce.defaultChars),typeof u>"u"&&(u=!0);const t=tr(n);let r="";for(let o=0,i=e.length;o<i;o++){const a=e.charCodeAt(o);if(u&&a===37&&o+2<i&&/^[0-9a-f]{2}$/i.test(e.slice(o+1,o+3))){r+=e.slice(o,o+3),o+=2;continue}if(a<128){r+=t[a];continue}if(a>=55296&&a<=57343){if(a>=55296&&a<=56319&&o+1<i){const s=e.charCodeAt(o+1);if(s>=56320&&s<=57343){r+=encodeURIComponent(e[o]+e[o+1]),o++;continue}}r+="%EF%BF%BD";continue}r+=encodeURIComponent(e[o])}return r}Ce.defaultChars=";/?:@&=+$,-_.!~*'()#";Ce.componentChars="-_.!~*'()";function ln(e){let n="";return n+=e.protocol||"",n+=e.slashes?"//":"",n+=e.auth?e.auth+"@":"",e.hostname&&e.hostname.indexOf(":")!==-1?n+="["+e.hostname+"]":n+=e.hostname||"",n+=e.port?":"+e.port:"",n+=e.pathname||"",n+=e.search||"",n+=e.hash||"",n}function Ee(){this.protocol=null,this.slashes=null,this.auth=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.pathname=null}const rr=/^([a-z0-9.+-]+:)/i,or=/:[0-9]*$/,ir=/^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,ar=["<",">",'"',"`"," ","\r",`
`,"	"],sr=["{","}","|","\\","^","`"].concat(ar),cr=["'"].concat(sr),Pn=["%","/","?",";","#"].concat(cr),An=["/","?","#"],lr=255,Fn=/^[+a-z0-9A-Z_-]{0,63}$/,dr=/^([+a-z0-9A-Z_-]{0,63})(.*)$/,In={javascript:!0,"javascript:":!0},Ln={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0};function dn(e,n){if(e&&e instanceof Ee)return e;const u=new Ee;return u.parse(e,n),u}Ee.prototype.parse=function(e,n){let u,t,r,o=e;if(o=o.trim(),!n&&e.split("#").length===1){const c=ir.exec(o);if(c)return this.pathname=c[1],c[2]&&(this.search=c[2]),this}let i=rr.exec(o);if(i&&(i=i[0],u=i.toLowerCase(),this.protocol=i,o=o.substr(i.length)),(n||i||o.match(/^\/\/[^@\/]+@[^@\/]+/))&&(r=o.substr(0,2)==="//",r&&!(i&&In[i])&&(o=o.substr(2),this.slashes=!0)),!In[i]&&(r||i&&!Ln[i])){let c=-1;for(let f=0;f<An.length;f++)t=o.indexOf(An[f]),t!==-1&&(c===-1||t<c)&&(c=t);let l,d;c===-1?d=o.lastIndexOf("@"):d=o.lastIndexOf("@",c),d!==-1&&(l=o.slice(0,d),o=o.slice(d+1),this.auth=l),c=-1;for(let f=0;f<Pn.length;f++)t=o.indexOf(Pn[f]),t!==-1&&(c===-1||t<c)&&(c=t);c===-1&&(c=o.length),o[c-1]===":"&&c--;const h=o.slice(0,c);o=o.slice(c),this.parseHost(h),this.hostname=this.hostname||"";const p=this.hostname[0]==="["&&this.hostname[this.hostname.length-1]==="]";if(!p){const f=this.hostname.split(/\./);for(let m=0,g=f.length;m<g;m++){const C=f[m];if(C&&!C.match(Fn)){let _="";for(let b=0,x=C.length;b<x;b++)C.charCodeAt(b)>127?_+="x":_+=C[b];if(!_.match(Fn)){const b=f.slice(0,m),x=f.slice(m+1),y=C.match(dr);y&&(b.push(y[1]),x.unshift(y[2])),x.length&&(o=x.join(".")+o),this.hostname=b.join(".");break}}}}this.hostname.length>lr&&(this.hostname=""),p&&(this.hostname=this.hostname.substr(1,this.hostname.length-2))}const a=o.indexOf("#");a!==-1&&(this.hash=o.substr(a),o=o.slice(0,a));const s=o.indexOf("?");return s!==-1&&(this.search=o.substr(s),o=o.slice(0,s)),o&&(this.pathname=o),Ln[u]&&this.hostname&&!this.pathname&&(this.pathname=""),this};Ee.prototype.parseHost=function(e){let n=or.exec(e);n&&(n=n[0],n!==":"&&(this.port=n.substr(1)),e=e.substr(0,e.length-n.length)),e&&(this.hostname=e)};const fr=Object.freeze(Object.defineProperty({__proto__:null,decode:re,encode:Ce,format:ln,parse:dn},Symbol.toStringTag,{value:"Module"})),au=/[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,su=/[\0-\x1F\x7F-\x9F]/,pr=/[\xAD\u0600-\u0605\u061C\u06DD\u070F\u0890\u0891\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]|\uD804[\uDCBD\uDCCD]|\uD80D[\uDC30-\uDC3F]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]/,fn=/[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061D-\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1B7D\u1B7E\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52-\u2E5D\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDEAD\uDF55-\uDF59\uDF86-\uDF89]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDEB9\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2\uDF00-\uDF09]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDF43-\uDF4F\uDFFF]|\uD809[\uDC70-\uDC74]|\uD80B[\uDFF1\uDFF2]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/,cu=/[\$\+<->\^`\|~\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058D-\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u07FE\u07FF\u0888\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D4F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20C0\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A\u218B\u2190-\u2307\u230C-\u2328\u232B-\u2426\u2440-\u244A\u249C-\u24E9\u2500-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B73\u2B76-\u2B95\u2B97-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFF\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E3\u31EF\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uAB5B\uAB6A\uAB6B\uFB29\uFBB2-\uFBC2\uFD40-\uFD4F\uFDCF\uFDFC-\uFDFF\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD]|\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD833[\uDF50-\uDFC3]|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDEA\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838[\uDD4F\uDEFF]|\uD83B[\uDCAC\uDCB0\uDD2E\uDEF0\uDEF1]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED7\uDEDC-\uDEEC\uDEF0-\uDEFC\uDF00-\uDF76\uDF7B-\uDFD9\uDFE0-\uDFEB\uDFF0]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0\uDCB1\uDD00-\uDE53\uDE60-\uDE6D\uDE70-\uDE7C\uDE80-\uDE88\uDE90-\uDEBD\uDEBF-\uDEC5\uDECE-\uDEDB\uDEE0-\uDEE8\uDEF0-\uDEF8\uDF00-\uDF92\uDF94-\uDFCA]/,lu=/[ \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/,hr=Object.freeze(Object.defineProperty({__proto__:null,Any:au,Cc:su,Cf:pr,P:fn,S:cu,Z:lu},Symbol.toStringTag,{value:"Module"})),br=new Uint16Array('ᵁ<Õıʊҝջאٵ۞ޢߖࠏ੊ઑඡ๭༉༦჊ረዡᐕᒝᓃᓟᔥ\0\0\0\0\0\0ᕫᛍᦍᰒᷝ὾⁠↰⊍⏀⏻⑂⠤⤒ⴈ⹈⿎〖㊺㘹㞬㣾㨨㩱㫠㬮ࠀEMabcfglmnoprstu\\bfms¦³¹ÈÏlig耻Æ䃆P耻&䀦cute耻Á䃁reve;䄂Āiyx}rc耻Â䃂;䐐r;쀀𝔄rave耻À䃀pha;䎑acr;䄀d;橓Āgp¡on;䄄f;쀀𝔸plyFunction;恡ing耻Å䃅Ācs¾Ãr;쀀𝒜ign;扔ilde耻Ã䃃ml耻Ä䃄ЀaceforsuåûþėĜĢħĪĀcrêòkslash;或Ŷöø;櫧ed;挆y;䐑ƀcrtąċĔause;戵noullis;愬a;䎒r;쀀𝔅pf;쀀𝔹eve;䋘còēmpeq;扎܀HOacdefhilorsuōőŖƀƞƢƵƷƺǜȕɳɸɾcy;䐧PY耻©䂩ƀcpyŝŢźute;䄆Ā;iŧŨ拒talDifferentialD;慅leys;愭ȀaeioƉƎƔƘron;䄌dil耻Ç䃇rc;䄈nint;戰ot;䄊ĀdnƧƭilla;䂸terDot;䂷òſi;䎧rcleȀDMPTǇǋǑǖot;抙inus;抖lus;投imes;抗oĀcsǢǸkwiseContourIntegral;戲eCurlyĀDQȃȏoubleQuote;思uote;怙ȀlnpuȞȨɇɕonĀ;eȥȦ户;橴ƀgitȯȶȺruent;扡nt;戯ourIntegral;戮ĀfrɌɎ;愂oduct;成nterClockwiseContourIntegral;戳oss;樯cr;쀀𝒞pĀ;Cʄʅ拓ap;才րDJSZacefiosʠʬʰʴʸˋ˗ˡ˦̳ҍĀ;oŹʥtrahd;椑cy;䐂cy;䐅cy;䐏ƀgrsʿ˄ˇger;怡r;憡hv;櫤Āayː˕ron;䄎;䐔lĀ;t˝˞戇a;䎔r;쀀𝔇Āaf˫̧Ācm˰̢riticalȀADGT̖̜̀̆cute;䂴oŴ̋̍;䋙bleAcute;䋝rave;䁠ilde;䋜ond;拄ferentialD;慆Ѱ̽\0\0\0͔͂\0Ѕf;쀀𝔻ƀ;DE͈͉͍䂨ot;惜qual;扐blèCDLRUVͣͲ΂ϏϢϸontourIntegraìȹoɴ͹\0\0ͻ»͉nArrow;懓Āeo·ΤftƀARTΐΖΡrrow;懐ightArrow;懔eåˊngĀLRΫτeftĀARγιrrow;柸ightArrow;柺ightArrow;柹ightĀATϘϞrrow;懒ee;抨pɁϩ\0\0ϯrrow;懑ownArrow;懕erticalBar;戥ǹABLRTaВЪаўѿͼrrowƀ;BUНОТ憓ar;椓pArrow;懵reve;䌑eft˒к\0ц\0ѐightVector;楐eeVector;楞ectorĀ;Bљњ憽ar;楖ightǔѧ\0ѱeeVector;楟ectorĀ;BѺѻ懁ar;楗eeĀ;A҆҇护rrow;憧ĀctҒҗr;쀀𝒟rok;䄐ࠀNTacdfglmopqstuxҽӀӄӋӞӢӧӮӵԡԯԶՒ՝ՠեG;䅊H耻Ð䃐cute耻É䃉ƀaiyӒӗӜron;䄚rc耻Ê䃊;䐭ot;䄖r;쀀𝔈rave耻È䃈ement;戈ĀapӺӾcr;䄒tyɓԆ\0\0ԒmallSquare;旻erySmallSquare;斫ĀgpԦԪon;䄘f;쀀𝔼silon;䎕uĀaiԼՉlĀ;TՂՃ橵ilde;扂librium;懌Āci՗՚r;愰m;橳a;䎗ml耻Ë䃋Āipժկsts;戃onentialE;慇ʀcfiosօֈ֍ֲ׌y;䐤r;쀀𝔉lledɓ֗\0\0֣mallSquare;旼erySmallSquare;斪Ͱֺ\0ֿ\0\0ׄf;쀀𝔽All;戀riertrf;愱cò׋؀JTabcdfgorstר׬ׯ׺؀ؒؖ؛؝أ٬ٲcy;䐃耻>䀾mmaĀ;d׷׸䎓;䏜reve;䄞ƀeiy؇،ؐdil;䄢rc;䄜;䐓ot;䄠r;쀀𝔊;拙pf;쀀𝔾eater̀EFGLSTصلَٖٛ٦qualĀ;Lؾؿ扥ess;招ullEqual;执reater;檢ess;扷lantEqual;橾ilde;扳cr;쀀𝒢;扫ЀAacfiosuڅڋږڛڞڪھۊRDcy;䐪Āctڐڔek;䋇;䁞irc;䄤r;愌lbertSpace;愋ǰگ\0ڲf;愍izontalLine;攀Āctۃۅòکrok;䄦mpńېۘownHumðįqual;扏܀EJOacdfgmnostuۺ۾܃܇܎ܚܞܡܨ݄ݸދޏޕcy;䐕lig;䄲cy;䐁cute耻Í䃍Āiyܓܘrc耻Î䃎;䐘ot;䄰r;愑rave耻Ì䃌ƀ;apܠܯܿĀcgܴܷr;䄪inaryI;慈lieóϝǴ݉\0ݢĀ;eݍݎ戬Āgrݓݘral;戫section;拂isibleĀCTݬݲomma;恣imes;恢ƀgptݿރވon;䄮f;쀀𝕀a;䎙cr;愐ilde;䄨ǫޚ\0ޞcy;䐆l耻Ï䃏ʀcfosuެ޷޼߂ߐĀiyޱ޵rc;䄴;䐙r;쀀𝔍pf;쀀𝕁ǣ߇\0ߌr;쀀𝒥rcy;䐈kcy;䐄΀HJacfosߤߨ߽߬߱ࠂࠈcy;䐥cy;䐌ppa;䎚Āey߶߻dil;䄶;䐚r;쀀𝔎pf;쀀𝕂cr;쀀𝒦րJTaceflmostࠥࠩࠬࡐࡣ঳সে্਷ੇcy;䐉耻<䀼ʀcmnpr࠷࠼ࡁࡄࡍute;䄹bda;䎛g;柪lacetrf;愒r;憞ƀaeyࡗ࡜ࡡron;䄽dil;䄻;䐛Āfsࡨ॰tԀACDFRTUVarࡾࢩࢱࣦ࣠ࣼयज़ΐ४Ānrࢃ࢏gleBracket;柨rowƀ;BR࢙࢚࢞憐ar;懤ightArrow;懆eiling;挈oǵࢷ\0ࣃbleBracket;柦nǔࣈ\0࣒eeVector;楡ectorĀ;Bࣛࣜ懃ar;楙loor;挊ightĀAV࣯ࣵrrow;憔ector;楎Āerँगeƀ;AVउऊऐ抣rrow;憤ector;楚iangleƀ;BEतथऩ抲ar;槏qual;抴pƀDTVषूौownVector;楑eeVector;楠ectorĀ;Bॖॗ憿ar;楘ectorĀ;B॥०憼ar;楒ightáΜs̀EFGLSTॾঋকঝঢভqualGreater;拚ullEqual;扦reater;扶ess;檡lantEqual;橽ilde;扲r;쀀𝔏Ā;eঽা拘ftarrow;懚idot;䄿ƀnpw৔ਖਛgȀLRlr৞৷ਂਐeftĀAR০৬rrow;柵ightArrow;柷ightArrow;柶eftĀarγਊightáοightáϊf;쀀𝕃erĀLRਢਬeftArrow;憙ightArrow;憘ƀchtਾੀੂòࡌ;憰rok;䅁;扪Ѐacefiosuਗ਼੝੠੷੼અઋ઎p;椅y;䐜Ādl੥੯iumSpace;恟lintrf;愳r;쀀𝔐nusPlus;戓pf;쀀𝕄cò੶;䎜ҀJacefostuણધભીଔଙඑ඗ඞcy;䐊cute;䅃ƀaey઴હાron;䅇dil;䅅;䐝ƀgswે૰଎ativeƀMTV૓૟૨ediumSpace;怋hiĀcn૦૘ë૙eryThiî૙tedĀGL૸ଆreaterGreateòٳessLesóੈLine;䀊r;쀀𝔑ȀBnptଢନଷ଺reak;恠BreakingSpace;䂠f;愕ڀ;CDEGHLNPRSTV୕ୖ୪୼஡௫ఄ౞಄ದ೘ൡඅ櫬Āou୛୤ngruent;扢pCap;扭oubleVerticalBar;戦ƀlqxஃஊ஛ement;戉ualĀ;Tஒஓ扠ilde;쀀≂̸ists;戄reater΀;EFGLSTஶஷ஽௉௓௘௥扯qual;扱ullEqual;쀀≧̸reater;쀀≫̸ess;批lantEqual;쀀⩾̸ilde;扵umpń௲௽ownHump;쀀≎̸qual;쀀≏̸eĀfsఊధtTriangleƀ;BEచఛడ拪ar;쀀⧏̸qual;括s̀;EGLSTవశ఼ౄోౘ扮qual;扰reater;扸ess;쀀≪̸lantEqual;쀀⩽̸ilde;扴estedĀGL౨౹reaterGreater;쀀⪢̸essLess;쀀⪡̸recedesƀ;ESಒಓಛ技qual;쀀⪯̸lantEqual;拠ĀeiಫಹverseElement;戌ghtTriangleƀ;BEೋೌ೒拫ar;쀀⧐̸qual;拭ĀquೝഌuareSuĀbp೨೹setĀ;E೰ೳ쀀⊏̸qual;拢ersetĀ;Eഃആ쀀⊐̸qual;拣ƀbcpഓതൎsetĀ;Eഛഞ쀀⊂⃒qual;抈ceedsȀ;ESTലള഻െ抁qual;쀀⪰̸lantEqual;拡ilde;쀀≿̸ersetĀ;E൘൛쀀⊃⃒qual;抉ildeȀ;EFT൮൯൵ൿ扁qual;扄ullEqual;扇ilde;扉erticalBar;戤cr;쀀𝒩ilde耻Ñ䃑;䎝܀Eacdfgmoprstuvලෂ෉෕ෛ෠෧෼ขภยา฿ไlig;䅒cute耻Ó䃓Āiy෎ීrc耻Ô䃔;䐞blac;䅐r;쀀𝔒rave耻Ò䃒ƀaei෮ෲ෶cr;䅌ga;䎩cron;䎟pf;쀀𝕆enCurlyĀDQฎบoubleQuote;怜uote;怘;橔Āclวฬr;쀀𝒪ash耻Ø䃘iŬื฼de耻Õ䃕es;樷ml耻Ö䃖erĀBP๋๠Āar๐๓r;怾acĀek๚๜;揞et;掴arenthesis;揜Ҁacfhilors๿ງຊຏຒດຝະ໼rtialD;戂y;䐟r;쀀𝔓i;䎦;䎠usMinus;䂱Āipຢອncareplanåڝf;愙Ȁ;eio຺ູ໠໤檻cedesȀ;EST່້໏໚扺qual;檯lantEqual;扼ilde;找me;怳Ādp໩໮uct;戏ortionĀ;aȥ໹l;戝Āci༁༆r;쀀𝒫;䎨ȀUfos༑༖༛༟OT耻"䀢r;쀀𝔔pf;愚cr;쀀𝒬؀BEacefhiorsu༾གྷཇའཱིྦྷྪྭ႖ႩႴႾarr;椐G耻®䂮ƀcnrཎནབute;䅔g;柫rĀ;tཛྷཝ憠l;椖ƀaeyཧཬཱron;䅘dil;䅖;䐠Ā;vླྀཹ愜erseĀEUྂྙĀlq྇ྎement;戋uilibrium;懋pEquilibrium;楯r»ཹo;䎡ghtЀACDFTUVa࿁࿫࿳ဢဨၛႇϘĀnr࿆࿒gleBracket;柩rowƀ;BL࿜࿝࿡憒ar;懥eftArrow;懄eiling;按oǵ࿹\0စbleBracket;柧nǔည\0နeeVector;楝ectorĀ;Bဝသ懂ar;楕loor;挋Āerိ၃eƀ;AVဵံြ抢rrow;憦ector;楛iangleƀ;BEၐၑၕ抳ar;槐qual;抵pƀDTVၣၮၸownVector;楏eeVector;楜ectorĀ;Bႂႃ憾ar;楔ectorĀ;B႑႒懀ar;楓Āpuႛ႞f;愝ndImplies;楰ightarrow;懛ĀchႹႼr;愛;憱leDelayed;槴ڀHOacfhimoqstuფჱჷჽᄙᄞᅑᅖᅡᅧᆵᆻᆿĀCcჩხHcy;䐩y;䐨FTcy;䐬cute;䅚ʀ;aeiyᄈᄉᄎᄓᄗ檼ron;䅠dil;䅞rc;䅜;䐡r;쀀𝔖ortȀDLRUᄪᄴᄾᅉownArrow»ОeftArrow»࢚ightArrow»࿝pArrow;憑gma;䎣allCircle;战pf;쀀𝕊ɲᅭ\0\0ᅰt;戚areȀ;ISUᅻᅼᆉᆯ斡ntersection;抓uĀbpᆏᆞsetĀ;Eᆗᆘ抏qual;抑ersetĀ;Eᆨᆩ抐qual;抒nion;抔cr;쀀𝒮ar;拆ȀbcmpᇈᇛሉላĀ;sᇍᇎ拐etĀ;Eᇍᇕqual;抆ĀchᇠህeedsȀ;ESTᇭᇮᇴᇿ扻qual;檰lantEqual;扽ilde;承Tháྌ;我ƀ;esሒሓሣ拑rsetĀ;Eሜም抃qual;抇et»ሓրHRSacfhiorsሾቄ቉ቕ቞ቱቶኟዂወዑORN耻Þ䃞ADE;愢ĀHc቎ቒcy;䐋y;䐦Ābuቚቜ;䀉;䎤ƀaeyብቪቯron;䅤dil;䅢;䐢r;쀀𝔗Āeiቻ኉ǲኀ\0ኇefore;戴a;䎘Ācn኎ኘkSpace;쀀  Space;怉ldeȀ;EFTካኬኲኼ戼qual;扃ullEqual;扅ilde;扈pf;쀀𝕋ipleDot;惛Āctዖዛr;쀀𝒯rok;䅦ૡዷጎጚጦ\0ጬጱ\0\0\0\0\0ጸጽ፷ᎅ\0᏿ᐄᐊᐐĀcrዻጁute耻Ú䃚rĀ;oጇገ憟cir;楉rǣጓ\0጖y;䐎ve;䅬Āiyጞጣrc耻Û䃛;䐣blac;䅰r;쀀𝔘rave耻Ù䃙acr;䅪Ādiፁ፩erĀBPፈ፝Āarፍፐr;䁟acĀekፗፙ;揟et;掵arenthesis;揝onĀ;P፰፱拃lus;抎Āgp፻፿on;䅲f;쀀𝕌ЀADETadps᎕ᎮᎸᏄϨᏒᏗᏳrrowƀ;BDᅐᎠᎤar;椒ownArrow;懅ownArrow;憕quilibrium;楮eeĀ;AᏋᏌ报rrow;憥ownáϳerĀLRᏞᏨeftArrow;憖ightArrow;憗iĀ;lᏹᏺ䏒on;䎥ing;䅮cr;쀀𝒰ilde;䅨ml耻Ü䃜ҀDbcdefosvᐧᐬᐰᐳᐾᒅᒊᒐᒖash;披ar;櫫y;䐒ashĀ;lᐻᐼ抩;櫦Āerᑃᑅ;拁ƀbtyᑌᑐᑺar;怖Ā;iᑏᑕcalȀBLSTᑡᑥᑪᑴar;戣ine;䁼eparator;杘ilde;所ThinSpace;怊r;쀀𝔙pf;쀀𝕍cr;쀀𝒱dash;抪ʀcefosᒧᒬᒱᒶᒼirc;䅴dge;拀r;쀀𝔚pf;쀀𝕎cr;쀀𝒲Ȁfiosᓋᓐᓒᓘr;쀀𝔛;䎞pf;쀀𝕏cr;쀀𝒳ҀAIUacfosuᓱᓵᓹᓽᔄᔏᔔᔚᔠcy;䐯cy;䐇cy;䐮cute耻Ý䃝Āiyᔉᔍrc;䅶;䐫r;쀀𝔜pf;쀀𝕐cr;쀀𝒴ml;䅸ЀHacdefosᔵᔹᔿᕋᕏᕝᕠᕤcy;䐖cute;䅹Āayᕄᕉron;䅽;䐗ot;䅻ǲᕔ\0ᕛoWidtè૙a;䎖r;愨pf;愤cr;쀀𝒵௡ᖃᖊᖐ\0ᖰᖶᖿ\0\0\0\0ᗆᗛᗫᙟ᙭\0ᚕ᚛ᚲᚹ\0ᚾcute耻á䃡reve;䄃̀;Ediuyᖜᖝᖡᖣᖨᖭ戾;쀀∾̳;房rc耻â䃢te肻´̆;䐰lig耻æ䃦Ā;r²ᖺ;쀀𝔞rave耻à䃠ĀepᗊᗖĀfpᗏᗔsym;愵èᗓha;䎱ĀapᗟcĀclᗤᗧr;䄁g;樿ɤᗰ\0\0ᘊʀ;adsvᗺᗻᗿᘁᘇ戧nd;橕;橜lope;橘;橚΀;elmrszᘘᘙᘛᘞᘿᙏᙙ戠;榤e»ᘙsdĀ;aᘥᘦ戡ѡᘰᘲᘴᘶᘸᘺᘼᘾ;榨;榩;榪;榫;榬;榭;榮;榯tĀ;vᙅᙆ戟bĀ;dᙌᙍ抾;榝Āptᙔᙗh;戢»¹arr;捼Āgpᙣᙧon;䄅f;쀀𝕒΀;Eaeiop዁ᙻᙽᚂᚄᚇᚊ;橰cir;橯;扊d;手s;䀧roxĀ;e዁ᚒñᚃing耻å䃥ƀctyᚡᚦᚨr;쀀𝒶;䀪mpĀ;e዁ᚯñʈilde耻ã䃣ml耻ä䃤Āciᛂᛈoninôɲnt;樑ࠀNabcdefiklnoprsu᛭ᛱᜰ᜼ᝃᝈ᝸᝽០៦ᠹᡐᜍ᤽᥈ᥰot;櫭Ācrᛶ᜞kȀcepsᜀᜅᜍᜓong;扌psilon;䏶rime;怵imĀ;e᜚᜛戽q;拍Ŷᜢᜦee;抽edĀ;gᜬᜭ挅e»ᜭrkĀ;t፜᜷brk;掶Āoyᜁᝁ;䐱quo;怞ʀcmprtᝓ᝛ᝡᝤᝨausĀ;eĊĉptyv;榰séᜌnoõēƀahwᝯ᝱ᝳ;䎲;愶een;扬r;쀀𝔟g΀costuvwឍឝឳេ៕៛៞ƀaiuបពរðݠrc;旯p»፱ƀdptឤឨឭot;樀lus;樁imes;樂ɱឹ\0\0ើcup;樆ar;昅riangleĀdu៍្own;施p;斳plus;樄eåᑄåᒭarow;植ƀako៭ᠦᠵĀcn៲ᠣkƀlst៺֫᠂ozenge;槫riangleȀ;dlr᠒᠓᠘᠝斴own;斾eft;旂ight;斸k;搣Ʊᠫ\0ᠳƲᠯ\0ᠱ;斒;斑4;斓ck;斈ĀeoᠾᡍĀ;qᡃᡆ쀀=⃥uiv;쀀≡⃥t;挐Ȁptwxᡙᡞᡧᡬf;쀀𝕓Ā;tᏋᡣom»Ꮜtie;拈؀DHUVbdhmptuvᢅᢖᢪᢻᣗᣛᣬ᣿ᤅᤊᤐᤡȀLRlrᢎᢐᢒᢔ;敗;敔;敖;敓ʀ;DUduᢡᢢᢤᢦᢨ敐;敦;敩;敤;敧ȀLRlrᢳᢵᢷᢹ;敝;敚;敜;教΀;HLRhlrᣊᣋᣍᣏᣑᣓᣕ救;敬;散;敠;敫;敢;敟ox;槉ȀLRlrᣤᣦᣨᣪ;敕;敒;攐;攌ʀ;DUduڽ᣷᣹᣻᣽;敥;敨;攬;攴inus;抟lus;択imes;抠ȀLRlrᤙᤛᤝ᤟;敛;敘;攘;攔΀;HLRhlrᤰᤱᤳᤵᤷ᤻᤹攂;敪;敡;敞;攼;攤;攜Āevģ᥂bar耻¦䂦Ȁceioᥑᥖᥚᥠr;쀀𝒷mi;恏mĀ;e᜚᜜lƀ;bhᥨᥩᥫ䁜;槅sub;柈Ŭᥴ᥾lĀ;e᥹᥺怢t»᥺pƀ;Eeįᦅᦇ;檮Ā;qۜۛೡᦧ\0᧨ᨑᨕᨲ\0ᨷᩐ\0\0᪴\0\0᫁\0\0ᬡᬮ᭍᭒\0᯽\0ᰌƀcpr᦭ᦲ᧝ute;䄇̀;abcdsᦿᧀᧄ᧊᧕᧙戩nd;橄rcup;橉Āau᧏᧒p;橋p;橇ot;橀;쀀∩︀Āeo᧢᧥t;恁îړȀaeiu᧰᧻ᨁᨅǰ᧵\0᧸s;橍on;䄍dil耻ç䃧rc;䄉psĀ;sᨌᨍ橌m;橐ot;䄋ƀdmnᨛᨠᨦil肻¸ƭptyv;榲t脀¢;eᨭᨮ䂢räƲr;쀀𝔠ƀceiᨽᩀᩍy;䑇ckĀ;mᩇᩈ朓ark»ᩈ;䏇r΀;Ecefms᩟᩠ᩢᩫ᪤᪪᪮旋;槃ƀ;elᩩᩪᩭ䋆q;扗eɡᩴ\0\0᪈rrowĀlr᩼᪁eft;憺ight;憻ʀRSacd᪒᪔᪖᪚᪟»ཇ;擈st;抛irc;抚ash;抝nint;樐id;櫯cir;槂ubsĀ;u᪻᪼晣it»᪼ˬ᫇᫔᫺\0ᬊonĀ;eᫍᫎ䀺Ā;qÇÆɭ᫙\0\0᫢aĀ;t᫞᫟䀬;䁀ƀ;fl᫨᫩᫫戁îᅠeĀmx᫱᫶ent»᫩eóɍǧ᫾\0ᬇĀ;dኻᬂot;橭nôɆƀfryᬐᬔᬗ;쀀𝕔oäɔ脀©;sŕᬝr;愗Āaoᬥᬩrr;憵ss;朗Ācuᬲᬷr;쀀𝒸Ābpᬼ᭄Ā;eᭁᭂ櫏;櫑Ā;eᭉᭊ櫐;櫒dot;拯΀delprvw᭠᭬᭷ᮂᮬᯔ᯹arrĀlr᭨᭪;椸;椵ɰ᭲\0\0᭵r;拞c;拟arrĀ;p᭿ᮀ憶;椽̀;bcdosᮏᮐᮖᮡᮥᮨ截rcap;橈Āauᮛᮞp;橆p;橊ot;抍r;橅;쀀∪︀Ȁalrv᮵ᮿᯞᯣrrĀ;mᮼᮽ憷;椼yƀevwᯇᯔᯘqɰᯎ\0\0ᯒreã᭳uã᭵ee;拎edge;拏en耻¤䂤earrowĀlrᯮ᯳eft»ᮀight»ᮽeäᯝĀciᰁᰇoninôǷnt;戱lcty;挭ঀAHabcdefhijlorstuwz᰸᰻᰿ᱝᱩᱵᲊᲞᲬᲷ᳻᳿ᴍᵻᶑᶫᶻ᷆᷍rò΁ar;楥Ȁglrs᱈ᱍ᱒᱔ger;怠eth;愸òᄳhĀ;vᱚᱛ怐»ऊūᱡᱧarow;椏aã̕Āayᱮᱳron;䄏;䐴ƀ;ao̲ᱼᲄĀgrʿᲁr;懊tseq;橷ƀglmᲑᲔᲘ耻°䂰ta;䎴ptyv;榱ĀirᲣᲨsht;楿;쀀𝔡arĀlrᲳᲵ»ࣜ»သʀaegsv᳂͸᳖᳜᳠mƀ;oș᳊᳔ndĀ;ș᳑uit;晦amma;䏝in;拲ƀ;io᳧᳨᳸䃷de脀÷;o᳧ᳰntimes;拇nø᳷cy;䑒cɯᴆ\0\0ᴊrn;挞op;挍ʀlptuwᴘᴝᴢᵉᵕlar;䀤f;쀀𝕕ʀ;emps̋ᴭᴷᴽᵂqĀ;d͒ᴳot;扑inus;戸lus;戔quare;抡blebarwedgåúnƀadhᄮᵝᵧownarrowóᲃarpoonĀlrᵲᵶefôᲴighôᲶŢᵿᶅkaro÷གɯᶊ\0\0ᶎrn;挟op;挌ƀcotᶘᶣᶦĀryᶝᶡ;쀀𝒹;䑕l;槶rok;䄑Ādrᶰᶴot;拱iĀ;fᶺ᠖斿Āah᷀᷃ròЩaòྦangle;榦Āci᷒ᷕy;䑟grarr;柿ऀDacdefglmnopqrstuxḁḉḙḸոḼṉṡṾấắẽỡἪἷὄ὎὚ĀDoḆᴴoôᲉĀcsḎḔute耻é䃩ter;橮ȀaioyḢḧḱḶron;䄛rĀ;cḭḮ扖耻ê䃪lon;払;䑍ot;䄗ĀDrṁṅot;扒;쀀𝔢ƀ;rsṐṑṗ檚ave耻è䃨Ā;dṜṝ檖ot;檘Ȁ;ilsṪṫṲṴ檙nters;揧;愓Ā;dṹṺ檕ot;檗ƀapsẅẉẗcr;䄓tyƀ;svẒẓẕ戅et»ẓpĀ1;ẝẤĳạả;怄;怅怃ĀgsẪẬ;䅋p;怂ĀgpẴẸon;䄙f;쀀𝕖ƀalsỄỎỒrĀ;sỊị拕l;槣us;橱iƀ;lvỚớở䎵on»ớ;䏵ȀcsuvỪỳἋἣĀioữḱrc»Ḯɩỹ\0\0ỻíՈantĀglἂἆtr»ṝess»Ṻƀaeiἒ἖Ἒls;䀽st;扟vĀ;DȵἠD;橸parsl;槥ĀDaἯἳot;打rr;楱ƀcdiἾὁỸr;愯oô͒ĀahὉὋ;䎷耻ð䃰Āmrὓὗl耻ë䃫o;悬ƀcipὡὤὧl;䀡sôծĀeoὬὴctatioîՙnentialåչৡᾒ\0ᾞ\0ᾡᾧ\0\0ῆῌ\0ΐ\0ῦῪ \0 ⁚llingdotseñṄy;䑄male;晀ƀilrᾭᾳ῁lig;耀ﬃɩᾹ\0\0᾽g;耀ﬀig;耀ﬄ;쀀𝔣lig;耀ﬁlig;쀀fjƀaltῙ῜ῡt;晭ig;耀ﬂns;斱of;䆒ǰ΅\0ῳf;쀀𝕗ĀakֿῷĀ;vῼ´拔;櫙artint;樍Āao‌⁕Ācs‑⁒α‚‰‸⁅⁈\0⁐β•‥‧‪‬\0‮耻½䂽;慓耻¼䂼;慕;慙;慛Ƴ‴\0‶;慔;慖ʴ‾⁁\0\0⁃耻¾䂾;慗;慜5;慘ƶ⁌\0⁎;慚;慝8;慞l;恄wn;挢cr;쀀𝒻ࢀEabcdefgijlnorstv₂₉₟₥₰₴⃰⃵⃺⃿℃ℒℸ̗ℾ⅒↞Ā;lٍ₇;檌ƀcmpₐₕ₝ute;䇵maĀ;dₜ᳚䎳;檆reve;䄟Āiy₪₮rc;䄝;䐳ot;䄡Ȁ;lqsؾق₽⃉ƀ;qsؾٌ⃄lanô٥Ȁ;cdl٥⃒⃥⃕c;檩otĀ;o⃜⃝檀Ā;l⃢⃣檂;檄Ā;e⃪⃭쀀⋛︀s;檔r;쀀𝔤Ā;gٳ؛mel;愷cy;䑓Ȁ;Eajٚℌℎℐ;檒;檥;檤ȀEaesℛℝ℩ℴ;扩pĀ;p℣ℤ檊rox»ℤĀ;q℮ℯ檈Ā;q℮ℛim;拧pf;쀀𝕘Āci⅃ⅆr;愊mƀ;el٫ⅎ⅐;檎;檐茀>;cdlqr׮ⅠⅪⅮⅳⅹĀciⅥⅧ;檧r;橺ot;拗Par;榕uest;橼ʀadelsↄⅪ←ٖ↛ǰ↉\0↎proø₞r;楸qĀlqؿ↖lesó₈ií٫Āen↣↭rtneqq;쀀≩︀Å↪ԀAabcefkosy⇄⇇⇱⇵⇺∘∝∯≨≽ròΠȀilmr⇐⇔⇗⇛rsðᒄf»․ilôکĀdr⇠⇤cy;䑊ƀ;cwࣴ⇫⇯ir;楈;憭ar;意irc;䄥ƀalr∁∎∓rtsĀ;u∉∊晥it»∊lip;怦con;抹r;쀀𝔥sĀew∣∩arow;椥arow;椦ʀamopr∺∾≃≞≣rr;懿tht;戻kĀlr≉≓eftarrow;憩ightarrow;憪f;쀀𝕙bar;怕ƀclt≯≴≸r;쀀𝒽asè⇴rok;䄧Ābp⊂⊇ull;恃hen»ᱛૡ⊣\0⊪\0⊸⋅⋎\0⋕⋳\0\0⋸⌢⍧⍢⍿\0⎆⎪⎴cute耻í䃭ƀ;iyݱ⊰⊵rc耻î䃮;䐸Ācx⊼⊿y;䐵cl耻¡䂡ĀfrΟ⋉;쀀𝔦rave耻ì䃬Ȁ;inoܾ⋝⋩⋮Āin⋢⋦nt;樌t;戭fin;槜ta;愩lig;䄳ƀaop⋾⌚⌝ƀcgt⌅⌈⌗r;䄫ƀelpܟ⌏⌓inåގarôܠh;䄱f;抷ed;䆵ʀ;cfotӴ⌬⌱⌽⍁are;愅inĀ;t⌸⌹戞ie;槝doô⌙ʀ;celpݗ⍌⍐⍛⍡al;抺Āgr⍕⍙eróᕣã⍍arhk;樗rod;樼Ȁcgpt⍯⍲⍶⍻y;䑑on;䄯f;쀀𝕚a;䎹uest耻¿䂿Āci⎊⎏r;쀀𝒾nʀ;EdsvӴ⎛⎝⎡ӳ;拹ot;拵Ā;v⎦⎧拴;拳Ā;iݷ⎮lde;䄩ǫ⎸\0⎼cy;䑖l耻ï䃯̀cfmosu⏌⏗⏜⏡⏧⏵Āiy⏑⏕rc;䄵;䐹r;쀀𝔧ath;䈷pf;쀀𝕛ǣ⏬\0⏱r;쀀𝒿rcy;䑘kcy;䑔Ѐacfghjos␋␖␢␧␭␱␵␻ppaĀ;v␓␔䎺;䏰Āey␛␠dil;䄷;䐺r;쀀𝔨reen;䄸cy;䑅cy;䑜pf;쀀𝕜cr;쀀𝓀஀ABEHabcdefghjlmnoprstuv⑰⒁⒆⒍⒑┎┽╚▀♎♞♥♹♽⚚⚲⛘❝❨➋⟀⠁⠒ƀart⑷⑺⑼rò৆òΕail;椛arr;椎Ā;gঔ⒋;檋ar;楢ॣ⒥\0⒪\0⒱\0\0\0\0\0⒵Ⓔ\0ⓆⓈⓍ\0⓹ute;䄺mptyv;榴raîࡌbda;䎻gƀ;dlࢎⓁⓃ;榑åࢎ;檅uo耻«䂫rЀ;bfhlpst࢙ⓞⓦⓩ⓫⓮⓱⓵Ā;f࢝ⓣs;椟s;椝ë≒p;憫l;椹im;楳l;憢ƀ;ae⓿─┄檫il;椙Ā;s┉┊檭;쀀⪭︀ƀabr┕┙┝rr;椌rk;杲Āak┢┬cĀek┨┪;䁻;䁛Āes┱┳;榋lĀdu┹┻;榏;榍Ȁaeuy╆╋╖╘ron;䄾Ādi═╔il;䄼ìࢰâ┩;䐻Ȁcqrs╣╦╭╽a;椶uoĀ;rนᝆĀdu╲╷har;楧shar;楋h;憲ʀ;fgqs▋▌উ◳◿扤tʀahlrt▘▤▷◂◨rrowĀ;t࢙□aé⓶arpoonĀdu▯▴own»њp»०eftarrows;懇ightƀahs◍◖◞rrowĀ;sࣴࢧarpoonó྘quigarro÷⇰hreetimes;拋ƀ;qs▋ও◺lanôবʀ;cdgsব☊☍☝☨c;檨otĀ;o☔☕橿Ā;r☚☛檁;檃Ā;e☢☥쀀⋚︀s;檓ʀadegs☳☹☽♉♋pproøⓆot;拖qĀgq♃♅ôউgtò⒌ôছiíলƀilr♕࣡♚sht;楼;쀀𝔩Ā;Eজ♣;檑š♩♶rĀdu▲♮Ā;l॥♳;楪lk;斄cy;䑙ʀ;achtੈ⚈⚋⚑⚖rò◁orneòᴈard;楫ri;旺Āio⚟⚤dot;䅀ustĀ;a⚬⚭掰che»⚭ȀEaes⚻⚽⛉⛔;扨pĀ;p⛃⛄檉rox»⛄Ā;q⛎⛏檇Ā;q⛎⚻im;拦Ѐabnoptwz⛩⛴⛷✚✯❁❇❐Ānr⛮⛱g;柬r;懽rëࣁgƀlmr⛿✍✔eftĀar০✇ightá৲apsto;柼ightá৽parrowĀlr✥✩efô⓭ight;憬ƀafl✶✹✽r;榅;쀀𝕝us;樭imes;樴š❋❏st;戗áፎƀ;ef❗❘᠀旊nge»❘arĀ;l❤❥䀨t;榓ʀachmt❳❶❼➅➇ròࢨorneòᶌarĀ;d྘➃;業;怎ri;抿̀achiqt➘➝ੀ➢➮➻quo;怹r;쀀𝓁mƀ;egল➪➬;檍;檏Ābu┪➳oĀ;rฟ➹;怚rok;䅂萀<;cdhilqrࠫ⟒☹⟜⟠⟥⟪⟰Āci⟗⟙;檦r;橹reå◲mes;拉arr;楶uest;橻ĀPi⟵⟹ar;榖ƀ;ef⠀भ᠛旃rĀdu⠇⠍shar;楊har;楦Āen⠗⠡rtneqq;쀀≨︀Å⠞܀Dacdefhilnopsu⡀⡅⢂⢎⢓⢠⢥⢨⣚⣢⣤ઃ⣳⤂Dot;戺Ȁclpr⡎⡒⡣⡽r耻¯䂯Āet⡗⡙;時Ā;e⡞⡟朠se»⡟Ā;sျ⡨toȀ;dluျ⡳⡷⡻owîҌefôएðᏑker;斮Āoy⢇⢌mma;権;䐼ash;怔asuredangle»ᘦr;쀀𝔪o;愧ƀcdn⢯⢴⣉ro耻µ䂵Ȁ;acdᑤ⢽⣀⣄sôᚧir;櫰ot肻·Ƶusƀ;bd⣒ᤃ⣓戒Ā;uᴼ⣘;横ţ⣞⣡p;櫛ò−ðઁĀdp⣩⣮els;抧f;쀀𝕞Āct⣸⣽r;쀀𝓂pos»ᖝƀ;lm⤉⤊⤍䎼timap;抸ఀGLRVabcdefghijlmoprstuvw⥂⥓⥾⦉⦘⧚⧩⨕⨚⩘⩝⪃⪕⪤⪨⬄⬇⭄⭿⮮ⰴⱧⱼ⳩Āgt⥇⥋;쀀⋙̸Ā;v⥐௏쀀≫⃒ƀelt⥚⥲⥶ftĀar⥡⥧rrow;懍ightarrow;懎;쀀⋘̸Ā;v⥻ే쀀≪⃒ightarrow;懏ĀDd⦎⦓ash;抯ash;抮ʀbcnpt⦣⦧⦬⦱⧌la»˞ute;䅄g;쀀∠⃒ʀ;Eiop඄⦼⧀⧅⧈;쀀⩰̸d;쀀≋̸s;䅉roø඄urĀ;a⧓⧔普lĀ;s⧓ସǳ⧟\0⧣p肻 ଷmpĀ;e௹ఀʀaeouy⧴⧾⨃⨐⨓ǰ⧹\0⧻;橃on;䅈dil;䅆ngĀ;dൾ⨊ot;쀀⩭̸p;橂;䐽ash;怓΀;Aadqsxஒ⨩⨭⨻⩁⩅⩐rr;懗rĀhr⨳⨶k;椤Ā;oᏲᏰot;쀀≐̸uiöୣĀei⩊⩎ar;椨í஘istĀ;s஠டr;쀀𝔫ȀEest௅⩦⩹⩼ƀ;qs஼⩭௡ƀ;qs஼௅⩴lanô௢ií௪Ā;rஶ⪁»ஷƀAap⪊⪍⪑rò⥱rr;憮ar;櫲ƀ;svྍ⪜ྌĀ;d⪡⪢拼;拺cy;䑚΀AEadest⪷⪺⪾⫂⫅⫶⫹rò⥦;쀀≦̸rr;憚r;急Ȁ;fqs఻⫎⫣⫯tĀar⫔⫙rro÷⫁ightarro÷⪐ƀ;qs఻⪺⫪lanôౕĀ;sౕ⫴»శiíౝĀ;rవ⫾iĀ;eచథiäඐĀpt⬌⬑f;쀀𝕟膀¬;in⬙⬚⬶䂬nȀ;Edvஉ⬤⬨⬮;쀀⋹̸ot;쀀⋵̸ǡஉ⬳⬵;拷;拶iĀ;vಸ⬼ǡಸ⭁⭃;拾;拽ƀaor⭋⭣⭩rȀ;ast୻⭕⭚⭟lleì୻l;쀀⫽⃥;쀀∂̸lint;樔ƀ;ceಒ⭰⭳uåಥĀ;cಘ⭸Ā;eಒ⭽ñಘȀAait⮈⮋⮝⮧rò⦈rrƀ;cw⮔⮕⮙憛;쀀⤳̸;쀀↝̸ghtarrow»⮕riĀ;eೋೖ΀chimpqu⮽⯍⯙⬄୸⯤⯯Ȁ;cerല⯆ഷ⯉uå൅;쀀𝓃ortɭ⬅\0\0⯖ará⭖mĀ;e൮⯟Ā;q൴൳suĀbp⯫⯭å೸åഋƀbcp⯶ⰑⰙȀ;Ees⯿ⰀഢⰄ抄;쀀⫅̸etĀ;eഛⰋqĀ;qണⰀcĀ;eലⰗñസȀ;EesⰢⰣൟⰧ抅;쀀⫆̸etĀ;e൘ⰮqĀ;qൠⰣȀgilrⰽⰿⱅⱇìௗlde耻ñ䃱çృiangleĀlrⱒⱜeftĀ;eచⱚñదightĀ;eೋⱥñ೗Ā;mⱬⱭ䎽ƀ;esⱴⱵⱹ䀣ro;愖p;怇ҀDHadgilrsⲏⲔⲙⲞⲣⲰⲶⳓⳣash;抭arr;椄p;쀀≍⃒ash;抬ĀetⲨⲬ;쀀≥⃒;쀀>⃒nfin;槞ƀAetⲽⳁⳅrr;椂;쀀≤⃒Ā;rⳊⳍ쀀<⃒ie;쀀⊴⃒ĀAtⳘⳜrr;椃rie;쀀⊵⃒im;쀀∼⃒ƀAan⳰⳴ⴂrr;懖rĀhr⳺⳽k;椣Ā;oᏧᏥear;椧ቓ᪕\0\0\0\0\0\0\0\0\0\0\0\0\0ⴭ\0ⴸⵈⵠⵥ⵲ⶄᬇ\0\0ⶍⶫ\0ⷈⷎ\0ⷜ⸙⸫⸾⹃Ācsⴱ᪗ute耻ó䃳ĀiyⴼⵅrĀ;c᪞ⵂ耻ô䃴;䐾ʀabios᪠ⵒⵗǈⵚlac;䅑v;樸old;榼lig;䅓Ācr⵩⵭ir;榿;쀀𝔬ͯ⵹\0\0⵼\0ⶂn;䋛ave耻ò䃲;槁Ābmⶈ෴ar;榵Ȁacitⶕ⶘ⶥⶨrò᪀Āir⶝ⶠr;榾oss;榻nå๒;槀ƀaeiⶱⶵⶹcr;䅍ga;䏉ƀcdnⷀⷅǍron;䎿;榶pf;쀀𝕠ƀaelⷔ⷗ǒr;榷rp;榹΀;adiosvⷪⷫⷮ⸈⸍⸐⸖戨rò᪆Ȁ;efmⷷⷸ⸂⸅橝rĀ;oⷾⷿ愴f»ⷿ耻ª䂪耻º䂺gof;抶r;橖lope;橗;橛ƀclo⸟⸡⸧ò⸁ash耻ø䃸l;折iŬⸯ⸴de耻õ䃵esĀ;aǛ⸺s;樶ml耻ö䃶bar;挽ૡ⹞\0⹽\0⺀⺝\0⺢⺹\0\0⻋ຜ\0⼓\0\0⼫⾼\0⿈rȀ;astЃ⹧⹲຅脀¶;l⹭⹮䂶leìЃɩ⹸\0\0⹻m;櫳;櫽y;䐿rʀcimpt⺋⺏⺓ᡥ⺗nt;䀥od;䀮il;怰enk;怱r;쀀𝔭ƀimo⺨⺰⺴Ā;v⺭⺮䏆;䏕maô੶ne;明ƀ;tv⺿⻀⻈䏀chfork»´;䏖Āau⻏⻟nĀck⻕⻝kĀ;h⇴⻛;愎ö⇴sҀ;abcdemst⻳⻴ᤈ⻹⻽⼄⼆⼊⼎䀫cir;樣ir;樢Āouᵀ⼂;樥;橲n肻±ຝim;樦wo;樧ƀipu⼙⼠⼥ntint;樕f;쀀𝕡nd耻£䂣Ԁ;Eaceinosu່⼿⽁⽄⽇⾁⾉⾒⽾⾶;檳p;檷uå໙Ā;c໎⽌̀;acens່⽙⽟⽦⽨⽾pproø⽃urlyeñ໙ñ໎ƀaes⽯⽶⽺pprox;檹qq;檵im;拨iíໟmeĀ;s⾈ຮ怲ƀEas⽸⾐⽺ð⽵ƀdfp໬⾙⾯ƀals⾠⾥⾪lar;挮ine;挒urf;挓Ā;t໻⾴ï໻rel;抰Āci⿀⿅r;쀀𝓅;䏈ncsp;怈̀fiopsu⿚⋢⿟⿥⿫⿱r;쀀𝔮pf;쀀𝕢rime;恗cr;쀀𝓆ƀaeo⿸〉〓tĀei⿾々rnionóڰnt;樖stĀ;e【】䀿ñἙô༔઀ABHabcdefhilmnoprstux぀けさすムㄎㄫㅇㅢㅲㆎ㈆㈕㈤㈩㉘㉮㉲㊐㊰㊷ƀartぇおがròႳòϝail;検aròᱥar;楤΀cdenqrtとふへみわゔヌĀeuねぱ;쀀∽̱te;䅕iãᅮmptyv;榳gȀ;del࿑らるろ;榒;榥å࿑uo耻»䂻rր;abcfhlpstw࿜ガクシスゼゾダッデナp;極Ā;f࿠ゴs;椠;椳s;椞ë≝ð✮l;楅im;楴l;憣;憝Āaiパフil;椚oĀ;nホボ戶aló༞ƀabrョリヮrò៥rk;杳ĀakンヽcĀekヹ・;䁽;䁝Āes㄂㄄;榌lĀduㄊㄌ;榎;榐Ȁaeuyㄗㄜㄧㄩron;䅙Ādiㄡㄥil;䅗ì࿲âヺ;䑀Ȁclqsㄴㄷㄽㅄa;椷dhar;楩uoĀ;rȎȍh;憳ƀacgㅎㅟངlȀ;ipsླྀㅘㅛႜnåႻarôྩt;断ƀilrㅩဣㅮsht;楽;쀀𝔯ĀaoㅷㆆrĀduㅽㅿ»ѻĀ;l႑ㆄ;楬Ā;vㆋㆌ䏁;䏱ƀgns㆕ㇹㇼht̀ahlrstㆤㆰ㇂㇘㇤㇮rrowĀ;t࿜ㆭaéトarpoonĀduㆻㆿowîㅾp»႒eftĀah㇊㇐rrowó࿪arpoonóՑightarrows;應quigarro÷ニhreetimes;拌g;䋚ingdotseñἲƀahm㈍㈐㈓rò࿪aòՑ;怏oustĀ;a㈞㈟掱che»㈟mid;櫮Ȁabpt㈲㈽㉀㉒Ānr㈷㈺g;柭r;懾rëဃƀafl㉇㉊㉎r;榆;쀀𝕣us;樮imes;樵Āap㉝㉧rĀ;g㉣㉤䀩t;榔olint;樒arò㇣Ȁachq㉻㊀Ⴜ㊅quo;怺r;쀀𝓇Ābu・㊊oĀ;rȔȓƀhir㊗㊛㊠reåㇸmes;拊iȀ;efl㊪ၙᠡ㊫方tri;槎luhar;楨;愞ൡ㋕㋛㋟㌬㌸㍱\0㍺㎤\0\0㏬㏰\0㐨㑈㑚㒭㒱㓊㓱\0㘖\0\0㘳cute;䅛quï➺Ԁ;Eaceinpsyᇭ㋳㋵㋿㌂㌋㌏㌟㌦㌩;檴ǰ㋺\0㋼;檸on;䅡uåᇾĀ;dᇳ㌇il;䅟rc;䅝ƀEas㌖㌘㌛;檶p;檺im;择olint;樓iíሄ;䑁otƀ;be㌴ᵇ㌵担;橦΀Aacmstx㍆㍊㍗㍛㍞㍣㍭rr;懘rĀhr㍐㍒ë∨Ā;oਸ਼਴t耻§䂧i;䀻war;椩mĀin㍩ðnuóñt;朶rĀ;o㍶⁕쀀𝔰Ȁacoy㎂㎆㎑㎠rp;景Āhy㎋㎏cy;䑉;䑈rtɭ㎙\0\0㎜iäᑤaraì⹯耻­䂭Āgm㎨㎴maƀ;fv㎱㎲㎲䏃;䏂Ѐ;deglnprካ㏅㏉㏎㏖㏞㏡㏦ot;橪Ā;q኱ኰĀ;E㏓㏔檞;檠Ā;E㏛㏜檝;檟e;扆lus;樤arr;楲aròᄽȀaeit㏸㐈㐏㐗Āls㏽㐄lsetmé㍪hp;樳parsl;槤Ādlᑣ㐔e;挣Ā;e㐜㐝檪Ā;s㐢㐣檬;쀀⪬︀ƀflp㐮㐳㑂tcy;䑌Ā;b㐸㐹䀯Ā;a㐾㐿槄r;挿f;쀀𝕤aĀdr㑍ЂesĀ;u㑔㑕晠it»㑕ƀcsu㑠㑹㒟Āau㑥㑯pĀ;sᆈ㑫;쀀⊓︀pĀ;sᆴ㑵;쀀⊔︀uĀbp㑿㒏ƀ;esᆗᆜ㒆etĀ;eᆗ㒍ñᆝƀ;esᆨᆭ㒖etĀ;eᆨ㒝ñᆮƀ;afᅻ㒦ְrť㒫ֱ»ᅼaròᅈȀcemt㒹㒾㓂㓅r;쀀𝓈tmîñiì㐕aræᆾĀar㓎㓕rĀ;f㓔ឿ昆Āan㓚㓭ightĀep㓣㓪psiloîỠhé⺯s»⡒ʀbcmnp㓻㕞ሉ㖋㖎Ҁ;Edemnprs㔎㔏㔑㔕㔞㔣㔬㔱㔶抂;櫅ot;檽Ā;dᇚ㔚ot;櫃ult;櫁ĀEe㔨㔪;櫋;把lus;檿arr;楹ƀeiu㔽㕒㕕tƀ;en㔎㕅㕋qĀ;qᇚ㔏eqĀ;q㔫㔨m;櫇Ābp㕚㕜;櫕;櫓c̀;acensᇭ㕬㕲㕹㕻㌦pproø㋺urlyeñᇾñᇳƀaes㖂㖈㌛pproø㌚qñ㌗g;晪ڀ123;Edehlmnps㖩㖬㖯ሜ㖲㖴㗀㗉㗕㗚㗟㗨㗭耻¹䂹耻²䂲耻³䂳;櫆Āos㖹㖼t;檾ub;櫘Ā;dሢ㗅ot;櫄sĀou㗏㗒l;柉b;櫗arr;楻ult;櫂ĀEe㗤㗦;櫌;抋lus;櫀ƀeiu㗴㘉㘌tƀ;enሜ㗼㘂qĀ;qሢ㖲eqĀ;q㗧㗤m;櫈Ābp㘑㘓;櫔;櫖ƀAan㘜㘠㘭rr;懙rĀhr㘦㘨ë∮Ā;oਫ਩war;椪lig耻ß䃟௡㙑㙝㙠ዎ㙳㙹\0㙾㛂\0\0\0\0\0㛛㜃\0㜉㝬\0\0\0㞇ɲ㙖\0\0㙛get;挖;䏄rë๟ƀaey㙦㙫㙰ron;䅥dil;䅣;䑂lrec;挕r;쀀𝔱Ȁeiko㚆㚝㚵㚼ǲ㚋\0㚑eĀ4fኄኁaƀ;sv㚘㚙㚛䎸ym;䏑Ācn㚢㚲kĀas㚨㚮pproø዁im»ኬsðኞĀas㚺㚮ð዁rn耻þ䃾Ǭ̟㛆⋧es膀×;bd㛏㛐㛘䃗Ā;aᤏ㛕r;樱;樰ƀeps㛡㛣㜀á⩍Ȁ;bcf҆㛬㛰㛴ot;挶ir;櫱Ā;o㛹㛼쀀𝕥rk;櫚á㍢rime;怴ƀaip㜏㜒㝤dåቈ΀adempst㜡㝍㝀㝑㝗㝜㝟ngleʀ;dlqr㜰㜱㜶㝀㝂斵own»ᶻeftĀ;e⠀㜾ñम;扜ightĀ;e㊪㝋ñၚot;旬inus;樺lus;樹b;槍ime;樻ezium;揢ƀcht㝲㝽㞁Āry㝷㝻;쀀𝓉;䑆cy;䑛rok;䅧Āio㞋㞎xô᝷headĀlr㞗㞠eftarro÷ࡏightarrow»ཝऀAHabcdfghlmoprstuw㟐㟓㟗㟤㟰㟼㠎㠜㠣㠴㡑㡝㡫㢩㣌㣒㣪㣶ròϭar;楣Ācr㟜㟢ute耻ú䃺òᅐrǣ㟪\0㟭y;䑞ve;䅭Āiy㟵㟺rc耻û䃻;䑃ƀabh㠃㠆㠋ròᎭlac;䅱aòᏃĀir㠓㠘sht;楾;쀀𝔲rave耻ù䃹š㠧㠱rĀlr㠬㠮»ॗ»ႃlk;斀Āct㠹㡍ɯ㠿\0\0㡊rnĀ;e㡅㡆挜r»㡆op;挏ri;旸Āal㡖㡚cr;䅫肻¨͉Āgp㡢㡦on;䅳f;쀀𝕦̀adhlsuᅋ㡸㡽፲㢑㢠ownáᎳarpoonĀlr㢈㢌efô㠭ighô㠯iƀ;hl㢙㢚㢜䏅»ᏺon»㢚parrows;懈ƀcit㢰㣄㣈ɯ㢶\0\0㣁rnĀ;e㢼㢽挝r»㢽op;挎ng;䅯ri;旹cr;쀀𝓊ƀdir㣙㣝㣢ot;拰lde;䅩iĀ;f㜰㣨»᠓Āam㣯㣲rò㢨l耻ü䃼angle;榧ހABDacdeflnoprsz㤜㤟㤩㤭㦵㦸㦽㧟㧤㧨㧳㧹㧽㨁㨠ròϷarĀ;v㤦㤧櫨;櫩asèϡĀnr㤲㤷grt;榜΀eknprst㓣㥆㥋㥒㥝㥤㦖appá␕othinçẖƀhir㓫⻈㥙opô⾵Ā;hᎷ㥢ïㆍĀiu㥩㥭gmá㎳Ābp㥲㦄setneqĀ;q㥽㦀쀀⊊︀;쀀⫋︀setneqĀ;q㦏㦒쀀⊋︀;쀀⫌︀Āhr㦛㦟etá㚜iangleĀlr㦪㦯eft»थight»ၑy;䐲ash»ံƀelr㧄㧒㧗ƀ;beⷪ㧋㧏ar;抻q;扚lip;拮Ābt㧜ᑨaòᑩr;쀀𝔳tré㦮suĀbp㧯㧱»ജ»൙pf;쀀𝕧roð໻tré㦴Ācu㨆㨋r;쀀𝓋Ābp㨐㨘nĀEe㦀㨖»㥾nĀEe㦒㨞»㦐igzag;榚΀cefoprs㨶㨻㩖㩛㩔㩡㩪irc;䅵Ādi㩀㩑Ābg㩅㩉ar;機eĀ;qᗺ㩏;扙erp;愘r;쀀𝔴pf;쀀𝕨Ā;eᑹ㩦atèᑹcr;쀀𝓌ૣណ㪇\0㪋\0㪐㪛\0\0㪝㪨㪫㪯\0\0㫃㫎\0㫘ៜ៟tré៑r;쀀𝔵ĀAa㪔㪗ròσrò৶;䎾ĀAa㪡㪤ròθrò৫að✓is;拻ƀdptឤ㪵㪾Āfl㪺ឩ;쀀𝕩imåឲĀAa㫇㫊ròώròਁĀcq㫒ីr;쀀𝓍Āpt៖㫜ré។Ѐacefiosu㫰㫽㬈㬌㬑㬕㬛㬡cĀuy㫶㫻te耻ý䃽;䑏Āiy㬂㬆rc;䅷;䑋n耻¥䂥r;쀀𝔶cy;䑗pf;쀀𝕪cr;쀀𝓎Ācm㬦㬩y;䑎l耻ÿ䃿Ԁacdefhiosw㭂㭈㭔㭘㭤㭩㭭㭴㭺㮀cute;䅺Āay㭍㭒ron;䅾;䐷ot;䅼Āet㭝㭡træᕟa;䎶r;쀀𝔷cy;䐶grarr;懝pf;쀀𝕫cr;쀀𝓏Ājn㮅㮇;怍j;怌'.split("").map(e=>e.charCodeAt(0))),mr=new Uint16Array("Ȁaglq	\x1Bɭ\0\0p;䀦os;䀧t;䀾t;䀼uot;䀢".split("").map(e=>e.charCodeAt(0)));var $e;const gr=new Map([[0,65533],[128,8364],[130,8218],[131,402],[132,8222],[133,8230],[134,8224],[135,8225],[136,710],[137,8240],[138,352],[139,8249],[140,338],[142,381],[145,8216],[146,8217],[147,8220],[148,8221],[149,8226],[150,8211],[151,8212],[152,732],[153,8482],[154,353],[155,8250],[156,339],[158,382],[159,376]]),xr=($e=String.fromCodePoint)!==null&&$e!==void 0?$e:function(e){let n="";return e>65535&&(e-=65536,n+=String.fromCharCode(e>>>10&1023|55296),e=56320|e&1023),n+=String.fromCharCode(e),n};function _r(e){var n;return e>=55296&&e<=57343||e>1114111?65533:(n=gr.get(e))!==null&&n!==void 0?n:e}var D;(function(e){e[e.NUM=35]="NUM",e[e.SEMI=59]="SEMI",e[e.EQUALS=61]="EQUALS",e[e.ZERO=48]="ZERO",e[e.NINE=57]="NINE",e[e.LOWER_A=97]="LOWER_A",e[e.LOWER_F=102]="LOWER_F",e[e.LOWER_X=120]="LOWER_X",e[e.LOWER_Z=122]="LOWER_Z",e[e.UPPER_A=65]="UPPER_A",e[e.UPPER_F=70]="UPPER_F",e[e.UPPER_Z=90]="UPPER_Z"})(D||(D={}));const yr=32;var V;(function(e){e[e.VALUE_LENGTH=49152]="VALUE_LENGTH",e[e.BRANCH_LENGTH=16256]="BRANCH_LENGTH",e[e.JUMP_TABLE=127]="JUMP_TABLE"})(V||(V={}));function rn(e){return e>=D.ZERO&&e<=D.NINE}function kr(e){return e>=D.UPPER_A&&e<=D.UPPER_F||e>=D.LOWER_A&&e<=D.LOWER_F}function Cr(e){return e>=D.UPPER_A&&e<=D.UPPER_Z||e>=D.LOWER_A&&e<=D.LOWER_Z||rn(e)}function wr(e){return e===D.EQUALS||Cr(e)}var T;(function(e){e[e.EntityStart=0]="EntityStart",e[e.NumericStart=1]="NumericStart",e[e.NumericDecimal=2]="NumericDecimal",e[e.NumericHex=3]="NumericHex",e[e.NamedEntity=4]="NamedEntity"})(T||(T={}));var q;(function(e){e[e.Legacy=0]="Legacy",e[e.Strict=1]="Strict",e[e.Attribute=2]="Attribute"})(q||(q={}));class Sr{constructor(n,u,t){this.decodeTree=n,this.emitCodePoint=u,this.errors=t,this.state=T.EntityStart,this.consumed=1,this.result=0,this.treeIndex=0,this.excess=1,this.decodeMode=q.Strict}startEntity(n){this.decodeMode=n,this.state=T.EntityStart,this.result=0,this.treeIndex=0,this.excess=1,this.consumed=1}write(n,u){switch(this.state){case T.EntityStart:return n.charCodeAt(u)===D.NUM?(this.state=T.NumericStart,this.consumed+=1,this.stateNumericStart(n,u+1)):(this.state=T.NamedEntity,this.stateNamedEntity(n,u));case T.NumericStart:return this.stateNumericStart(n,u);case T.NumericDecimal:return this.stateNumericDecimal(n,u);case T.NumericHex:return this.stateNumericHex(n,u);case T.NamedEntity:return this.stateNamedEntity(n,u)}}stateNumericStart(n,u){return u>=n.length?-1:(n.charCodeAt(u)|yr)===D.LOWER_X?(this.state=T.NumericHex,this.consumed+=1,this.stateNumericHex(n,u+1)):(this.state=T.NumericDecimal,this.stateNumericDecimal(n,u))}addToNumericResult(n,u,t,r){if(u!==t){const o=t-u;this.result=this.result*Math.pow(r,o)+parseInt(n.substr(u,o),r),this.consumed+=o}}stateNumericHex(n,u){const t=u;for(;u<n.length;){const r=n.charCodeAt(u);if(rn(r)||kr(r))u+=1;else return this.addToNumericResult(n,t,u,16),this.emitNumericEntity(r,3)}return this.addToNumericResult(n,t,u,16),-1}stateNumericDecimal(n,u){const t=u;for(;u<n.length;){const r=n.charCodeAt(u);if(rn(r))u+=1;else return this.addToNumericResult(n,t,u,10),this.emitNumericEntity(r,2)}return this.addToNumericResult(n,t,u,10),-1}emitNumericEntity(n,u){var t;if(this.consumed<=u)return(t=this.errors)===null||t===void 0||t.absenceOfDigitsInNumericCharacterReference(this.consumed),0;if(n===D.SEMI)this.consumed+=1;else if(this.decodeMode===q.Strict)return 0;return this.emitCodePoint(_r(this.result),this.consumed),this.errors&&(n!==D.SEMI&&this.errors.missingSemicolonAfterCharacterReference(),this.errors.validateNumericCharacterReference(this.result)),this.consumed}stateNamedEntity(n,u){const{decodeTree:t}=this;let r=t[this.treeIndex],o=(r&V.VALUE_LENGTH)>>14;for(;u<n.length;u++,this.excess++){const i=n.charCodeAt(u);if(this.treeIndex=vr(t,r,this.treeIndex+Math.max(1,o),i),this.treeIndex<0)return this.result===0||this.decodeMode===q.Attribute&&(o===0||wr(i))?0:this.emitNotTerminatedNamedEntity();if(r=t[this.treeIndex],o=(r&V.VALUE_LENGTH)>>14,o!==0){if(i===D.SEMI)return this.emitNamedEntityData(this.treeIndex,o,this.consumed+this.excess);this.decodeMode!==q.Strict&&(this.result=this.treeIndex,this.consumed+=this.excess,this.excess=0)}}return-1}emitNotTerminatedNamedEntity(){var n;const{result:u,decodeTree:t}=this,r=(t[u]&V.VALUE_LENGTH)>>14;return this.emitNamedEntityData(u,r,this.consumed),(n=this.errors)===null||n===void 0||n.missingSemicolonAfterCharacterReference(),this.consumed}emitNamedEntityData(n,u,t){const{decodeTree:r}=this;return this.emitCodePoint(u===1?r[n]&~V.VALUE_LENGTH:r[n+1],t),u===3&&this.emitCodePoint(r[n+2],t),t}end(){var n;switch(this.state){case T.NamedEntity:return this.result!==0&&(this.decodeMode!==q.Attribute||this.result===this.treeIndex)?this.emitNotTerminatedNamedEntity():0;case T.NumericDecimal:return this.emitNumericEntity(0,2);case T.NumericHex:return this.emitNumericEntity(0,3);case T.NumericStart:return(n=this.errors)===null||n===void 0||n.absenceOfDigitsInNumericCharacterReference(this.consumed),0;case T.EntityStart:return 0}}}function du(e){let n="";const u=new Sr(e,t=>n+=xr(t));return function(r,o){let i=0,a=0;for(;(a=r.indexOf("&",a))>=0;){n+=r.slice(i,a),u.startEntity(o);const c=u.write(r,a+1);if(c<0){i=a+u.end();break}i=a+c,a=c===0?i+1:i}const s=n+r.slice(i);return n="",s}}function vr(e,n,u,t){const r=(n&V.BRANCH_LENGTH)>>7,o=n&V.JUMP_TABLE;if(r===0)return o!==0&&t===o?u:-1;if(o){const s=t-o;return s<0||s>=r?-1:e[u+s]-1}let i=u,a=i+r-1;for(;i<=a;){const s=i+a>>>1,c=e[s];if(c<t)i=s+1;else if(c>t)a=s-1;else return e[s+r]}return-1}const fu=du(br);du(mr);function Tr(e,n=q.Legacy){return fu(e,n)}function Rr(e){return fu(e,q.Strict)}function Dr(e){return Object.prototype.toString.call(e)}function pn(e){return Dr(e)==="[object String]"}const Er=Object.prototype.hasOwnProperty;function Pr(e,n){return Er.call(e,n)}function Oe(e){return Array.prototype.slice.call(arguments,1).forEach(function(u){if(u){if(typeof u!="object")throw new TypeError(u+"must be object");Object.keys(u).forEach(function(t){e[t]=u[t]})}}),e}function pu(e,n,u){return[].concat(e.slice(0,n),u,e.slice(n+1))}function hn(e){return!(e>=55296&&e<=57343||e>=64976&&e<=65007||(e&65535)===65535||(e&65535)===65534||e>=0&&e<=8||e===11||e>=14&&e<=31||e>=127&&e<=159||e>1114111)}function he(e){if(e>65535){e-=65536;const n=55296+(e>>10),u=56320+(e&1023);return String.fromCharCode(n,u)}return String.fromCharCode(e)}const hu=/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g,Ar=/&([a-z#][a-z0-9]{1,31});/gi,Fr=new RegExp(hu.source+"|"+Ar.source,"gi"),Ir=/^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i;function Lr(e,n){if(n.charCodeAt(0)===35&&Ir.test(n)){const t=n[1].toLowerCase()==="x"?parseInt(n.slice(2),16):parseInt(n.slice(1),10);return hn(t)?he(t):e}const u=Tr(e);return u!==e?u:e}function Mr(e){return e.indexOf("\\")<0?e:e.replace(hu,"$1")}function oe(e){return e.indexOf("\\")<0&&e.indexOf("&")<0?e:e.replace(Fr,function(n,u,t){return u||Lr(n,t)})}const Wr=/[&<>"]/,Or=/[&<>"]/g,Nr={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"};function Hr(e){return Nr[e]}function $(e){return Wr.test(e)?e.replace(Or,Hr):e}const zr=/[.?*+^$[\]\\(){}|-]/g;function Br(e){return e.replace(zr,"\\$&")}function S(e){switch(e){case 9:case 32:return!0}return!1}function be(e){if(e>=8192&&e<=8202)return!0;switch(e){case 9:case 10:case 11:case 12:case 13:case 32:case 160:case 5760:case 8239:case 8287:case 12288:return!0}return!1}function bu(e){return fn.test(e)||cu.test(e)}function me(e){return bu(he(e))}function ge(e){switch(e){case 33:case 34:case 35:case 36:case 37:case 38:case 39:case 40:case 41:case 42:case 43:case 44:case 45:case 46:case 47:case 58:case 59:case 60:case 61:case 62:case 63:case 64:case 91:case 92:case 93:case 94:case 95:case 96:case 123:case 124:case 125:case 126:return!0;default:return!1}}function Ne(e){return e=e.trim().replace(/\s+/g," "),"ẞ".toLowerCase()==="Ṿ"&&(e=e.replace(/ẞ/g,"ß")),e.toLowerCase().toUpperCase()}function Mn(e){return e===32||e===9||e===10||e===13}function He(e){let n=0;for(;n<e.length&&Mn(e.charCodeAt(n));n++);let u=e.length-1;for(;u>=n&&Mn(e.charCodeAt(u));u--);return e.slice(n,u+1)}const qr={mdurl:fr,ucmicro:hr},Gr=Object.freeze(Object.defineProperty({__proto__:null,arrayReplaceAt:pu,asciiTrim:He,assign:Oe,escapeHtml:$,escapeRE:Br,fromCodePoint:he,has:Pr,isMdAsciiPunct:ge,isPunctChar:bu,isPunctCharCode:me,isSpace:S,isString:pn,isValidEntityCode:hn,isWhiteSpace:be,lib:qr,normalizeReference:Ne,unescapeAll:oe,unescapeMd:Mr},Symbol.toStringTag,{value:"Module"}));function jr(e,n,u){let t,r,o,i;const a=e.posMax,s=e.pos;for(e.pos=n+1,t=1;e.pos<a;){if(o=e.src.charCodeAt(e.pos),o===93&&(t--,t===0)){r=!0;break}if(i=e.pos,e.md.inline.skipToken(e),o===91){if(i===e.pos-1)t++;else if(u)return e.pos=s,-1}}let c=-1;return r&&(c=e.pos),e.pos=s,c}function Ur(e,n,u){let t,r=n;const o={ok:!1,pos:0,str:""};if(e.charCodeAt(r)===60){for(r++;r<u;){if(t=e.charCodeAt(r),t===10||t===60)return o;if(t===62)return o.pos=r+1,o.str=oe(e.slice(n+1,r)),o.ok=!0,o;if(t===92&&r+1<u){r+=2;continue}r++}return o}let i=0;for(;r<u&&(t=e.charCodeAt(r),!(t===32||t<32||t===127));){if(t===92&&r+1<u){if(e.charCodeAt(r+1)===32)break;r+=2;continue}if(t===40&&(i++,i>32))return o;if(t===41){if(i===0)break;i--}r++}return n===r||i!==0||(o.str=oe(e.slice(n,r)),o.pos=r,o.ok=!0),o}function Vr(e,n,u,t){let r,o=n;const i={ok:!1,can_continue:!1,pos:0,str:"",marker:0};if(t)i.str=t.str,i.marker=t.marker;else{if(o>=u)return i;let a=e.charCodeAt(o);if(a!==34&&a!==39&&a!==40)return i;n++,o++,a===40&&(a=41),i.marker=a}for(;o<u;){if(r=e.charCodeAt(o),r===i.marker)return i.pos=o+1,i.str+=oe(e.slice(n,o)),i.ok=!0,i;if(r===40&&i.marker===41)return i;r===92&&o+1<u&&o++,o++}return i.can_continue=!0,i.str+=oe(e.slice(n,o)),i}const $r=Object.freeze(Object.defineProperty({__proto__:null,parseLinkDestination:Ur,parseLinkLabel:jr,parseLinkTitle:Vr},Symbol.toStringTag,{value:"Module"})),H={};H.code_inline=function(e,n,u,t,r){const o=e[n];return"<code"+r.renderAttrs(o)+">"+$(o.content)+"</code>"};H.code_block=function(e,n,u,t,r){const o=e[n];return"<pre"+r.renderAttrs(o)+"><code>"+$(e[n].content)+`</code></pre>
`};H.fence=function(e,n,u,t,r){const o=e[n],i=o.info?oe(o.info).trim():"";let a="",s="";if(i){const l=i.split(/(\s+)/g);a=l[0],s=l.slice(2).join("")}let c;if(u.highlight?c=u.highlight(o.content,a,s)||$(o.content):c=$(o.content),c.indexOf("<pre")===0)return c+`
`;if(i){const l=o.attrIndex("class"),d=o.attrs?o.attrs.slice():[];l<0?d.push(["class",u.langPrefix+a]):(d[l]=d[l].slice(),d[l][1]+=" "+u.langPrefix+a);const h={attrs:d};return`<pre><code${r.renderAttrs(h)}>${c}</code></pre>
`}return`<pre><code${r.renderAttrs(o)}>${c}</code></pre>
`};H.image=function(e,n,u,t,r){const o=e[n];return o.attrs[o.attrIndex("alt")][1]=r.renderInlineAsText(o.children,u,t),r.renderToken(e,n,u)};H.hardbreak=function(e,n,u){return u.xhtmlOut?`<br />
`:`<br>
`};H.softbreak=function(e,n,u){return u.breaks?u.xhtmlOut?`<br />
`:`<br>
`:`
`};H.text=function(e,n){return $(e[n].content)};H.html_block=function(e,n){return e[n].content};H.html_inline=function(e,n){return e[n].content};function ce(){this.rules=Oe({},H)}ce.prototype.renderAttrs=function(n){let u,t,r;if(!n.attrs)return"";for(r="",u=0,t=n.attrs.length;u<t;u++)r+=" "+$(n.attrs[u][0])+'="'+$(n.attrs[u][1])+'"';return r};ce.prototype.renderToken=function(n,u,t){const r=n[u];let o="";if(r.hidden)return"";r.block&&r.nesting!==-1&&u&&n[u-1].hidden&&(o+=`
`),o+=(r.nesting===-1?"</":"<")+r.tag,o+=this.renderAttrs(r),r.nesting===0&&t.xhtmlOut&&(o+=" /");let i=!1;if(r.block&&(i=!0,r.nesting===1&&u+1<n.length)){const a=n[u+1];(a.type==="inline"||a.hidden||a.nesting===-1&&a.tag===r.tag)&&(i=!1)}return o+=i?`>
`:">",o};ce.prototype.renderInline=function(e,n,u){let t="";const r=this.rules;for(let o=0,i=e.length;o<i;o++){const a=e[o].type;typeof r[a]<"u"?t+=r[a](e,o,n,u,this):t+=this.renderToken(e,o,n)}return t};ce.prototype.renderInlineAsText=function(e,n,u){let t="";for(let r=0,o=e.length;r<o;r++)switch(e[r].type){case"text":t+=e[r].content;break;case"image":t+=this.renderInlineAsText(e[r].children,n,u);break;case"html_inline":case"html_block":t+=e[r].content;break;case"softbreak":case"hardbreak":t+=`
`;break}return t};ce.prototype.render=function(e,n,u){let t="";const r=this.rules;for(let o=0,i=e.length;o<i;o++){const a=e[o].type;a==="inline"?t+=this.renderInline(e[o].children,n,u):typeof r[a]<"u"?t+=r[a](e,o,n,u,this):t+=this.renderToken(e,o,n,u)}return t};function E(){this.__rules__=[],this.__cache__=null}E.prototype.__find__=function(e){for(let n=0;n<this.__rules__.length;n++)if(this.__rules__[n].name===e)return n;return-1};E.prototype.__compile__=function(){const e=this,n=[""];e.__rules__.forEach(function(u){u.enabled&&u.alt.forEach(function(t){n.indexOf(t)<0&&n.push(t)})}),e.__cache__={},n.forEach(function(u){e.__cache__[u]=[],e.__rules__.forEach(function(t){t.enabled&&(u&&t.alt.indexOf(u)<0||e.__cache__[u].push(t.fn))})})};E.prototype.at=function(e,n,u){const t=this.__find__(e),r=u||{};if(t===-1)throw new Error("Parser rule not found: "+e);this.__rules__[t].fn=n,this.__rules__[t].alt=r.alt||[],this.__cache__=null};E.prototype.before=function(e,n,u,t){const r=this.__find__(e),o=t||{};if(r===-1)throw new Error("Parser rule not found: "+e);this.__rules__.splice(r,0,{name:n,enabled:!0,fn:u,alt:o.alt||[]}),this.__cache__=null};E.prototype.after=function(e,n,u,t){const r=this.__find__(e),o=t||{};if(r===-1)throw new Error("Parser rule not found: "+e);this.__rules__.splice(r+1,0,{name:n,enabled:!0,fn:u,alt:o.alt||[]}),this.__cache__=null};E.prototype.push=function(e,n,u){const t=u||{};this.__rules__.push({name:e,enabled:!0,fn:n,alt:t.alt||[]}),this.__cache__=null};E.prototype.enable=function(e,n){Array.isArray(e)||(e=[e]);const u=[];return e.forEach(function(t){const r=this.__find__(t);if(r<0){if(n)return;throw new Error("Rules manager: invalid rule name "+t)}this.__rules__[r].enabled=!0,u.push(t)},this),this.__cache__=null,u};E.prototype.enableOnly=function(e,n){Array.isArray(e)||(e=[e]),this.__rules__.forEach(function(u){u.enabled=!1}),this.enable(e,n)};E.prototype.disable=function(e,n){Array.isArray(e)||(e=[e]);const u=[];return e.forEach(function(t){const r=this.__find__(t);if(r<0){if(n)return;throw new Error("Rules manager: invalid rule name "+t)}this.__rules__[r].enabled=!1,u.push(t)},this),this.__cache__=null,u};E.prototype.getRules=function(e){return this.__cache__===null&&this.__compile__(),this.__cache__[e]||[]};function I(e,n,u){this.type=e,this.tag=n,this.attrs=null,this.map=null,this.nesting=u,this.level=0,this.children=null,this.content="",this.markup="",this.info="",this.meta=null,this.block=!1,this.hidden=!1}I.prototype.attrIndex=function(n){if(!this.attrs)return-1;const u=this.attrs;for(let t=0,r=u.length;t<r;t++)if(u[t][0]===n)return t;return-1};I.prototype.attrPush=function(n){this.attrs?this.attrs.push(n):this.attrs=[n]};I.prototype.attrSet=function(n,u){const t=this.attrIndex(n),r=[n,u];t<0?this.attrPush(r):this.attrs[t]=r};I.prototype.attrGet=function(n){const u=this.attrIndex(n);let t=null;return u>=0&&(t=this.attrs[u][1]),t};I.prototype.attrJoin=function(n,u){const t=this.attrIndex(n);t<0?this.attrPush([n,u]):this.attrs[t][1]=this.attrs[t][1]+" "+u};function mu(e,n,u){this.src=e,this.env=u,this.tokens=[],this.inlineMode=!1,this.md=n}mu.prototype.Token=I;const Kr=/\r\n?|\n/g,Zr=/\0/g;function Yr(e){let n;n=e.src.replace(Kr,`
`),n=n.replace(Zr,"�"),e.src=n}function Xr(e){let n;e.inlineMode?(n=new e.Token("inline","",0),n.content=e.src,n.map=[0,1],n.children=[],e.tokens.push(n)):e.md.block.parse(e.src,e.md,e.env,e.tokens)}function Jr(e){const n=e.tokens;for(let u=0,t=n.length;u<t;u++){const r=n[u];r.type==="inline"&&e.md.inline.parse(r.content,e.md,e.env,r.children)}}function Qr(e){return/^<a[>\s]/i.test(e)}function eo(e){return/^<\/a\s*>/i.test(e)}function no(e){const n=e.tokens;if(e.md.options.linkify)for(let u=0,t=n.length;u<t;u++){if(n[u].type!=="inline"||!e.md.linkify.pretest(n[u].content))continue;let r=n[u].children,o=0;for(let i=r.length-1;i>=0;i--){const a=r[i];if(a.type==="link_close"){for(i--;r[i].level!==a.level&&r[i].type!=="link_open";)i--;continue}if(a.type==="html_inline"&&(Qr(a.content)&&o>0&&o--,eo(a.content)&&o++),!(o>0)&&a.type==="text"&&e.md.linkify.test(a.content)){const s=a.content;let c=e.md.linkify.match(s);const l=[];let d=a.level,h=0;c.length>0&&c[0].index===0&&i>0&&r[i-1].type==="text_special"&&(c=c.slice(1));for(let p=0;p<c.length;p++){const f=c[p].url,m=e.md.normalizeLink(f);if(!e.md.validateLink(m))continue;let g=c[p].text;c[p].schema?c[p].schema==="mailto:"&&!/^mailto:/i.test(g)?g=e.md.normalizeLinkText("mailto:"+g).replace(/^mailto:/,""):g=e.md.normalizeLinkText(g):g=e.md.normalizeLinkText("http://"+g).replace(/^http:\/\//,"");const C=c[p].index;if(C>h){const y=new e.Token("text","",0);y.content=s.slice(h,C),y.level=d,l.push(y)}const _=new e.Token("link_open","a",1);_.attrs=[["href",m]],_.level=d++,_.markup="linkify",_.info="auto",l.push(_);const b=new e.Token("text","",0);b.content=g,b.level=d,l.push(b);const x=new e.Token("link_close","a",-1);x.level=--d,x.markup="linkify",x.info="auto",l.push(x),h=c[p].lastIndex}if(h<s.length){const p=new e.Token("text","",0);p.content=s.slice(h),p.level=d,l.push(p)}n[u].children=r=pu(r,i,l)}}}}const gu=/\+-|\.\.|\?\?\?\?|!!!!|,,|--/,uo=/\((c|tm|r)\)/i,to=/\((c|tm|r)\)/ig,ro={c:"©",r:"®",tm:"™"};function oo(e,n){return ro[n.toLowerCase()]}function io(e){let n=0;for(let u=e.length-1;u>=0;u--){const t=e[u];t.type==="text"&&!n&&(t.content=t.content.replace(to,oo)),t.type==="link_open"&&t.info==="auto"&&n--,t.type==="link_close"&&t.info==="auto"&&n++}}function ao(e){let n=0;for(let u=e.length-1;u>=0;u--){const t=e[u];t.type==="text"&&!n&&gu.test(t.content)&&(t.content=t.content.replace(/\+-/g,"±").replace(/\.{2,}/g,"…").replace(/([?!])…/g,"$1..").replace(/([?!]){4,}/g,"$1$1$1").replace(/,{2,}/g,",").replace(/(^|[^-])---(?=[^-]|$)/mg,"$1—").replace(/(^|\s)--(?=\s|$)/mg,"$1–").replace(/(^|[^-\s])--(?=[^-\s]|$)/mg,"$1–")),t.type==="link_open"&&t.info==="auto"&&n--,t.type==="link_close"&&t.info==="auto"&&n++}}function so(e){let n;if(e.md.options.typographer)for(n=e.tokens.length-1;n>=0;n--)e.tokens[n].type==="inline"&&(uo.test(e.tokens[n].content)&&io(e.tokens[n].children),gu.test(e.tokens[n].content)&&ao(e.tokens[n].children))}const co=/['"]/,Wn=/['"]/g,On="’";function Te(e,n,u,t){e[n]||(e[n]=[]),e[n].push({pos:u,ch:t})}function lo(e,n){let u="",t=0;n.sort((r,o)=>r.pos-o.pos);for(let r=0;r<n.length;r++){const o=n[r];u+=e.slice(t,o.pos)+o.ch,t=o.pos+1}return u+e.slice(t)}function fo(e,n){let u;const t=[],r={};for(let o=0;o<e.length;o++){const i=e[o],a=e[o].level;for(u=t.length-1;u>=0&&!(t[u].level<=a);u--);if(t.length=u+1,i.type!=="text")continue;const s=i.content;let c=0;const l=s.length;e:for(;c<l;){Wn.lastIndex=c;const d=Wn.exec(s);if(!d)break;let h=!0,p=!0;c=d.index+1;const f=d[0]==="'";let m=32;if(d.index-1>=0)m=s.charCodeAt(d.index-1);else for(u=o-1;u>=0&&!(e[u].type==="softbreak"||e[u].type==="hardbreak");u--)if(e[u].content){m=e[u].content.charCodeAt(e[u].content.length-1);break}let g=32;if(c<l)g=s.charCodeAt(c);else for(u=o+1;u<e.length&&!(e[u].type==="softbreak"||e[u].type==="hardbreak");u++)if(e[u].content){g=e[u].content.charCodeAt(0);break}const C=ge(m)||me(m),_=ge(g)||me(g),b=be(m),x=be(g);if(x?h=!1:_&&(b||C||(h=!1)),b?p=!1:C&&(x||_||(p=!1)),g===34&&d[0]==='"'&&m>=48&&m<=57&&(p=h=!1),h&&p&&(h=C,p=_),!h&&!p){f&&Te(r,o,d.index,On);continue}if(p)for(u=t.length-1;u>=0;u--){let y=t[u];if(t[u].level<a)break;if(y.single===f&&t[u].level===a){y=t[u];let k,v;f?(k=n.md.options.quotes[2],v=n.md.options.quotes[3]):(k=n.md.options.quotes[0],v=n.md.options.quotes[1]),Te(r,o,d.index,v),Te(r,y.token,y.pos,k),t.length=u;continue e}}h?t.push({token:o,pos:d.index,single:f,level:a}):p&&f&&Te(r,o,d.index,On)}}Object.keys(r).forEach(function(o){e[o].content=lo(e[o].content,r[o])})}function po(e){if(e.md.options.typographer)for(let n=e.tokens.length-1;n>=0;n--)e.tokens[n].type!=="inline"||!co.test(e.tokens[n].content)||fo(e.tokens[n].children,e)}function ho(e){let n,u;const t=e.tokens,r=t.length;for(let o=0;o<r;o++){if(t[o].type!=="inline")continue;const i=t[o].children,a=i.length;for(n=0;n<a;n++)i[n].type==="text_special"&&(i[n].type="text");for(n=u=0;n<a;n++)i[n].type==="text"&&n+1<a&&i[n+1].type==="text"?i[n+1].content=i[n].content+i[n+1].content:(n!==u&&(i[u]=i[n]),u++);n!==u&&(i.length=u)}}const Ke=[["normalize",Yr],["block",Xr],["inline",Jr],["linkify",no],["replacements",so],["smartquotes",po],["text_join",ho]];function bn(){this.ruler=new E;for(let e=0;e<Ke.length;e++)this.ruler.push(Ke[e][0],Ke[e][1])}bn.prototype.process=function(e){const n=this.ruler.getRules("");for(let u=0,t=n.length;u<t;u++)n[u](e)};bn.prototype.State=mu;function z(e,n,u,t){this.src=e,this.md=n,this.env=u,this.tokens=t,this.bMarks=[],this.eMarks=[],this.tShift=[],this.sCount=[],this.bsCount=[],this.blkIndent=0,this.line=0,this.lineMax=0,this.tight=!1,this.ddIndent=-1,this.listIndent=-1,this.parentType="root",this.level=0;const r=this.src;for(let o=0,i=0,a=0,s=0,c=r.length,l=!1;i<c;i++){const d=r.charCodeAt(i);if(!l)if(S(d)){a++,d===9?s+=4-s%4:s++;continue}else l=!0;(d===10||i===c-1)&&(d!==10&&i++,this.bMarks.push(o),this.eMarks.push(i),this.tShift.push(a),this.sCount.push(s),this.bsCount.push(0),l=!1,a=0,s=0,o=i+1)}this.bMarks.push(r.length),this.eMarks.push(r.length),this.tShift.push(0),this.sCount.push(0),this.bsCount.push(0),this.lineMax=this.bMarks.length-1}z.prototype.push=function(e,n,u){const t=new I(e,n,u);return t.block=!0,u<0&&this.level--,t.level=this.level,u>0&&this.level++,this.tokens.push(t),t};z.prototype.isEmpty=function(n){return this.bMarks[n]+this.tShift[n]>=this.eMarks[n]};z.prototype.skipEmptyLines=function(n){for(let u=this.lineMax;n<u&&!(this.bMarks[n]+this.tShift[n]<this.eMarks[n]);n++);return n};z.prototype.skipSpaces=function(n){for(let u=this.src.length;n<u;n++){const t=this.src.charCodeAt(n);if(!S(t))break}return n};z.prototype.skipSpacesBack=function(n,u){if(n<=u)return n;for(;n>u;)if(!S(this.src.charCodeAt(--n)))return n+1;return n};z.prototype.skipChars=function(n,u){for(let t=this.src.length;n<t&&this.src.charCodeAt(n)===u;n++);return n};z.prototype.skipCharsBack=function(n,u,t){if(n<=t)return n;for(;n>t;)if(u!==this.src.charCodeAt(--n))return n+1;return n};z.prototype.getLines=function(n,u,t,r){if(n>=u)return"";const o=new Array(u-n);for(let i=0,a=n;a<u;a++,i++){let s=0;const c=this.bMarks[a];let l=c,d;for(a+1<u||r?d=this.eMarks[a]+1:d=this.eMarks[a];l<d&&s<t;){const h=this.src.charCodeAt(l);if(S(h))h===9?s+=4-(s+this.bsCount[a])%4:s++;else if(l-c<this.tShift[a])s++;else break;l++}s>t?o[i]=new Array(s-t+1).join(" ")+this.src.slice(l,d):o[i]=this.src.slice(l,d)}return o.join("")};z.prototype.Token=I;const bo=65536;function Ze(e,n){const u=e.bMarks[n]+e.tShift[n],t=e.eMarks[n];return e.src.slice(u,t)}function Nn(e){const n=[],u=e.length;let t=0,r=e.charCodeAt(t),o=!1,i=0,a="";for(;t<u;)r===124&&(o?(a+=e.substring(i,t-1),i=t):(n.push(a+e.substring(i,t)),a="",i=t+1)),o=r===92,t++,r=e.charCodeAt(t);return n.push(a+e.substring(i)),n}function mo(e,n,u,t){if(n+2>u)return!1;let r=n+1;if(e.sCount[r]<e.blkIndent||e.sCount[r]-e.blkIndent>=4)return!1;let o=e.bMarks[r]+e.tShift[r];if(o>=e.eMarks[r])return!1;const i=e.src.charCodeAt(o++);if(i!==124&&i!==45&&i!==58||o>=e.eMarks[r])return!1;const a=e.src.charCodeAt(o++);if(a!==124&&a!==45&&a!==58&&!S(a)||i===45&&S(a))return!1;for(;o<e.eMarks[r];){const x=e.src.charCodeAt(o);if(x!==124&&x!==45&&x!==58&&!S(x))return!1;o++}let s=Ze(e,n+1),c=s.split("|");const l=[];for(let x=0;x<c.length;x++){const y=c[x].trim();if(!y){if(x===0||x===c.length-1)continue;return!1}if(!/^:?-+:?$/.test(y))return!1;y.charCodeAt(y.length-1)===58?l.push(y.charCodeAt(0)===58?"center":"right"):y.charCodeAt(0)===58?l.push("left"):l.push("")}if(s=Ze(e,n).trim(),s.indexOf("|")===-1||e.sCount[n]-e.blkIndent>=4)return!1;c=Nn(s),c.length&&c[0]===""&&c.shift(),c.length&&c[c.length-1]===""&&c.pop();const d=c.length;if(d===0||d!==l.length)return!1;if(t)return!0;const h=e.parentType;e.parentType="table";const p=e.md.block.ruler.getRules("blockquote"),f=e.push("table_open","table",1),m=[n,0];f.map=m;const g=e.push("thead_open","thead",1);g.map=[n,n+1];const C=e.push("tr_open","tr",1);C.map=[n,n+1];for(let x=0;x<c.length;x++){const y=e.push("th_open","th",1);l[x]&&(y.attrs=[["style","text-align:"+l[x]]]);const k=e.push("inline","",0);k.content=c[x].trim(),k.children=[],e.push("th_close","th",-1)}e.push("tr_close","tr",-1),e.push("thead_close","thead",-1);let _,b=0;for(r=n+2;r<u&&!(e.sCount[r]<e.blkIndent);r++){let x=!1;for(let k=0,v=p.length;k<v;k++)if(p[k](e,r,u,!0)){x=!0;break}if(x||(s=Ze(e,r).trim(),!s)||e.sCount[r]-e.blkIndent>=4||(c=Nn(s),c.length&&c[0]===""&&c.shift(),c.length&&c[c.length-1]===""&&c.pop(),b+=d-c.length,b>bo))break;if(r===n+2){const k=e.push("tbody_open","tbody",1);k.map=_=[n+2,0]}const y=e.push("tr_open","tr",1);y.map=[r,r+1];for(let k=0;k<d;k++){const v=e.push("td_open","td",1);l[k]&&(v.attrs=[["style","text-align:"+l[k]]]);const F=e.push("inline","",0);F.content=c[k]?c[k].trim():"",F.children=[],e.push("td_close","td",-1)}e.push("tr_close","tr",-1)}return _&&(e.push("tbody_close","tbody",-1),_[1]=r),e.push("table_close","table",-1),m[1]=r,e.parentType=h,e.line=r,!0}function go(e,n,u){if(e.sCount[n]-e.blkIndent<4)return!1;let t=n+1,r=t;for(;t<u;){if(e.isEmpty(t)){t++;continue}if(e.sCount[t]-e.blkIndent>=4){t++,r=t;continue}break}e.line=r;const o=e.push("code_block","code",0);return o.content=e.getLines(n,r,4+e.blkIndent,!1)+`
`,o.map=[n,e.line],!0}function xo(e,n,u,t){let r=e.bMarks[n]+e.tShift[n],o=e.eMarks[n];if(e.sCount[n]-e.blkIndent>=4||r+3>o)return!1;const i=e.src.charCodeAt(r);if(i!==126&&i!==96)return!1;let a=r;r=e.skipChars(r,i);let s=r-a;if(s<3)return!1;const c=e.src.slice(a,r),l=e.src.slice(r,o);if(i===96&&l.indexOf(String.fromCharCode(i))>=0)return!1;if(t)return!0;let d=n,h=!1;for(;d++,!(d>=u||(r=a=e.bMarks[d]+e.tShift[d],o=e.eMarks[d],r<o&&e.sCount[d]<e.blkIndent));)if(e.src.charCodeAt(r)===i&&!(e.sCount[d]-e.blkIndent>=4)&&(r=e.skipChars(r,i),!(r-a<s)&&(r=e.skipSpaces(r),!(r<o)))){h=!0;break}s=e.sCount[n],e.line=d+(h?1:0);const p=e.push("fence","code",0);return p.info=l,p.content=e.getLines(n+1,d,s,!0),p.markup=c,p.map=[n,e.line],!0}function _o(e,n,u,t){let r=e.bMarks[n]+e.tShift[n],o=e.eMarks[n];const i=e.lineMax;if(e.sCount[n]-e.blkIndent>=4||e.src.charCodeAt(r)!==62)return!1;if(t)return!0;const a=[],s=[],c=[],l=[],d=e.md.block.ruler.getRules("blockquote"),h=e.parentType;e.parentType="blockquote";let p=!1,f;for(f=n;f<u;f++){const b=e.sCount[f]<e.blkIndent;if(r=e.bMarks[f]+e.tShift[f],o=e.eMarks[f],r>=o)break;if(e.src.charCodeAt(r++)===62&&!b){let y=e.sCount[f]+1,k,v;e.src.charCodeAt(r)===32?(r++,y++,v=!1,k=!0):e.src.charCodeAt(r)===9?(k=!0,(e.bsCount[f]+y)%4===3?(r++,y++,v=!1):v=!0):k=!1;let F=y;for(a.push(e.bMarks[f]),e.bMarks[f]=r;r<o;){const G=e.src.charCodeAt(r);if(S(G))G===9?F+=4-(F+e.bsCount[f]+(v?1:0))%4:F++;else break;r++}p=r>=o,s.push(e.bsCount[f]),e.bsCount[f]=e.sCount[f]+1+(k?1:0),c.push(e.sCount[f]),e.sCount[f]=F-y,l.push(e.tShift[f]),e.tShift[f]=r-e.bMarks[f];continue}if(p)break;let x=!1;for(let y=0,k=d.length;y<k;y++)if(d[y](e,f,u,!0)){x=!0;break}if(x){e.lineMax=f,e.blkIndent!==0&&(a.push(e.bMarks[f]),s.push(e.bsCount[f]),l.push(e.tShift[f]),c.push(e.sCount[f]),e.sCount[f]-=e.blkIndent);break}a.push(e.bMarks[f]),s.push(e.bsCount[f]),l.push(e.tShift[f]),c.push(e.sCount[f]),e.sCount[f]=-1}const m=e.blkIndent;e.blkIndent=0;const g=e.push("blockquote_open","blockquote",1);g.markup=">";const C=[n,0];g.map=C,e.md.block.tokenize(e,n,f);const _=e.push("blockquote_close","blockquote",-1);_.markup=">",e.lineMax=i,e.parentType=h,C[1]=e.line;for(let b=0;b<l.length;b++)e.bMarks[b+n]=a[b],e.tShift[b+n]=l[b],e.sCount[b+n]=c[b],e.bsCount[b+n]=s[b];return e.blkIndent=m,!0}function yo(e,n,u,t){const r=e.eMarks[n];if(e.sCount[n]-e.blkIndent>=4)return!1;let o=e.bMarks[n]+e.tShift[n];const i=e.src.charCodeAt(o++);if(i!==42&&i!==45&&i!==95)return!1;let a=1;for(;o<r;){const c=e.src.charCodeAt(o++);if(c!==i&&!S(c))return!1;c===i&&a++}if(a<3)return!1;if(t)return!0;e.line=n+1;const s=e.push("hr","hr",0);return s.map=[n,e.line],s.markup=Array(a+1).join(String.fromCharCode(i)),!0}function Hn(e,n){const u=e.eMarks[n];let t=e.bMarks[n]+e.tShift[n];const r=e.src.charCodeAt(t++);if(r!==42&&r!==45&&r!==43)return-1;if(t<u){const o=e.src.charCodeAt(t);if(!S(o))return-1}return t}function zn(e,n){const u=e.bMarks[n]+e.tShift[n],t=e.eMarks[n];let r=u;if(r+1>=t)return-1;let o=e.src.charCodeAt(r++);if(o<48||o>57)return-1;for(;;){if(r>=t)return-1;if(o=e.src.charCodeAt(r++),o>=48&&o<=57){if(r-u>=10)return-1;continue}if(o===41||o===46)break;return-1}return r<t&&(o=e.src.charCodeAt(r),!S(o))?-1:r}function ko(e,n){const u=e.level+2;for(let t=n+2,r=e.tokens.length-2;t<r;t++)e.tokens[t].level===u&&e.tokens[t].type==="paragraph_open"&&(e.tokens[t+2].hidden=!0,e.tokens[t].hidden=!0,t+=2)}function Co(e,n,u,t){let r,o,i,a,s=n,c=!0;if(e.sCount[s]-e.blkIndent>=4||e.listIndent>=0&&e.sCount[s]-e.listIndent>=4&&e.sCount[s]<e.blkIndent)return!1;let l=!1;t&&e.parentType==="paragraph"&&e.sCount[s]>=e.blkIndent&&(l=!0);let d,h,p;if((p=zn(e,s))>=0){if(d=!0,i=e.bMarks[s]+e.tShift[s],h=Number(e.src.slice(i,p-1)),l&&h!==1)return!1}else if((p=Hn(e,s))>=0)d=!1;else return!1;if(l&&e.skipSpaces(p)>=e.eMarks[s])return!1;if(t)return!0;const f=e.src.charCodeAt(p-1),m=e.tokens.length;d?(a=e.push("ordered_list_open","ol",1),h!==1&&(a.attrs=[["start",h]])):a=e.push("bullet_list_open","ul",1);const g=[s,0];a.map=g,a.markup=String.fromCharCode(f);let C=!1;const _=e.md.block.ruler.getRules("list"),b=e.parentType;for(e.parentType="list";s<u;){o=p,r=e.eMarks[s];const x=e.sCount[s]+p-(e.bMarks[s]+e.tShift[s]);let y=x;for(;o<r;){const ne=e.src.charCodeAt(o);if(ne===9)y+=4-(y+e.bsCount[s])%4;else if(ne===32)y++;else break;o++}const k=o;let v;k>=r?v=1:v=y-x,v>4&&(v=1);const F=x+v;a=e.push("list_item_open","li",1),a.markup=String.fromCharCode(f);const G=[s,0];a.map=G,d&&(a.info=e.src.slice(i,p-1));const le=e.tight,je=e.tShift[s],Yu=e.sCount[s],Xu=e.listIndent;if(e.listIndent=e.blkIndent,e.blkIndent=F,e.tight=!0,e.tShift[s]=k-e.bMarks[s],e.sCount[s]=y,k>=r&&e.isEmpty(s+1)?e.line=Math.min(e.line+2,u):e.md.block.tokenize(e,s,u,!0),(!e.tight||C)&&(c=!1),C=e.line-s>1&&e.isEmpty(e.line-1),e.blkIndent=e.listIndent,e.listIndent=Xu,e.tShift[s]=je,e.sCount[s]=Yu,e.tight=le,a=e.push("list_item_close","li",-1),a.markup=String.fromCharCode(f),s=e.line,G[1]=s,s>=u||e.sCount[s]<e.blkIndent||e.sCount[s]-e.blkIndent>=4)break;let Sn=!1;for(let ne=0,Ju=_.length;ne<Ju;ne++)if(_[ne](e,s,u,!0)){Sn=!0;break}if(Sn)break;if(d){if(p=zn(e,s),p<0)break;i=e.bMarks[s]+e.tShift[s]}else if(p=Hn(e,s),p<0)break;if(f!==e.src.charCodeAt(p-1))break}return d?a=e.push("ordered_list_close","ol",-1):a=e.push("bullet_list_close","ul",-1),a.markup=String.fromCharCode(f),g[1]=s,e.line=s,e.parentType=b,c&&ko(e,m),!0}function wo(e,n,u,t){let r=e.bMarks[n]+e.tShift[n],o=e.eMarks[n],i=n+1;if(e.sCount[n]-e.blkIndent>=4||e.src.charCodeAt(r)!==91)return!1;function a(_){const b=e.lineMax;if(_>=b||e.isEmpty(_))return null;let x=!1;if(e.sCount[_]-e.blkIndent>3&&(x=!0),e.sCount[_]<0&&(x=!0),!x){const v=e.md.block.ruler.getRules("reference"),F=e.parentType;e.parentType="reference";let G=!1;for(let le=0,je=v.length;le<je;le++)if(v[le](e,_,b,!0)){G=!0;break}if(e.parentType=F,G)return null}const y=e.bMarks[_]+e.tShift[_],k=e.eMarks[_];return e.src.slice(y,k+1)}let s=e.src.slice(r,o+1);o=s.length;let c=-1;for(r=1;r<o;r++){const _=s.charCodeAt(r);if(_===91)return!1;if(_===93){c=r;break}else if(_===10){const b=a(i);b!==null&&(s+=b,o=s.length,i++)}else if(_===92&&(r++,r<o&&s.charCodeAt(r)===10)){const b=a(i);b!==null&&(s+=b,o=s.length,i++)}}if(c<0||s.charCodeAt(c+1)!==58)return!1;for(r=c+2;r<o;r++){const _=s.charCodeAt(r);if(_===10){const b=a(i);b!==null&&(s+=b,o=s.length,i++)}else if(!S(_))break}const l=e.md.helpers.parseLinkDestination(s,r,o);if(!l.ok)return!1;const d=e.md.normalizeLink(l.str);if(!e.md.validateLink(d))return!1;r=l.pos;const h=r,p=i,f=r;for(;r<o;r++){const _=s.charCodeAt(r);if(_===10){const b=a(i);b!==null&&(s+=b,o=s.length,i++)}else if(!S(_))break}let m=e.md.helpers.parseLinkTitle(s,r,o);for(;m.can_continue;){const _=a(i);if(_===null)break;s+=_,r=o,o=s.length,i++,m=e.md.helpers.parseLinkTitle(s,r,o,m)}let g;for(r<o&&f!==r&&m.ok?(g=m.str,r=m.pos):(g="",r=h,i=p);r<o;){const _=s.charCodeAt(r);if(!S(_))break;r++}if(r<o&&s.charCodeAt(r)!==10&&g)for(g="",r=h,i=p;r<o;){const _=s.charCodeAt(r);if(!S(_))break;r++}if(r<o&&s.charCodeAt(r)!==10)return!1;const C=Ne(s.slice(1,c));return C?(t||(typeof e.env.references>"u"&&(e.env.references={}),typeof e.env.references[C]>"u"&&(e.env.references[C]={title:g,href:d}),e.line=i),!0):!1}const So=["address","article","aside","base","basefont","blockquote","body","caption","center","col","colgroup","dd","details","dialog","dir","div","dl","dt","fieldset","figcaption","figure","footer","form","frame","frameset","h1","h2","h3","h4","h5","h6","head","header","hr","html","iframe","legend","li","link","main","menu","menuitem","nav","noframes","ol","optgroup","option","p","param","search","section","summary","table","tbody","td","tfoot","th","thead","title","tr","track","ul"],vo="[a-zA-Z_:][a-zA-Z0-9:._-]*",To="[^\"'=<>`\\x00-\\x20]+",Ro="'[^']*'",Do='"[^"]*"',Eo="(?:"+To+"|"+Ro+"|"+Do+")",Po="(?:\\s+"+vo+"(?:\\s*=\\s*"+Eo+")?)",xu="<[A-Za-z][A-Za-z0-9\\-]*"+Po+"*\\s*\\/?>",_u="<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>",Ao="<!---?>|<!--(?:[^-]|-[^-]|--[^>])*-->",Fo="<[?][\\s\\S]*?[?]>",Io="<![A-Za-z][^>]*>",Lo="<!\\[CDATA\\[[\\s\\S]*?\\]\\]>",Mo=new RegExp("^(?:"+xu+"|"+_u+"|"+Ao+"|"+Fo+"|"+Io+"|"+Lo+")"),Wo=new RegExp("^(?:"+xu+"|"+_u+")"),K=[[/^<(script|pre|style|textarea)(?=(\s|>|$))/i,/<\/(script|pre|style|textarea)>/i,!0],[/^<!--/,/-->/,!0],[/^<\?/,/\?>/,!0],[/^<![A-Z]/,/>/,!0],[/^<!\[CDATA\[/,/\]\]>/,!0],[new RegExp("^</?("+So.join("|")+")(?=(\\s|/?>|$))","i"),/^$/,!0],[new RegExp(Wo.source+"\\s*$"),/^$/,!1]];function Oo(e,n,u,t){let r=e.bMarks[n]+e.tShift[n],o=e.eMarks[n];if(e.sCount[n]-e.blkIndent>=4||!e.md.options.html||e.src.charCodeAt(r)!==60)return!1;let i=e.src.slice(r,o),a=0;for(;a<K.length&&!K[a][0].test(i);a++);if(a===K.length)return!1;if(t)return K[a][2];let s=n+1;const c=K[a][1].test("");if(!K[a][1].test(i)){for(;s<u&&!(e.sCount[s]<e.blkIndent&&(c||!e.isEmpty(s)));s++)if(r=e.bMarks[s]+e.tShift[s],o=e.eMarks[s],i=e.src.slice(r,o),K[a][1].test(i)){i.length!==0&&s++;break}}e.line=s;const l=e.push("html_block","",0);return l.map=[n,s],l.content=e.getLines(n,s,e.blkIndent,!0),!0}function No(e,n,u,t){let r=e.bMarks[n]+e.tShift[n],o=e.eMarks[n];if(e.sCount[n]-e.blkIndent>=4)return!1;let i=e.src.charCodeAt(r);if(i!==35||r>=o)return!1;let a=1;for(i=e.src.charCodeAt(++r);i===35&&r<o&&a<=6;)a++,i=e.src.charCodeAt(++r);if(a>6||r<o&&!S(i))return!1;if(t)return!0;o=e.skipSpacesBack(o,r);const s=e.skipCharsBack(o,35,r);s>r&&S(e.src.charCodeAt(s-1))&&(o=s),e.line=n+1;const c=e.push("heading_open","h"+String(a),1);c.markup="########".slice(0,a),c.map=[n,e.line];const l=e.push("inline","",0);l.content=He(e.src.slice(r,o)),l.map=[n,e.line],l.children=[];const d=e.push("heading_close","h"+String(a),-1);return d.markup="########".slice(0,a),!0}function Ho(e,n,u){const t=e.md.block.ruler.getRules("paragraph");if(e.sCount[n]-e.blkIndent>=4)return!1;const r=e.parentType;e.parentType="paragraph";let o=0,i,a=n+1;for(;a<u&&!e.isEmpty(a);a++){if(e.sCount[a]-e.blkIndent>3)continue;if(e.sCount[a]>=e.blkIndent){let p=e.bMarks[a]+e.tShift[a];const f=e.eMarks[a];if(p<f&&(i=e.src.charCodeAt(p),(i===45||i===61)&&(p=e.skipChars(p,i),p=e.skipSpaces(p),p>=f))){o=i===61?1:2;break}}if(e.sCount[a]<0)continue;let h=!1;for(let p=0,f=t.length;p<f;p++)if(t[p](e,a,u,!0)){h=!0;break}if(h)break}if(!o)return e.parentType=r,!1;const s=He(e.getLines(n,a,e.blkIndent,!1));e.line=a+1;const c=e.push("heading_open","h"+String(o),1);c.markup=String.fromCharCode(i),c.map=[n,e.line];const l=e.push("inline","",0);l.content=s,l.map=[n,e.line-1],l.children=[];const d=e.push("heading_close","h"+String(o),-1);return d.markup=String.fromCharCode(i),e.parentType=r,!0}function zo(e,n,u){const t=e.md.block.ruler.getRules("paragraph"),r=e.parentType;let o=n+1;for(e.parentType="paragraph";o<u&&!e.isEmpty(o);o++){if(e.sCount[o]-e.blkIndent>3||e.sCount[o]<0)continue;let c=!1;for(let l=0,d=t.length;l<d;l++)if(t[l](e,o,u,!0)){c=!0;break}if(c)break}const i=He(e.getLines(n,o,e.blkIndent,!1));e.line=o;const a=e.push("paragraph_open","p",1);a.map=[n,e.line];const s=e.push("inline","",0);return s.content=i,s.map=[n,e.line],s.children=[],e.push("paragraph_close","p",-1),e.parentType=r,!0}const Re=[["table",mo,["paragraph","reference"]],["code",go],["fence",xo,["paragraph","reference","blockquote","list"]],["blockquote",_o,["paragraph","reference","blockquote","list"]],["hr",yo,["paragraph","reference","blockquote","list"]],["list",Co,["paragraph","reference","blockquote"]],["reference",wo],["html_block",Oo,["paragraph","reference","blockquote"]],["heading",No,["paragraph","reference","blockquote"]],["lheading",Ho],["paragraph",zo]];function ze(){this.ruler=new E;for(let e=0;e<Re.length;e++)this.ruler.push(Re[e][0],Re[e][1],{alt:(Re[e][2]||[]).slice()})}ze.prototype.tokenize=function(e,n,u){const t=this.ruler.getRules(""),r=t.length,o=e.md.options.maxNesting;let i=n,a=!1;for(;i<u&&(e.line=i=e.skipEmptyLines(i),!(i>=u||e.sCount[i]<e.blkIndent));){if(e.level>=o){e.line=u;break}const s=e.line;let c=!1;for(let l=0;l<r;l++)if(c=t[l](e,i,u,!1),c){if(s>=e.line)throw new Error("block rule didn't increment state.line");break}if(!c)throw new Error("none of the block rules matched");e.tight=!a,e.isEmpty(e.line-1)&&(a=!0),i=e.line,i<u&&e.isEmpty(i)&&(a=!0,i++,e.line=i)}};ze.prototype.parse=function(e,n,u,t){if(!e)return;const r=new this.State(e,n,u,t);this.tokenize(r,r.line,r.lineMax)};ze.prototype.State=z;function we(e,n,u,t){this.src=e,this.env=u,this.md=n,this.tokens=t,this.tokens_meta=Array(t.length),this.pos=0,this.posMax=this.src.length,this.level=0,this.pending="",this.pendingLevel=0,this.cache={},this.delimiters=[],this._prev_delimiters=[],this.backticks={},this.backticksScanned=!1,this.linkLevel=0}we.prototype.pushPending=function(){const e=new I("text","",0);return e.content=this.pending,e.level=this.pendingLevel,this.tokens.push(e),this.pending="",e};we.prototype.push=function(e,n,u){this.pending&&this.pushPending();const t=new I(e,n,u);let r=null;return u<0&&(this.level--,this.delimiters=this._prev_delimiters.pop()),t.level=this.level,u>0&&(this.level++,this._prev_delimiters.push(this.delimiters),this.delimiters=[],r={delimiters:this.delimiters}),this.pendingLevel=this.level,this.tokens.push(t),this.tokens_meta.push(r),t};we.prototype.scanDelims=function(e,n){const u=this.posMax,t=this.src.charCodeAt(e);let r;if(e===0)r=32;else if(e===1)r=this.src.charCodeAt(0),(r&63488)===55296&&(r=65533);else if(r=this.src.charCodeAt(e-1),(r&64512)===56320){const g=this.src.charCodeAt(e-2);r=(g&64512)===55296?65536+(g-55296<<10)+(r-56320):65533}else(r&64512)===55296&&(r=65533);let o=e;for(;o<u&&this.src.charCodeAt(o)===t;)o++;const i=o-e;let a=o<u?this.src.charCodeAt(o):32;if((a&64512)===55296){const g=this.src.charCodeAt(o+1);a=(g&64512)===56320?65536+(a-55296<<10)+(g-56320):65533}else(a&64512)===56320&&(a=65533);const s=ge(r)||me(r),c=ge(a)||me(a),l=be(r),d=be(a),h=!d&&(!c||l||s),p=!l&&(!s||d||c);return{can_open:h&&(n||!p||s),can_close:p&&(n||!h||c),length:i}};we.prototype.Token=I;function Bo(e){switch(e){case 10:case 33:case 35:case 36:case 37:case 38:case 42:case 43:case 45:case 58:case 60:case 61:case 62:case 64:case 91:case 92:case 93:case 94:case 95:case 96:case 123:case 125:case 126:return!0;default:return!1}}function qo(e,n){let u=e.pos;for(;u<e.posMax&&!Bo(e.src.charCodeAt(u));)u++;return u===e.pos?!1:(n||(e.pending+=e.src.slice(e.pos,u)),e.pos=u,!0)}const Go=/(?:^|[^a-z0-9.+-])([a-z][a-z0-9.+-]*)$/i;function jo(e,n){if(!e.md.options.linkify||e.linkLevel>0)return!1;const u=e.pos,t=e.posMax;if(u+3>t||e.src.charCodeAt(u)!==58||e.src.charCodeAt(u+1)!==47||e.src.charCodeAt(u+2)!==47)return!1;const r=e.pending.match(Go);if(!r)return!1;const o=r[1],i=e.md.linkify.matchAtStart(e.src.slice(u-o.length));if(!i)return!1;let a=i.url;if(a.length<=o.length)return!1;let s=a.length;for(;s>0&&a.charCodeAt(s-1)===42;)s--;s!==a.length&&(a=a.slice(0,s));const c=e.md.normalizeLink(a);if(!e.md.validateLink(c))return!1;if(!n){e.pending=e.pending.slice(0,-o.length);const l=e.push("link_open","a",1);l.attrs=[["href",c]],l.markup="linkify",l.info="auto";const d=e.push("text","",0);d.content=e.md.normalizeLinkText(a);const h=e.push("link_close","a",-1);h.markup="linkify",h.info="auto"}return e.pos+=a.length-o.length,!0}function Uo(e,n){let u=e.pos;if(e.src.charCodeAt(u)!==10)return!1;const t=e.pending.length-1,r=e.posMax;if(!n)if(t>=0&&e.pending.charCodeAt(t)===32)if(t>=1&&e.pending.charCodeAt(t-1)===32){let o=t-1;for(;o>=1&&e.pending.charCodeAt(o-1)===32;)o--;e.pending=e.pending.slice(0,o),e.push("hardbreak","br",0)}else e.pending=e.pending.slice(0,-1),e.push("softbreak","br",0);else e.push("softbreak","br",0);for(u++;u<r&&S(e.src.charCodeAt(u));)u++;return e.pos=u,!0}const mn=[];for(let e=0;e<256;e++)mn.push(0);"\\!\"#$%&'()*+,./:;<=>?@[]^_`{|}~-".split("").forEach(function(e){mn[e.charCodeAt(0)]=1});function Vo(e,n){let u=e.pos;const t=e.posMax;if(e.src.charCodeAt(u)!==92||(u++,u>=t))return!1;let r=e.src.charCodeAt(u);if(r===10){for(n||e.push("hardbreak","br",0),u++;u<t&&(r=e.src.charCodeAt(u),!!S(r));)u++;return e.pos=u,!0}let o=e.src[u];if(r>=55296&&r<=56319&&u+1<t){const a=e.src.charCodeAt(u+1);a>=56320&&a<=57343&&(o+=e.src[u+1],u++)}const i="\\"+o;if(!n){const a=e.push("text_special","",0);r<256&&mn[r]!==0?a.content=o:a.content=i,a.markup=i,a.info="escape"}return e.pos=u+1,!0}function $o(e,n){let u=e.pos;if(e.src.charCodeAt(u)!==96)return!1;const r=u;u++;const o=e.posMax;for(;u<o&&e.src.charCodeAt(u)===96;)u++;const i=e.src.slice(r,u),a=i.length;if(e.backticksScanned&&(e.backticks[a]||0)<=r)return n||(e.pending+=i),e.pos+=a,!0;let s=u,c;for(;(c=e.src.indexOf("`",s))!==-1;){for(s=c+1;s<o&&e.src.charCodeAt(s)===96;)s++;const l=s-c;if(l===a){if(!n){const d=e.push("code_inline","code",0);d.markup=i,d.content=e.src.slice(u,c).replace(/\n/g," ").replace(/^ (.+) $/,"$1")}return e.pos=s,!0}e.backticks[l]=c}return e.backticksScanned=!0,n||(e.pending+=i),e.pos+=a,!0}function Ko(e,n){const u=e.pos,t=e.src.charCodeAt(u);if(n||t!==126)return!1;const r=e.scanDelims(e.pos,!0);let o=r.length;const i=String.fromCharCode(t);if(o<2)return!1;let a;o%2&&(a=e.push("text","",0),a.content=i,o--);for(let s=0;s<o;s+=2)a=e.push("text","",0),a.content=i+i,e.delimiters.push({marker:t,length:0,token:e.tokens.length-1,end:-1,open:r.can_open,close:r.can_close});return e.pos+=r.length,!0}function Bn(e,n){let u;const t=[],r=n.length;for(let o=0;o<r;o++){const i=n[o];if(i.marker!==126||i.end===-1)continue;const a=n[i.end];u=e.tokens[i.token],u.type="s_open",u.tag="s",u.nesting=1,u.markup="~~",u.content="",u=e.tokens[a.token],u.type="s_close",u.tag="s",u.nesting=-1,u.markup="~~",u.content="",e.tokens[a.token-1].type==="text"&&e.tokens[a.token-1].content==="~"&&t.push(a.token-1)}for(;t.length;){const o=t.pop();let i=o+1;for(;i<e.tokens.length&&e.tokens[i].type==="s_close";)i++;i--,o!==i&&(u=e.tokens[i],e.tokens[i]=e.tokens[o],e.tokens[o]=u)}}function Zo(e){const n=e.tokens_meta,u=e.tokens_meta.length;Bn(e,e.delimiters);for(let t=0;t<u;t++)n[t]&&n[t].delimiters&&Bn(e,n[t].delimiters)}const yu={tokenize:Ko,postProcess:Zo};function Yo(e,n){const u=e.pos,t=e.src.charCodeAt(u);if(n||t!==95&&t!==42)return!1;const r=e.scanDelims(e.pos,t===42);for(let o=0;o<r.length;o++){const i=e.push("text","",0);i.content=String.fromCharCode(t),e.delimiters.push({marker:t,length:r.length,token:e.tokens.length-1,end:-1,open:r.can_open,close:r.can_close})}return e.pos+=r.length,!0}function qn(e,n){const u=n.length;for(let t=u-1;t>=0;t--){const r=n[t];if(r.marker!==95&&r.marker!==42||r.end===-1)continue;const o=n[r.end],i=t>0&&n[t-1].end===r.end+1&&n[t-1].marker===r.marker&&n[t-1].token===r.token-1&&n[r.end+1].token===o.token+1,a=String.fromCharCode(r.marker),s=e.tokens[r.token];s.type=i?"strong_open":"em_open",s.tag=i?"strong":"em",s.nesting=1,s.markup=i?a+a:a,s.content="";const c=e.tokens[o.token];c.type=i?"strong_close":"em_close",c.tag=i?"strong":"em",c.nesting=-1,c.markup=i?a+a:a,c.content="",i&&(e.tokens[n[t-1].token].content="",e.tokens[n[r.end+1].token].content="",t--)}}function Xo(e){const n=e.tokens_meta,u=e.tokens_meta.length;qn(e,e.delimiters);for(let t=0;t<u;t++)n[t]&&n[t].delimiters&&qn(e,n[t].delimiters)}const ku={tokenize:Yo,postProcess:Xo};function Jo(e,n){let u,t,r,o,i="",a="",s=e.pos,c=!0;if(e.src.charCodeAt(e.pos)!==91)return!1;const l=e.pos,d=e.posMax,h=e.pos+1,p=e.md.helpers.parseLinkLabel(e,e.pos,!0);if(p<0)return!1;let f=p+1;if(f<d&&e.src.charCodeAt(f)===40){for(c=!1,f++;f<d&&(u=e.src.charCodeAt(f),!(!S(u)&&u!==10));f++);if(f>=d)return!1;if(s=f,r=e.md.helpers.parseLinkDestination(e.src,f,e.posMax),r.ok){for(i=e.md.normalizeLink(r.str),e.md.validateLink(i)?f=r.pos:i="",s=f;f<d&&(u=e.src.charCodeAt(f),!(!S(u)&&u!==10));f++);if(r=e.md.helpers.parseLinkTitle(e.src,f,e.posMax),f<d&&s!==f&&r.ok)for(a=r.str,f=r.pos;f<d&&(u=e.src.charCodeAt(f),!(!S(u)&&u!==10));f++);}(f>=d||e.src.charCodeAt(f)!==41)&&(c=!0),f++}if(c){if(typeof e.env.references>"u")return!1;if(f<d&&e.src.charCodeAt(f)===91?(s=f+1,f=e.md.helpers.parseLinkLabel(e,f),f>=0?t=e.src.slice(s,f++):f=p+1):f=p+1,t||(t=e.src.slice(h,p)),o=e.env.references[Ne(t)],!o)return e.pos=l,!1;i=o.href,a=o.title}if(!n){e.pos=h,e.posMax=p;const m=e.push("link_open","a",1),g=[["href",i]];m.attrs=g,a&&g.push(["title",a]),e.linkLevel++,e.md.inline.tokenize(e),e.linkLevel--,e.push("link_close","a",-1)}return e.pos=f,e.posMax=d,!0}function Qo(e,n){let u,t,r,o,i,a,s,c,l="";const d=e.pos,h=e.posMax;if(e.src.charCodeAt(e.pos)!==33||e.src.charCodeAt(e.pos+1)!==91)return!1;const p=e.pos+2,f=e.md.helpers.parseLinkLabel(e,e.pos+1,!1);if(f<0)return!1;if(o=f+1,o<h&&e.src.charCodeAt(o)===40){for(o++;o<h&&(u=e.src.charCodeAt(o),!(!S(u)&&u!==10));o++);if(o>=h)return!1;for(c=o,a=e.md.helpers.parseLinkDestination(e.src,o,e.posMax),a.ok&&(l=e.md.normalizeLink(a.str),e.md.validateLink(l)?o=a.pos:l=""),c=o;o<h&&(u=e.src.charCodeAt(o),!(!S(u)&&u!==10));o++);if(a=e.md.helpers.parseLinkTitle(e.src,o,e.posMax),o<h&&c!==o&&a.ok)for(s=a.str,o=a.pos;o<h&&(u=e.src.charCodeAt(o),!(!S(u)&&u!==10));o++);else s="";if(o>=h||e.src.charCodeAt(o)!==41)return e.pos=d,!1;o++}else{if(typeof e.env.references>"u")return!1;if(o<h&&e.src.charCodeAt(o)===91?(c=o+1,o=e.md.helpers.parseLinkLabel(e,o),o>=0?r=e.src.slice(c,o++):o=f+1):o=f+1,r||(r=e.src.slice(p,f)),i=e.env.references[Ne(r)],!i)return e.pos=d,!1;l=i.href,s=i.title}if(!n){t=e.src.slice(p,f);const m=[];e.md.inline.parse(t,e.md,e.env,m);const g=e.push("image","img",0),C=[["src",l],["alt",""]];g.attrs=C,g.children=m,g.content=t,s&&C.push(["title",s])}return e.pos=o,e.posMax=h,!0}const ei=/^([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/,ni=/^([a-zA-Z][a-zA-Z0-9+.-]{1,31}):([^<>\x00-\x20]*)$/;function ui(e,n){let u=e.pos;if(e.src.charCodeAt(u)!==60)return!1;const t=e.pos,r=e.posMax;for(;;){if(++u>=r)return!1;const i=e.src.charCodeAt(u);if(i===60)return!1;if(i===62)break}const o=e.src.slice(t+1,u);if(ni.test(o)){const i=e.md.normalizeLink(o);if(!e.md.validateLink(i))return!1;if(!n){const a=e.push("link_open","a",1);a.attrs=[["href",i]],a.markup="autolink",a.info="auto";const s=e.push("text","",0);s.content=e.md.normalizeLinkText(o);const c=e.push("link_close","a",-1);c.markup="autolink",c.info="auto"}return e.pos+=o.length+2,!0}if(ei.test(o)){const i=e.md.normalizeLink("mailto:"+o);if(!e.md.validateLink(i))return!1;if(!n){const a=e.push("link_open","a",1);a.attrs=[["href",i]],a.markup="autolink",a.info="auto";const s=e.push("text","",0);s.content=e.md.normalizeLinkText(o);const c=e.push("link_close","a",-1);c.markup="autolink",c.info="auto"}return e.pos+=o.length+2,!0}return!1}function ti(e){return/^<a[>\s]/i.test(e)}function ri(e){return/^<\/a\s*>/i.test(e)}function oi(e){const n=e|32;return n>=97&&n<=122}function ii(e,n){if(!e.md.options.html)return!1;const u=e.posMax,t=e.pos;if(e.src.charCodeAt(t)!==60||t+2>=u)return!1;const r=e.src.charCodeAt(t+1);if(r!==33&&r!==63&&r!==47&&!oi(r))return!1;const o=e.src.slice(t).match(Mo);if(!o)return!1;if(!n){const i=e.push("html_inline","",0);i.content=o[0],ti(i.content)&&e.linkLevel++,ri(i.content)&&e.linkLevel--}return e.pos+=o[0].length,!0}const ai=/^&#((?:x[a-f0-9]{1,6}|[0-9]{1,7}));/i,si=/^&([a-z][a-z0-9]{1,31});/i;function ci(e,n){const u=e.pos,t=e.posMax;if(e.src.charCodeAt(u)!==38||u+1>=t)return!1;if(e.src.charCodeAt(u+1)===35){const o=e.src.slice(u).match(ai);if(o){if(!n){const i=o[1][0].toLowerCase()==="x"?parseInt(o[1].slice(1),16):parseInt(o[1],10),a=e.push("text_special","",0);a.content=hn(i)?he(i):he(65533),a.markup=o[0],a.info="entity"}return e.pos+=o[0].length,!0}}else{const o=e.src.slice(u).match(si);if(o){const i=Rr(o[0]);if(i!==o[0]){if(!n){const a=e.push("text_special","",0);a.content=i,a.markup=o[0],a.info="entity"}return e.pos+=o[0].length,!0}}}return!1}function Gn(e){const n={},u=e.length;if(!u)return;let t=0,r=-2;const o=[];for(let i=0;i<u;i++){const a=e[i];if(o.push(0),(e[t].marker!==a.marker||r!==a.token-1)&&(t=i),r=a.token,a.length=a.length||0,!a.close)continue;n.hasOwnProperty(a.marker)||(n[a.marker]=[-1,-1,-1,-1,-1,-1]);const s=n[a.marker][(a.open?3:0)+a.length%3];let c=t-o[t]-1,l=c;for(;c>s;c-=o[c]+1){const d=e[c];if(d.marker===a.marker&&d.open&&d.end<0){let h=!1;if((d.close||a.open)&&(d.length+a.length)%3===0&&(d.length%3!==0||a.length%3!==0)&&(h=!0),!h){const p=c>0&&!e[c-1].open?o[c-1]+1:0;o[i]=i-c+p,o[c]=p,a.open=!1,d.end=i,d.close=!1,l=-1,r=-2;break}}}l!==-1&&(n[a.marker][(a.open?3:0)+(a.length||0)%3]=l)}}function li(e){const n=e.tokens_meta,u=e.tokens_meta.length;Gn(e.delimiters);for(let t=0;t<u;t++)n[t]&&n[t].delimiters&&Gn(n[t].delimiters)}function di(e){let n,u,t=0;const r=e.tokens,o=e.tokens.length;for(n=u=0;n<o;n++)r[n].nesting<0&&t--,r[n].level=t,r[n].nesting>0&&t++,r[n].type==="text"&&n+1<o&&r[n+1].type==="text"?r[n+1].content=r[n].content+r[n+1].content:(n!==u&&(r[u]=r[n]),u++);n!==u&&(r.length=u)}const Ye=[["text",qo],["linkify",jo],["newline",Uo],["escape",Vo],["backticks",$o],["strikethrough",yu.tokenize],["emphasis",ku.tokenize],["link",Jo],["image",Qo],["autolink",ui],["html_inline",ii],["entity",ci]],Xe=[["balance_pairs",li],["strikethrough",yu.postProcess],["emphasis",ku.postProcess],["fragments_join",di]];function Se(){this.ruler=new E;for(let e=0;e<Ye.length;e++)this.ruler.push(Ye[e][0],Ye[e][1]);this.ruler2=new E;for(let e=0;e<Xe.length;e++)this.ruler2.push(Xe[e][0],Xe[e][1])}Se.prototype.skipToken=function(e){const n=e.pos,u=this.ruler.getRules(""),t=u.length,r=e.md.options.maxNesting,o=e.cache;if(typeof o[n]<"u"){e.pos=o[n];return}let i=!1;if(e.level<r){for(let a=0;a<t;a++)if(e.level++,i=u[a](e,!0),e.level--,i){if(n>=e.pos)throw new Error("inline rule didn't increment state.pos");break}}else e.pos=e.posMax;i||e.pos++,o[n]=e.pos};Se.prototype.tokenize=function(e){const n=this.ruler.getRules(""),u=n.length,t=e.posMax,r=e.md.options.maxNesting;for(;e.pos<t;){const o=e.pos;let i=!1;if(e.level<r){for(let a=0;a<u;a++)if(i=n[a](e,!1),i){if(o>=e.pos)throw new Error("inline rule didn't increment state.pos");break}}if(i){if(e.pos>=t)break;continue}e.pending+=e.src[e.pos++]}e.pending&&e.pushPending()};Se.prototype.parse=function(e,n,u,t){const r=new this.State(e,n,u,t);this.tokenize(r);const o=this.ruler2.getRules(""),i=o.length;for(let a=0;a<i;a++)o[a](r)};Se.prototype.State=we;function fi(e){const n={};e=e||{},n.src_Any=au.source,n.src_Cc=su.source,n.src_Z=lu.source,n.src_P=fn.source,n.src_ZPCc=[n.src_Z,n.src_P,n.src_Cc].join("|"),n.src_ZCc=[n.src_Z,n.src_Cc].join("|");const u="[><｜]";return n.src_pseudo_letter="(?:(?!"+u+"|"+n.src_ZPCc+")"+n.src_Any+")",n.src_ip4="(?:(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)",n.src_auth="(?:(?:(?!"+n.src_ZCc+"|[@/\\[\\]()]).)+@)?",n.src_port="(?::(?:6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5])))|[1-5]?\\d{1,4}))?",n.src_host_terminator="(?=$|"+u+"|"+n.src_ZPCc+")(?!"+(e["---"]?"-(?!--)|":"-|")+"_|:\\d|\\.-|\\.(?!$|"+n.src_ZPCc+"))",n.src_path="(?:[/?#](?:(?!"+n.src_ZCc+"|"+u+`|[()[\\]{}.,"'?!\\-;]).|\\[(?:(?!`+n.src_ZCc+"|\\]).)*\\]|\\((?:(?!"+n.src_ZCc+"|[)]).)*\\)|\\{(?:(?!"+n.src_ZCc+'|[}]).)*\\}|\\"(?:(?!'+n.src_ZCc+`|["]).)+\\"|\\'(?:(?!`+n.src_ZCc+"|[']).)+\\'|\\'(?="+n.src_pseudo_letter+"|[-])|\\.{2,}[a-zA-Z0-9%/&]|\\.(?!"+n.src_ZCc+"|[.]|$)|"+(e["---"]?"\\-(?!--(?:[^-]|$))(?:-*)|":"\\-+|")+",(?!"+n.src_ZCc+"|$)|;(?!"+n.src_ZCc+"|$)|\\!+(?!"+n.src_ZCc+"|[!]|$)|\\?(?!"+n.src_ZCc+"|[?]|$))+|\\/)?",n.src_email_name='[\\-;:&=\\+\\$,\\.a-zA-Z0-9_][\\-;:&=\\+\\$,\\"\\.a-zA-Z0-9_]*',n.src_xn="xn--[a-z0-9\\-]{1,59}",n.src_domain_root="(?:"+n.src_xn+"|"+n.src_pseudo_letter+"{1,63})",n.src_domain="(?:"+n.src_xn+"|(?:"+n.src_pseudo_letter+")|(?:"+n.src_pseudo_letter+"(?:-|"+n.src_pseudo_letter+"){0,61}"+n.src_pseudo_letter+"))",n.src_host="(?:(?:(?:(?:"+n.src_domain+")\\.)*"+n.src_domain+"))",n.tpl_host_fuzzy="(?:"+n.src_ip4+"|(?:(?:(?:"+n.src_domain+")\\.)+(?:%TLDS%)))",n.tpl_host_no_ip_fuzzy="(?:(?:(?:"+n.src_domain+")\\.)+(?:%TLDS%))",n.src_host_strict=n.src_host+n.src_host_terminator,n.tpl_host_fuzzy_strict=n.tpl_host_fuzzy+n.src_host_terminator,n.src_host_port_strict=n.src_host+n.src_port+n.src_host_terminator,n.tpl_host_port_fuzzy_strict=n.tpl_host_fuzzy+n.src_port+n.src_host_terminator,n.tpl_host_port_no_ip_fuzzy_strict=n.tpl_host_no_ip_fuzzy+n.src_port+n.src_host_terminator,n.tpl_host_fuzzy_test="localhost|www\\.|\\.\\d{1,3}\\.|(?:\\.(?:%TLDS%)(?:"+n.src_ZPCc+"|>|$))",n.tpl_email_fuzzy="(^|"+u+'|"|\\(|'+n.src_ZCc+")("+n.src_email_name+"@"+n.tpl_host_fuzzy_strict+")",n.tpl_link_fuzzy="(^|(?![.:/\\-_@])(?:[$+<=>^`|｜]|"+n.src_ZPCc+"))((?![$+<=>^`|｜])"+n.tpl_host_port_fuzzy_strict+n.src_path+")",n.tpl_link_no_ip_fuzzy="(^|(?![.:/\\-_@])(?:[$+<=>^`|｜]|"+n.src_ZPCc+"))((?![$+<=>^`|｜])"+n.tpl_host_port_no_ip_fuzzy_strict+n.src_path+")",n}function on(e){return Array.prototype.slice.call(arguments,1).forEach(function(u){u&&Object.keys(u).forEach(function(t){e[t]=u[t]})}),e}function Be(e){return Object.prototype.toString.call(e)}function pi(e){return Be(e)==="[object String]"}function hi(e){return Be(e)==="[object Object]"}function bi(e){return Be(e)==="[object RegExp]"}function jn(e){return Be(e)==="[object Function]"}function mi(e){return e.replace(/[.?*+^$[\]\\(){}|-]/g,"\\$&")}const Cu={fuzzyLink:!0,fuzzyEmail:!0,fuzzyIP:!1};function gi(e){return Object.keys(e||{}).reduce(function(n,u){return n||Cu.hasOwnProperty(u)},!1)}const xi={"http:":{validate:function(e,n,u){const t=e.slice(n);return u.re.http||(u.re.http=new RegExp("^\\/\\/"+u.re.src_auth+u.re.src_host_port_strict+u.re.src_path,"i")),u.re.http.test(t)?t.match(u.re.http)[0].length:0}},"https:":"http:","ftp:":"http:","//":{validate:function(e,n,u){const t=e.slice(n);return u.re.no_http||(u.re.no_http=new RegExp("^"+u.re.src_auth+"(?:localhost|(?:(?:"+u.re.src_domain+")\\.)+"+u.re.src_domain_root+")"+u.re.src_port+u.re.src_host_terminator+u.re.src_path,"i")),u.re.no_http.test(t)?n>=3&&e[n-3]===":"||n>=3&&e[n-3]==="/"?0:t.match(u.re.no_http)[0].length:0}},"mailto:":{validate:function(e,n,u){const t=e.slice(n);return u.re.mailto||(u.re.mailto=new RegExp("^"+u.re.src_email_name+"@"+u.re.src_host_strict,"i")),u.re.mailto.test(t)?t.match(u.re.mailto)[0].length:0}}},_i="a[cdefgilmnoqrstuwxz]|b[abdefghijmnorstvwyz]|c[acdfghiklmnoruvwxyz]|d[ejkmoz]|e[cegrstu]|f[ijkmor]|g[abdefghilmnpqrstuwy]|h[kmnrtu]|i[delmnoqrst]|j[emop]|k[eghimnprwyz]|l[abcikrstuvy]|m[acdeghklmnopqrstuvwxyz]|n[acefgilopruz]|om|p[aefghklmnrstwy]|qa|r[eosuw]|s[abcdeghijklmnortuvxyz]|t[cdfghjklmnortvwz]|u[agksyz]|v[aceginu]|w[fs]|y[et]|z[amw]",yi="biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|рф".split("|");function ki(e){return function(n,u){const t=n.slice(u);return e.test(t)?t.match(e)[0].length:0}}function Un(){return function(e,n){n.normalize(e)}}function Pe(e){const n=e.re=fi(e.__opts__),u=e.__tlds__.slice();e.onCompile(),e.__tlds_replaced__||u.push(_i),u.push(n.src_xn),n.src_tlds=u.join("|");function t(a){return a.replace("%TLDS%",n.src_tlds)}n.email_fuzzy=RegExp(t(n.tpl_email_fuzzy),"i"),n.email_fuzzy_global=RegExp(t(n.tpl_email_fuzzy),"ig"),n.link_fuzzy=RegExp(t(n.tpl_link_fuzzy),"i"),n.link_fuzzy_global=RegExp(t(n.tpl_link_fuzzy),"ig"),n.link_no_ip_fuzzy=RegExp(t(n.tpl_link_no_ip_fuzzy),"i"),n.link_no_ip_fuzzy_global=RegExp(t(n.tpl_link_no_ip_fuzzy),"ig"),n.host_fuzzy_test=RegExp(t(n.tpl_host_fuzzy_test),"i");const r=[];e.__compiled__={};function o(a,s){throw new Error('(LinkifyIt) Invalid schema "'+a+'": '+s)}Object.keys(e.__schemas__).forEach(function(a){const s=e.__schemas__[a];if(s===null)return;const c={validate:null,link:null};if(e.__compiled__[a]=c,hi(s)){bi(s.validate)?c.validate=ki(s.validate):jn(s.validate)?c.validate=s.validate:o(a,s),jn(s.normalize)?c.normalize=s.normalize:s.normalize?o(a,s):c.normalize=Un();return}if(pi(s)){r.push(a);return}o(a,s)}),r.forEach(function(a){e.__compiled__[e.__schemas__[a]]&&(e.__compiled__[a].validate=e.__compiled__[e.__schemas__[a]].validate,e.__compiled__[a].normalize=e.__compiled__[e.__schemas__[a]].normalize)}),e.__compiled__[""]={validate:null,normalize:Un()};const i=Object.keys(e.__compiled__).filter(function(a){return a.length>0&&e.__compiled__[a]}).map(mi).join("|");e.re.schema_test=RegExp("(^|(?!_)(?:[><｜]|"+n.src_ZPCc+"))("+i+")","i"),e.re.schema_search=RegExp("(^|(?!_)(?:[><｜]|"+n.src_ZPCc+"))("+i+")","ig"),e.re.schema_at_start=RegExp("^"+e.re.schema_search.source,"i"),e.re.pretest=RegExp("("+e.re.schema_test.source+")|("+e.re.host_fuzzy_test.source+")|@","i")}function wu(e,n,u,t){const r=e.slice(u,t);this.schema=n.toLowerCase(),this.index=u,this.lastIndex=t,this.raw=r,this.text=r,this.url=r}function P(e,n){if(!(this instanceof P))return new P(e,n);n||gi(e)&&(n=e,e={}),this.__opts__=on({},Cu,n),this.__schemas__=on({},xi,e),this.__compiled__={},this.__tlds__=yi,this.__tlds_replaced__=!1,this.re={},Pe(this)}P.prototype.add=function(n,u){return this.__schemas__[n]=u,Pe(this),this};P.prototype.set=function(n){return this.__opts__=on(this.__opts__,n),this};P.prototype.test=function(n){if(!n.length)return!1;let u,t;if(this.re.schema_test.test(n)){for(t=this.re.schema_search,t.lastIndex=0;(u=t.exec(n))!==null;)if(this.testSchemaAt(n,u[2],t.lastIndex))return!0}return!!(this.__opts__.fuzzyLink&&this.__compiled__["http:"]&&n.search(this.re.host_fuzzy_test)>=0&&n.match(this.__opts__.fuzzyIP?this.re.link_fuzzy:this.re.link_no_ip_fuzzy)!==null||this.__opts__.fuzzyEmail&&this.__compiled__["mailto:"]&&n.indexOf("@")>=0&&n.match(this.re.email_fuzzy)!==null)};P.prototype.pretest=function(n){return this.re.pretest.test(n)};P.prototype.testSchemaAt=function(n,u,t){return this.__compiled__[u.toLowerCase()]?this.__compiled__[u.toLowerCase()].validate(n,t,this):0};P.prototype.match=function(n){const u=[],t=[],r=[],o=[];let i,a,s;function c(h,p){return h?p?h.index!==p.index?h.index<p.index?h:p:h.lastIndex>=p.lastIndex?h:p:h:p}if(!n.length)return null;if(this.re.schema_test.test(n))for(s=this.re.schema_search,s.lastIndex=0;(i=s.exec(n))!==null;)a=this.testSchemaAt(n,i[2],s.lastIndex),a&&t.push({schema:i[2],index:i.index+i[1].length,lastIndex:i.index+i[0].length+a});if(this.__opts__.fuzzyLink&&this.__compiled__["http:"])for(s=this.__opts__.fuzzyIP?this.re.link_fuzzy_global:this.re.link_no_ip_fuzzy_global,s.lastIndex=0;(i=s.exec(n))!==null;)r.push({schema:"",index:i.index+i[1].length,lastIndex:i.index+i[0].length});if(this.__opts__.fuzzyEmail&&this.__compiled__["mailto:"])for(s=this.re.email_fuzzy_global,s.lastIndex=0;(i=s.exec(n))!==null;)o.push({schema:"mailto:",index:i.index+i[1].length,lastIndex:i.index+i[0].length});const l=[0,0,0];let d=0;for(;;){const h=[t[l[0]],o[l[1]],r[l[2]]],p=c(c(h[0],h[1]),h[2]);if(!p)break;if(p===h[0]?l[0]++:p===h[1]?l[1]++:l[2]++,p.index<d)continue;const f=new wu(n,p.schema,p.index,p.lastIndex);this.__compiled__[f.schema].normalize(f,this),u.push(f),d=p.lastIndex}return u.length?u:null};P.prototype.matchAtStart=function(n){if(!n.length)return null;const u=this.re.schema_at_start.exec(n);if(!u)return null;const t=this.testSchemaAt(n,u[2],u[0].length);if(!t)return null;const r=new wu(n,u[2],u.index+u[1].length,u.index+u[0].length+t);return this.__compiled__[r.schema].normalize(r,this),r};P.prototype.tlds=function(n,u){return n=Array.isArray(n)?n:[n],u?(this.__tlds__=this.__tlds__.concat(n).sort().filter(function(t,r,o){return t!==o[r-1]}).reverse(),Pe(this),this):(this.__tlds__=n.slice(),this.__tlds_replaced__=!0,Pe(this),this)};P.prototype.normalize=function(n){n.schema||(n.url="http://"+n.url),n.schema==="mailto:"&&!/^mailto:/i.test(n.url)&&(n.url="mailto:"+n.url)};P.prototype.onCompile=function(){};const ue=2147483647,W=36,gn=1,xe=26,Ci=38,wi=700,Su=72,vu=128,Tu="-",Si=/^xn--/,vi=/[^\0-\x7F]/,Ti=/[\x2E\u3002\uFF0E\uFF61]/g,Ri={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},Je=W-gn,O=Math.floor,Qe=String.fromCharCode;function U(e){throw new RangeError(Ri[e])}function Di(e,n){const u=[];let t=e.length;for(;t--;)u[t]=n(e[t]);return u}function Ru(e,n){const u=e.split("@");let t="";u.length>1&&(t=u[0]+"@",e=u[1]),e=e.replace(Ti,".");const r=e.split("."),o=Di(r,n).join(".");return t+o}function Du(e){const n=[];let u=0;const t=e.length;for(;u<t;){const r=e.charCodeAt(u++);if(r>=55296&&r<=56319&&u<t){const o=e.charCodeAt(u++);(o&64512)==56320?n.push(((r&1023)<<10)+(o&1023)+65536):(n.push(r),u--)}else n.push(r)}return n}const Ei=e=>String.fromCodePoint(...e),Pi=function(e){return e>=48&&e<58?26+(e-48):e>=65&&e<91?e-65:e>=97&&e<123?e-97:W},Vn=function(e,n){return e+22+75*(e<26)-((n!=0)<<5)},Eu=function(e,n,u){let t=0;for(e=u?O(e/wi):e>>1,e+=O(e/n);e>Je*xe>>1;t+=W)e=O(e/Je);return O(t+(Je+1)*e/(e+Ci))},Pu=function(e){const n=[],u=e.length;let t=0,r=vu,o=Su,i=e.lastIndexOf(Tu);i<0&&(i=0);for(let a=0;a<i;++a)e.charCodeAt(a)>=128&&U("not-basic"),n.push(e.charCodeAt(a));for(let a=i>0?i+1:0;a<u;){const s=t;for(let l=1,d=W;;d+=W){a>=u&&U("invalid-input");const h=Pi(e.charCodeAt(a++));h>=W&&U("invalid-input"),h>O((ue-t)/l)&&U("overflow"),t+=h*l;const p=d<=o?gn:d>=o+xe?xe:d-o;if(h<p)break;const f=W-p;l>O(ue/f)&&U("overflow"),l*=f}const c=n.length+1;o=Eu(t-s,c,s==0),O(t/c)>ue-r&&U("overflow"),r+=O(t/c),t%=c,n.splice(t++,0,r)}return String.fromCodePoint(...n)},Au=function(e){const n=[];e=Du(e);const u=e.length;let t=vu,r=0,o=Su;for(const s of e)s<128&&n.push(Qe(s));const i=n.length;let a=i;for(i&&n.push(Tu);a<u;){let s=ue;for(const l of e)l>=t&&l<s&&(s=l);const c=a+1;s-t>O((ue-r)/c)&&U("overflow"),r+=(s-t)*c,t=s;for(const l of e)if(l<t&&++r>ue&&U("overflow"),l===t){let d=r;for(let h=W;;h+=W){const p=h<=o?gn:h>=o+xe?xe:h-o;if(d<p)break;const f=d-p,m=W-p;n.push(Qe(Vn(p+f%m,0))),d=O(f/m)}n.push(Qe(Vn(d,0))),o=Eu(r,c,a===i),r=0,++a}++r,++t}return n.join("")},Ai=function(e){return Ru(e,function(n){return Si.test(n)?Pu(n.slice(4).toLowerCase()):n})},Fi=function(e){return Ru(e,function(n){return vi.test(n)?"xn--"+Au(n):n})},Fu={version:"2.3.1",ucs2:{decode:Du,encode:Ei},decode:Pu,encode:Au,toASCII:Fi,toUnicode:Ai},Ii={options:{html:!1,xhtmlOut:!1,breaks:!1,langPrefix:"language-",linkify:!1,typographer:!1,quotes:"“”‘’",highlight:null,maxNesting:100},components:{core:{},block:{},inline:{}}},Li={options:{html:!1,xhtmlOut:!1,breaks:!1,langPrefix:"language-",linkify:!1,typographer:!1,quotes:"“”‘’",highlight:null,maxNesting:20},components:{core:{rules:["normalize","block","inline","text_join"]},block:{rules:["paragraph"]},inline:{rules:["text"],rules2:["balance_pairs","fragments_join"]}}},Mi={options:{html:!0,xhtmlOut:!0,breaks:!1,langPrefix:"language-",linkify:!1,typographer:!1,quotes:"“”‘’",highlight:null,maxNesting:20},components:{core:{rules:["normalize","block","inline","text_join"]},block:{rules:["blockquote","code","fence","heading","hr","html_block","lheading","list","reference","paragraph"]},inline:{rules:["autolink","backticks","emphasis","entity","escape","html_inline","image","link","newline","text"],rules2:["balance_pairs","emphasis","fragments_join"]}}},Wi={default:Ii,zero:Li,commonmark:Mi},Oi=/^(vbscript|javascript|file|data):/,Ni=/^data:image\/(gif|png|jpeg|webp);/;function Hi(e){const n=e.trim().toLowerCase();return Oi.test(n)?Ni.test(n):!0}const Iu=["http:","https:","mailto:"];function zi(e){const n=dn(e,!0);if(n.hostname&&(!n.protocol||Iu.indexOf(n.protocol)>=0))try{n.hostname=Fu.toASCII(n.hostname)}catch{}return Ce(ln(n))}function Bi(e){const n=dn(e,!0);if(n.hostname&&(!n.protocol||Iu.indexOf(n.protocol)>=0))try{n.hostname=Fu.toUnicode(n.hostname)}catch{}return re(ln(n),re.defaultChars+"%")}function A(e,n){if(!(this instanceof A))return new A(e,n);n||pn(e)||(n=e||{},e="default"),this.inline=new Se,this.block=new ze,this.core=new bn,this.renderer=new ce,this.linkify=new P,this.validateLink=Hi,this.normalizeLink=zi,this.normalizeLinkText=Bi,this.utils=Gr,this.helpers=Oe({},$r),this.options={},this.configure(e),n&&this.set(n)}A.prototype.set=function(e){return Oe(this.options,e),this};A.prototype.configure=function(e){const n=this;if(pn(e)){const u=e;if(e=Wi[u],!e)throw new Error('Wrong `markdown-it` preset "'+u+'", check name')}if(!e)throw new Error("Wrong `markdown-it` preset, can't be empty");return e.options&&n.set(e.options),e.components&&Object.keys(e.components).forEach(function(u){e.components[u].rules&&n[u].ruler.enableOnly(e.components[u].rules),e.components[u].rules2&&n[u].ruler2.enableOnly(e.components[u].rules2)}),this};A.prototype.enable=function(e,n){let u=[];Array.isArray(e)||(e=[e]),["core","block","inline"].forEach(function(r){u=u.concat(this[r].ruler.enable(e,!0))},this),u=u.concat(this.inline.ruler2.enable(e,!0));const t=e.filter(function(r){return u.indexOf(r)<0});if(t.length&&!n)throw new Error("MarkdownIt. Failed to enable unknown rule(s): "+t);return this};A.prototype.disable=function(e,n){let u=[];Array.isArray(e)||(e=[e]),["core","block","inline"].forEach(function(r){u=u.concat(this[r].ruler.disable(e,!0))},this),u=u.concat(this.inline.ruler2.disable(e,!0));const t=e.filter(function(r){return u.indexOf(r)<0});if(t.length&&!n)throw new Error("MarkdownIt. Failed to disable unknown rule(s): "+t);return this};A.prototype.use=function(e){const n=[this].concat(Array.prototype.slice.call(arguments,1));return e.apply(e,n),this};A.prototype.parse=function(e,n){if(typeof e!="string")throw new Error("Input data should be a String");const u=new this.core.State(e,this,n);return this.core.process(u),u.tokens};A.prototype.render=function(e,n){return n=n||{},this.renderer.render(this.parse(e,n),this.options,n)};A.prototype.parseInline=function(e,n){const u=new this.core.State(e,this,n);return u.inlineMode=!0,this.core.process(u),u.tokens};A.prototype.renderInline=function(e,n){return n=n||{},this.renderer.render(this.parseInline(e,n),this.options,n)};var $n=!1,ie={false:"push",true:"unshift",after:"push",before:"unshift"},Ae={isPermalinkSymbol:!0};function an(e,n,u,t){var r;if(!$n){var o="Using deprecated markdown-it-anchor permalink option, see https://github.com/valeriangalliat/markdown-it-anchor#permalinks";typeof process=="object"&&process&&process.emitWarning?process.emitWarning(o):console.warn(o),$n=!0}var i=[Object.assign(new u.Token("link_open","a",1),{attrs:[].concat(n.permalinkClass?[["class",n.permalinkClass]]:[],[["href",n.permalinkHref(e,u)]],Object.entries(n.permalinkAttrs(e,u)))}),Object.assign(new u.Token("html_block","",0),{content:n.permalinkSymbol,meta:Ae}),new u.Token("link_close","a",-1)];n.permalinkSpace&&u.tokens[t+1].children[ie[n.permalinkBefore]](Object.assign(new u.Token("text","",0),{content:" "})),(r=u.tokens[t+1].children)[ie[n.permalinkBefore]].apply(r,i)}function Lu(e){return"#"+e}function Mu(e){return{}}var qi={class:"header-anchor",symbol:"#",renderHref:Lu,renderAttrs:Mu};function ve(e){function n(u){return u=Object.assign({},n.defaults,u),function(t,r,o,i){return e(t,u,r,o,i)}}return n.defaults=Object.assign({},qi),n.renderPermalinkImpl=e,n}function xn(e){var n=[],u=e.filter(function(t){if(t[0]!=="class")return!0;n.push(t[1])});return n.length>0&&u.unshift(["class",n.join(" ")]),u}var qe=ve(function(e,n,u,t,r){var o,i=[Object.assign(new t.Token("link_open","a",1),{attrs:xn([].concat(n.class?[["class",n.class]]:[],[["href",n.renderHref(e,t)]],n.ariaHidden?[["aria-hidden","true"]]:[],Object.entries(n.renderAttrs(e,t))))}),Object.assign(new t.Token("html_inline","",0),{content:n.symbol,meta:Ae}),new t.Token("link_close","a",-1)];if(n.space){var a=typeof n.space=="string"?n.space:" ";t.tokens[r+1].children[ie[n.placement]](Object.assign(new t.Token(typeof n.space=="string"?"html_inline":"text","",0),{content:a}))}(o=t.tokens[r+1].children)[ie[n.placement]].apply(o,i)});Object.assign(qe.defaults,{space:!0,placement:"after",ariaHidden:!1});var Z=ve(qe.renderPermalinkImpl);Z.defaults=Object.assign({},qe.defaults,{ariaHidden:!0});var Wu=ve(function(e,n,u,t,r){var o=[Object.assign(new t.Token("link_open","a",1),{attrs:xn([].concat(n.class?[["class",n.class]]:[],[["href",n.renderHref(e,t)]],Object.entries(n.renderAttrs(e,t))))})].concat(n.safariReaderFix?[new t.Token("span_open","span",1)]:[],t.tokens[r+1].children,n.safariReaderFix?[new t.Token("span_close","span",-1)]:[],[new t.Token("link_close","a",-1)]);t.tokens[r+1]=Object.assign(new t.Token("inline","",0),{children:o})});Object.assign(Wu.defaults,{safariReaderFix:!1});var Kn=ve(function(e,n,u,t,r){var o;if(!["visually-hidden","aria-label","aria-describedby","aria-labelledby"].includes(n.style))throw new Error("`permalink.linkAfterHeader` called with unknown style option `"+n.style+"`");if(!["aria-describedby","aria-labelledby"].includes(n.style)&&!n.assistiveText)throw new Error("`permalink.linkAfterHeader` called without the `assistiveText` option in `"+n.style+"` style");if(n.style==="visually-hidden"&&!n.visuallyHiddenClass)throw new Error("`permalink.linkAfterHeader` called without the `visuallyHiddenClass` option in `visually-hidden` style");var i=t.tokens[r+1].children.filter(function(d){return d.type==="text"||d.type==="code_inline"}).reduce(function(d,h){return d+h.content},""),a=[],s=[];if(n.class&&s.push(["class",n.class]),s.push(["href",n.renderHref(e,t)]),s.push.apply(s,Object.entries(n.renderAttrs(e,t))),n.style==="visually-hidden"){if(a.push(Object.assign(new t.Token("span_open","span",1),{attrs:[["class",n.visuallyHiddenClass]]}),Object.assign(new t.Token("text","",0),{content:n.assistiveText(i)}),new t.Token("span_close","span",-1)),n.space){var c=typeof n.space=="string"?n.space:" ";a[ie[n.placement]](Object.assign(new t.Token(typeof n.space=="string"?"html_inline":"text","",0),{content:c}))}a[ie[n.placement]](Object.assign(new t.Token("span_open","span",1),{attrs:[["aria-hidden","true"]]}),Object.assign(new t.Token("html_inline","",0),{content:n.symbol,meta:Ae}),new t.Token("span_close","span",-1))}else a.push(Object.assign(new t.Token("html_inline","",0),{content:n.symbol,meta:Ae}));n.style==="aria-label"?s.push(["aria-label",n.assistiveText(i)]):["aria-describedby","aria-labelledby"].includes(n.style)&&s.push([n.style,e]);var l=[Object.assign(new t.Token("link_open","a",1),{attrs:xn(s)})].concat(a,[new t.Token("link_close","a",-1)]);(o=t.tokens).splice.apply(o,[r+3,0].concat(l)),n.wrapper&&(t.tokens.splice(r,0,Object.assign(new t.Token("html_block","",0),{content:n.wrapper[0]+`
`})),t.tokens.splice(r+3+l.length+1,0,Object.assign(new t.Token("html_block","",0),{content:n.wrapper[1]+`
`})))});function Zn(e,n,u,t){var r=e,o=t;if(u&&Object.prototype.hasOwnProperty.call(n,r))throw new Error("User defined `id` attribute `"+e+"` is not unique. Please fix it in your Markdown to continue.");for(;Object.prototype.hasOwnProperty.call(n,r);)r=e+"-"+o,o+=1;return n[r]=!0,r}function X(e,n){n=Object.assign({},X.defaults,n),e.core.ruler.push("anchor",function(u){for(var t,r={},o=u.tokens,i=Array.isArray(n.level)?(t=n.level,function(d){return t.includes(d)}):(function(d){return function(h){return h>=d}})(n.level),a=0;a<o.length;a++){var s=o[a];if(s.type==="heading_open"&&i(Number(s.tag.substr(1)))){var c=n.getTokensText(o[a+1].children),l=s.attrGet("id");l=l==null?Zn(l=n.slugifyWithState?n.slugifyWithState(c,u):n.slugify(c),r,!1,n.uniqueSlugStartIndex):Zn(l,r,!0,n.uniqueSlugStartIndex),s.attrSet("id",l),n.tabIndex!==!1&&s.attrSet("tabindex",""+n.tabIndex),typeof n.permalink=="function"?n.permalink(l,n,u,a):(n.permalink||n.renderPermalink&&n.renderPermalink!==an)&&n.renderPermalink(l,n,u,a),a=o.indexOf(s),n.callback&&n.callback(s,{slug:l,title:c})}}})}Object.assign(Kn.defaults,{style:"visually-hidden",space:!0,placement:"after",wrapper:null}),X.permalink={__proto__:null,legacy:an,renderHref:Lu,renderAttrs:Mu,makePermalink:ve,linkInsideHeader:qe,ariaHidden:Z,headerLink:Wu,linkAfterHeader:Kn},X.defaults={level:1,slugify:function(e){return encodeURIComponent(String(e).trim().toLowerCase().replace(/\s+/g,"-"))},uniqueSlugStartIndex:1,tabIndex:"-1",getTokensText:function(e){return e.filter(function(n){return["text","code_inline"].includes(n.type)}).map(function(n){return n.content}).join("")},permalink:!1,renderPermalink:an,permalinkClass:Z.defaults.class,permalinkSpace:Z.defaults.space,permalinkSymbol:"¶",permalinkBefore:Z.defaults.placement==="before",permalinkHref:Z.defaults.renderHref,permalinkAttrs:Z.defaults.renderAttrs},X.default=X;const Ou="rtsp-doc-language",ae="overview.md",Nu=new Set(["zh","en"]),Fe={zh:[{group:"开始使用",items:[{title:"项目总览",path:"overview.md"},{title:"在线 Demo",path:"online-demo.md"},{title:"一键安装器",path:"installers.md"},{title:"排障指南",path:"troubleshooting.md"}]},{group:"集成方案",items:[{title:"Chrome 扩展方案",path:"chrome-extension.md"},{title:"Web 组件 Gateway 指引",path:"web-component-gateway.md"},{title:"通用组件方案",path:"universal-components.md"},{title:"桌面免插件",path:"desktop-native.md"},{title:"SDK API",path:"sdk-api.md"},{title:"多路与生命周期",path:"multi-stream-lifecycle.md"}]},{group:"协议与运维",items:[{title:"WebRTC / H.265",path:"webrtc-hevc.md"},{title:"小米摄像头",path:"xiaomi-rtsp.md"},{title:"安全模型",path:"security.md"},{title:"部署发布",path:"deployment.md"},{title:"验证记录",path:"validation.md"}]}],en:[{group:"Getting Started",items:[{title:"Overview",path:"overview.md"},{title:"Online Demo",path:"online-demo.md"},{title:"One-Click Installers",path:"installers.md"},{title:"Troubleshooting",path:"troubleshooting.md"}]},{group:"Integration",items:[{title:"Chrome Extension Runtime",path:"chrome-extension.md"},{title:"Gateway for Web Components",path:"web-component-gateway.md"},{title:"Universal Components",path:"universal-components.md"},{title:"Desktop Without Plugin",path:"desktop-native.md"},{title:"SDK API",path:"sdk-api.md"},{title:"Multi-Stream Lifecycle",path:"multi-stream-lifecycle.md"}]},{group:"Protocols and Ops",items:[{title:"WebRTC / H.265",path:"webrtc-hevc.md"},{title:"Xiaomi via micam",path:"xiaomi-rtsp.md"},{title:"Security Model",path:"security.md"},{title:"Deployment",path:"deployment.md"},{title:"Validation Log",path:"validation.md"}]}]},Yn={zh:{"nav.schemes":"方案","nav.demo":"Demo","nav.sdk":"SDK","nav.docs":"文档","nav.validation":"验证","nav.install":"安装","docs.eyebrow":"Docs","docs.title":"文档","docs.intro":"所有项目文档都可以在这里沉浸式阅读，左侧切换目录，右侧渲染 Markdown 内容。","docs.loading":"正在加载文档…","docs.errorTitle":"文档加载失败","install.detecting":"检测中","install.waitExtension":"等待扩展响应","install.pending":"待检测","install.notFound":"未检测到","install.waitInstall":"等待安装","install.notAllowed":"未授权当前站点","install.allowed":"已授权","install.ok":"正常","installer.mac.label":"macOS 安装器","installer.windows.label":"Windows 安装器","installer.linux.label":"Linux 安装器","installer.mac.copy":"下载 DMG，打开 RTSP Installer.app，按提示完成安装。","installer.windows.copy":"下载 ZIP，解压后打开 RTSP Installer.hta，按提示完成安装。","installer.linux.copy":"下载压缩包，解压后打开 RTSP Installer.desktop 或运行 install-gui.sh。","installer.download":"下载","live.placeholderTitle":"等待真实 RTSP 输入","live.placeholderCopy":"安装 runtime 后，这里会挂载扩展播放器 iframe。","live.stopped":"真实播放已停止。","live.ready":"真实 RTSP 播放器已就绪。","live.recovering":"播放中断，正在自动恢复","live.recovered":"播放已自动恢复。","live.needExtension":"请输入 Chrome 扩展 ID。","live.needUrl":"请输入 rtsp:// 开头的 RTSP URL。","live.waiting":"正在请求 Chrome 扩展播放器。若画面未出现，请检查扩展 ID、origin 授权和 Native Host。","live.timeout":"仍在等待扩展响应。请确认扩展已安装，并已授权当前站点 origin。","live.installReady":"扩展、Native Runtime 和当前站点授权均已就绪。"},en:{"nav.schemes":"Solutions","nav.demo":"Demo","nav.sdk":"SDK","nav.docs":"Docs","nav.validation":"Validation","nav.install":"Install","docs.eyebrow":"Docs","docs.title":"Documentation","docs.intro":"Read the complete project documentation here. Use the sidebar to switch topics; Markdown is rendered as an immersive page.","docs.loading":"Loading documentation...","docs.errorTitle":"Documentation failed to load","install.detecting":"Checking","install.waitExtension":"Waiting for extension","install.pending":"Not checked","install.notFound":"Not detected","install.waitInstall":"Waiting for install","install.notAllowed":"Current site not allowed","install.allowed":"Allowed","install.ok":"OK","installer.mac.label":"macOS Installer","installer.windows.label":"Windows Installer","installer.linux.label":"Linux Installer","installer.mac.copy":"Download the DMG, open RTSP Installer.app, and follow the prompts.","installer.windows.copy":"Download the ZIP, unzip it, open RTSP Installer.hta, and follow the prompts.","installer.linux.copy":"Download the archive, then open RTSP Installer.desktop or run install-gui.sh.","installer.download":"Download","live.placeholderTitle":"Waiting for an RTSP URL","live.placeholderCopy":"After the runtime is installed, the extension player iframe appears here.","live.stopped":"Real playback stopped.","live.ready":"Real RTSP player is ready.","live.recovering":"Playback interrupted. Recovering","live.recovered":"Playback recovered.","live.needExtension":"Enter the Chrome extension ID.","live.needUrl":"Enter an RTSP URL that starts with rtsp://.","live.waiting":"Requesting the Chrome extension player. If no video appears, check the extension ID, origin allowlist, and Native Host.","live.timeout":"Still waiting for the extension. Confirm it is installed and this site origin is allowed.","live.installReady":"Extension, Native Runtime, and current site origin are ready."}};let B=Qi(),se=qu(B);const Gi=Object.assign({"../../docs/articles/rtsp-player-latest-wechat.md":Qu,"../../docs/articles/rtsp-player-wechat.md":et,"../../docs/chrome-extension.md":nt,"../../docs/deployment.md":ut,"../../docs/desktop-native.md":tt,"../../docs/en/chrome-extension.md":rt,"../../docs/en/deployment.md":ot,"../../docs/en/desktop-native.md":it,"../../docs/en/installers.md":at,"../../docs/en/multi-stream-lifecycle.md":st,"../../docs/en/online-demo.md":ct,"../../docs/en/overview.md":lt,"../../docs/en/sdk-api.md":dt,"../../docs/en/security.md":ft,"../../docs/en/troubleshooting.md":pt,"../../docs/en/universal-components.md":ht,"../../docs/en/validation.md":bt,"../../docs/en/web-component-gateway.md":mt,"../../docs/en/webrtc-hevc.md":gt,"../../docs/en/xiaomi-rtsp.md":xt,"../../docs/installers.md":_t,"../../docs/multi-stream-lifecycle.md":yt,"../../docs/online-demo.md":kt,"../../docs/overview.md":Ct,"../../docs/sdk-api.md":wt,"../../docs/security.md":St,"../../docs/troubleshooting.md":vt,"../../docs/universal-components.md":Tt,"../../docs/validation.md":Rt,"../../docs/web-component-gateway.md":Dt,"../../docs/webrtc-hevc.md":Et,"../../docs/xiaomi-rtsp.md":Pt}),ji=Object.assign({"../../docs/assets/contact.jpg":At,"../../docs/assets/donate-alipay.jpg":Ft,"../../docs/assets/donate-wx.jpg":It,"../../docs/assets/mp.png":Lt,"../../docs/assets/public-rtsp-e2e.png":Mt,"../../docs/assets/rtsp-player-latest-architecture.png":Wt,"../../docs/assets/rtsp-player-latest-architecture.svg":Ot,"../../docs/assets/rtsp-player-latest-cover-bg.png":Nt,"../../docs/assets/rtsp-player-latest-cover.png":Ht,"../../docs/assets/rtsp-player-wechat-cover.png":zt}),Ui=new Map(Object.entries(Gi).map(([e,n])=>[Ge(e.replace(/^.*\/docs\//,"")),n])),Vi=new Map(Object.entries(ji).map(([e,n])=>[`/docs/assets/${e.split("/").pop()}`,n])),ee=new A({html:!1,linkify:!0,typographer:!0}).use(X,{slugify:oa,permalink:X.permalink.linkInsideHeader({symbol:"#",placement:"after",class:"docs-anchor",ariaHidden:!0})}),$i=ee.renderer.rules.link_open||((e,n,u,t,r)=>r.renderToken(e,n,u)),Ki=ee.renderer.rules.image||((e,n,u,t,r)=>r.renderToken(e,n,u));ee.renderer.rules.link_open=(e,n,u,t,r)=>{const o=e[n],i=o.attrGet("href");if(i){const a=ra(i,t.currentPath||"overview.md");o.attrSet("href",a),/^https?:\/\//i.test(a)&&(o.attrSet("target","_blank"),o.attrSet("rel","noreferrer"))}return $i(e,n,u,t,r)};ee.renderer.rules.image=(e,n,u,t,r)=>{const o=e[n],i=o.attrGet("src");return i&&o.attrSet("src",$u(i,t.currentPath||"overview.md")),o.attrSet("loading","lazy"),o.attrSet("decoding","async"),Ki(e,n,u,t,r)};ee.renderer.rules.table_open=()=>'<div class="docs-table-wrap"><table>';ee.renderer.rules.table_close=()=>"</table></div>";const Xn=Array.from(document.querySelectorAll("[data-tab]")),Zi=Array.from(document.querySelectorAll("[data-panel]"));for(const e of Xn)e.addEventListener("click",()=>{const n=e.dataset.tab;for(const u of Xn)u.classList.toggle("active",u===e);for(const u of Zi)u.classList.toggle("active",u.dataset.panel===n)});const Yi=Array.from(document.querySelectorAll("main section[id]")),Jn=new Map(Array.from(document.querySelectorAll(".primary-nav a[href^='#']")).map(e=>[e.getAttribute("href").slice(1),e])),Xi=new IntersectionObserver(e=>{const n=e.filter(u=>u.isIntersecting).sort((u,t)=>t.intersectionRatio-u.intersectionRatio)[0];if(n){for(const u of Jn.values())u.removeAttribute("aria-current");Jn.get(n.target.id)?.setAttribute("aria-current","page")}},{rootMargin:"-20% 0px -60% 0px",threshold:[.1,.4,.7]});for(const e of Yi)Xi.observe(e);const _e=document.querySelector("#docs-nav"),te=document.querySelector("#docs-content"),Hu=Array.from(document.querySelectorAll("[data-lang-switch]"));let De="";ju();Uu();for(const e of Hu)e.addEventListener("click",()=>{Gu(e.dataset.langSwitch,{scroll:!1}),kn(),R||Ku()});_e&&te&&(zu(),window.addEventListener("hashchange",()=>{location.hash.startsWith("#docs")&&ye(Qn(),{scroll:!1})}),ye(Qn(),{scroll:!1}));function zu(){_e.innerHTML="";for(const e of Fe[B]||Fe.zh){const n=document.createElement("section");n.className="docs-nav-group";const u=document.createElement("h3");u.textContent=e.group,n.appendChild(u);for(const t of e.items){const r=document.createElement("button");r.type="button",r.dataset.docPath=t.path,r.textContent=t.title,r.addEventListener("click",()=>{history.replaceState(null,"",`#docs/${t.path}`),ye(t.path,{scroll:!0})}),n.appendChild(r)}_e.appendChild(n)}}function Qn(){const e=decodeURIComponent(location.hash||"").match(/^#docs\/(.+)$/),n=ea(e?.[1]||ae);return n.lang&&n.lang!==B&&Gu(n.lang,{reloadDoc:!1}),se.has(n.path)?n.path:ae}async function ye(e,{scroll:n=!1}={}){e=ke(e),se.has(e)||(e=ae),De=e,Bu(e),te.innerHTML=`<div class="docs-loading">${pe(w("docs.loading"))}</div>`;try{const u=na(e),t=Ui.get(u)??await ua(u);te.innerHTML=ta(t,u),Ji(u),n&&document.querySelector("#docs")?.scrollIntoView({block:"start"})}catch(u){te.innerHTML=`
      <div class="docs-error">
        <h2>${pe(w("docs.errorTitle"))}</h2>
        <p>${pe(u?.message||String(u))}</p>
      </div>
    `}}function Bu(e){_e.querySelectorAll("button[data-doc-path]").forEach(n=>{n.classList.toggle("active",n.dataset.docPath===e)})}function Ji(e){te.querySelectorAll("a[href]").forEach(n=>{const u=n.getAttribute("href")||"",t=Vu(u,e);!t||!se.has(t)||n.addEventListener("click",r=>{r.preventDefault(),history.replaceState(null,"",`#docs/${t}`),ye(t,{scroll:!0})})})}function qu(e){const n=Fe[e]||Fe.zh;return new Map(n.flatMap(u=>u.items.map(t=>[t.path,t])))}function w(e){return Yn[B]?.[e]||Yn.zh[e]||e}function Qi(){const e=decodeURIComponent(location.hash||"").match(/^#docs\/(.+)$/)?.[1]||"",n=Ge(e).match(/^(zh|en)\//)?.[1],u=new URLSearchParams(location.search).get("lang"),t=localStorage.getItem(Ou),r=navigator.language?.toLowerCase().startsWith("zh")?"zh":"en";return[n,u,t,r].find(o=>Nu.has(o))||"zh"}function Gu(e,{reloadDoc:n=!0,scroll:u=!1}={}){if(Nu.has(e)&&(B=e,localStorage.setItem(Ou,e),document.documentElement.lang=e==="zh"?"zh-CN":"en",se=qu(e),ju(),Uu(),_e&&(zu(),Bu(De)),n&&te)){const t=se.has(De)?De:ae;location.hash.startsWith("#docs")&&history.replaceState(null,"",`#docs/${t}`),ye(t,{scroll:u})}}function ju(){document.documentElement.lang=B==="zh"?"zh-CN":"en",document.querySelectorAll("[data-i18n]").forEach(e=>{e.textContent=w(e.dataset.i18n)})}function Uu(){for(const e of Hu){const n=e.dataset.langSwitch===B;e.classList.toggle("active",n),e.setAttribute("aria-pressed",String(n))}}function ea(e){const n=Ge(e),u=n.match(/^(zh|en)\/(.+)$/);return{lang:u?.[1]||"",path:ke(u?.[2]||n||ae)}}function na(e){const n=ke(e||ae);return B==="en"?`en/${n}`:n}function Ge(e){return String(e||"").replace(/^\/?docs\//,"").replace(/^\.\//,"").replace(/\/+/g,"/")}function ke(e){return Ge(e).replace(/^(zh|en)\//,"")}function Vu(e,n){if(!e||e.startsWith("#")||/^https?:\/\//i.test(e))return"";const u=e.split("#")[0].split("?")[0];if(!u.endsWith(".md"))return"";if(u.startsWith("/docs/"))return ke(u);const t=n.split("/").slice(0,-1);for(const r of u.split("/"))!r||r==="."||(r===".."?t.pop():t.push(r));return ke(t.join("/"))}async function ua(e){const n=await fetch(`/docs/${e}`);if(!n.ok)throw new Error(`HTTP ${n.status}`);const u=await n.text();if(/^\s*(<!doctype html|<html\b)/i.test(u))throw new Error("Markdown document endpoint returned HTML fallback.");return u}function ta(e,n){const u=e.replace(/^---[\s\S]*?---\s*/,"").replace(/\r\n/g,`
`);return`<div class="docs-markdown">${ee.render(u,{currentPath:n})}</div>`}function $u(e,n){if(/^(https?:)?\/\//i.test(e)||e.startsWith("data:"))return e;const u=`/docs/${n}`.split("/").slice(0,-1);for(const r of e.split("/"))!r||r==="."||(r===".."?u.pop():u.push(r));const t=u.join("/");return Vi.get(t)||t}function ra(e,n){const u=Vu(e,n);return u&&se.has(u)?`#docs/${u}`:/^(https?:)?\/\//i.test(e)||e.startsWith("#")||e.startsWith("/")?e:$u(e,n)}function oa(e){return e.toLowerCase().replace(/<[^>]+>/g,"").replace(/[^\p{Letter}\p{Number}]+/gu,"-").replace(/^-+|-+$/g,"")||"section"}function pe(e){return String(e).replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n])}const j=document.querySelector("#demo-canvas"),en=document.querySelector("#demo-toggle"),ia=document.querySelector("#demo-state"),aa=document.querySelector("#demo-fps"),sa=document.querySelector("#demo-latency"),ca=document.querySelector("#demo-queue"),la=document.querySelector("#demo-dropped");if(j){const e=j.getContext("2d",{alpha:!1});let n=!0,u=0,t=performance.now(),r=60,o=0,i=0,a=0;const s=()=>{const d=j.getBoundingClientRect(),h=Math.min(window.devicePixelRatio||1,2),p=Math.max(320,Math.round(d.width*h)),f=Math.max(180,Math.round(d.height*h));return(j.width!==p||j.height!==f)&&(j.width=p,j.height=f),e.setTransform(h,0,0,h,0,0),{width:p/h,height:f/h,ratio:h}},c=(d,h,p)=>{e.strokeStyle="rgba(143, 184, 216, .12)",e.lineWidth=1;const f=p/30%48;for(let m=-48+f;m<d+48;m+=48)e.beginPath(),e.moveTo(m,0),e.lineTo(m,h),e.stroke();for(let m=-48+f;m<h+48;m+=48)e.beginPath(),e.moveTo(0,m),e.lineTo(d,m),e.stroke()},l=d=>{a||(a=d),n&&(i+=d-a),a=d;const h=i,{width:p,height:f}=s(),m=h/1400%1,g=e.createLinearGradient(0,0,p,f);g.addColorStop(0,"#07110f"),g.addColorStop(.55,"#111716"),g.addColorStop(1,"#1b1d19"),e.fillStyle=g,e.fillRect(0,0,p,f),c(p,f,h),e.fillStyle="rgba(154, 210, 157, .10)",e.fillRect(0,f*m,p,3);const C=f*.66;e.fillStyle="rgba(244, 245, 242, .08)",e.fillRect(0,C,p,f*.18),e.fillStyle="rgba(228, 198, 122, .55)";for(let y=0;y<12;y+=1){const k=(h/9+y*120)%(p+140)-100;e.fillRect(k,C+f*.08,62,3)}const _=h/16%(p+260)-180;e.fillStyle="#8fb8d8",e.fillRect(_,C-28,92,26),e.fillStyle="#dfe8dd",e.fillRect(_+18,C-42,38,16),e.fillStyle="#050706",e.beginPath(),e.arc(_+22,C,7,0,Math.PI*2),e.arc(_+72,C,7,0,Math.PI*2),e.fill();const b=p*.76+Math.sin(h/700)*32,x=f*.46;if(e.strokeStyle="#e4c67a",e.lineWidth=5,e.beginPath(),e.arc(b,x-18,9,0,Math.PI*2),e.moveTo(b,x-8),e.lineTo(b,x+24),e.moveTo(b-18,x+3),e.lineTo(b+18,x+3),e.moveTo(b,x+24),e.lineTo(b-16,x+52),e.moveTo(b,x+24),e.lineTo(b+16,x+52),e.stroke(),e.strokeStyle="rgba(154, 210, 157, .9)",e.lineWidth=2,e.strokeRect(b-38,x-42,76,112),e.fillStyle="rgba(154, 210, 157, .15)",e.fillRect(b-38,x-42,76,18),e.fillStyle="rgba(5, 7, 6, .78)",e.fillRect(14,14,260,82),e.fillStyle="#f4f5f2",e.font="700 18px system-ui, sans-serif",e.fillText("RTSP Online Demo",28,44),e.font="13px system-ui, sans-serif",e.fillStyle="#b6bbb4",e.fillText(new Date().toLocaleTimeString(B==="zh"?"zh-CN":"en-US",{hour12:!1}),28,70),e.fillText("Simulated low-latency preview",112,70),n){u+=1;const y=d-t;if(y>=500){r=Math.round(u*1e3/y),u=0,t=d;const k=42+Math.round(Math.abs(Math.sin(h/900))*18),v=Math.round(Math.abs(Math.sin(h/1300))*1);Math.sin(h/2800)>.995&&(o+=1),aa.textContent=String(r),sa.textContent=`${k}ms`,ca.textContent=String(v),la.textContent=String(o)}}requestAnimationFrame(l)};en?.addEventListener("click",()=>{n=!n,en.textContent=n?"Pause":"Play",en.setAttribute("aria-pressed",String(n)),ia.textContent=n?"Live Preview":"Paused"}),new ResizeObserver(s).observe(j),requestAnimationFrame(l)}const da=document.querySelector("#live-demo-form"),fa=document.querySelector("#live-stop"),Ie=document.querySelector("#live-player-mount"),nn=document.querySelector("#live-demo-status"),J=document.querySelector("#live-extension-id"),Le=document.querySelector("#live-rtsp-url");let R=null,fe=0;const pa="giegomfhcmgebjhdiihnjohoinkbcjbh",eu="rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1",ha=new Set(["rtsp://127.0.0.1:8554/local","rtsp://192.168.28.62:8554/local"]),ba={mac:"/downloads/rtsp-macos-installer.dmg",windows:"/downloads/rtsp-windows-installer.zip",linux:"/downloads/rtsp-linux-installer.tar.gz"},Q=document.querySelector("#install-dialog"),ma=[document.querySelector("#open-install-assistant"),document.querySelector("#hero-install-assistant")].filter(Boolean),ga=Array.from(document.querySelectorAll("[data-install-close]")),xa=document.querySelector("#recheck-install-status"),Me=document.querySelector("#install-extension-status"),_n=document.querySelector("#install-native-status"),yn=document.querySelector("#install-origin-status"),un=document.querySelector("#recommended-installer"),nu=document.querySelector("#installer-recommend-title"),uu=document.querySelector("#installer-recommend-copy"),tu=document.querySelector("#installer-list");let We=!1,sn=0;function M(e,n="neutral"){nn&&(nn.textContent=e,nn.dataset.tone=n)}function _a(e,n){localStorage.setItem("rtsp-demo-extension-id",e),localStorage.setItem("rtsp-demo-url",n)}function ya(){if(J&&(J.value=localStorage.getItem("rtsp-demo-extension-id")||pa),Le){const e=(localStorage.getItem("rtsp-demo-url")||"").trim(),n=ha.has(e)?eu:e||eu;e&&e!==n&&localStorage.setItem("rtsp-demo-url",n),Le.value=n}}function Ku(){Ie&&(Ie.innerHTML=`
    <div class="mount-placeholder">
      <strong>${pe(w("live.placeholderTitle"))}</strong>
      <span>${pe(w("live.placeholderCopy"))}</span>
    </div>
  `)}function ka(){window.clearTimeout(fe),R?.stop&&R.stop(),R=null,Ku(),M(w("live.stopped"),"neutral")}function Ca(){const e=`${navigator.userAgentData?.platform||""} ${navigator.platform||""} ${navigator.userAgent||""}`.toLowerCase();return e.includes("win")?"windows":e.includes("mac")?"mac":e.includes("linux")||e.includes("x11")?"linux":"mac"}function kn(){if(!un||!nu||!uu)return;const e=Ca(),n={mac:w("installer.mac.label"),windows:w("installer.windows.label"),linux:w("installer.linux.label")},u={mac:w("installer.mac.copy"),windows:w("installer.windows.copy"),linux:w("installer.linux.copy")};un.href=ba[e],un.textContent=`${w("installer.download")} ${n[e]}`,nu.textContent=n[e],uu.textContent=u[e],tu&&tu.querySelectorAll("[data-installer-platform]").forEach(t=>{t.hidden=t.dataset.installerPlatform!==e})}function N(e,n,u){e&&(e.textContent=n,e.style.color=u?"var(--green)":"var(--amber)")}function Cn(){kn();const e=Q?.classList.contains("open");Q?.classList.add("open"),Q?.setAttribute("aria-hidden","false"),document.body.style.overflow="hidden",e||wn()}function Zu(){Q?.classList.remove("open"),Q?.setAttribute("aria-hidden","true"),document.body.style.overflow="",sessionStorage.setItem("rtsp-install-assistant-dismissed","1")}function wn(){We=!1,N(Me,w("install.detecting"),!1),window.clearTimeout(sn),sn=window.setTimeout(()=>{We||(N(Me,w("install.notFound"),!1),N(_n,w("install.waitInstall"),!1),N(yn,w("install.waitInstall"),!1))},1200),window.postMessage({type:"RTSP_INSTALL_STATUS_REQUEST"},location.origin)}function wa(e){We=!0,window.clearTimeout(sn);const n=!!(e.installed&&e.extensionId),u=!!e.nativeOk,t=!!e.originAllowed;N(Me,n?`${B==="zh"?"已安装":"Installed"} ${e.extensionId}`:w("install.notFound"),n),N(_n,u?`${w("install.ok")} ${e.nativePort||""}`:e.nativeError||w("install.notFound"),u),N(yn,w(t?"install.allowed":"install.notAllowed"),t),n&&J&&!J.value&&(J.value=e.extensionId,localStorage.setItem("rtsp-demo-extension-id",e.extensionId)),!n||!u||!t?sessionStorage.getItem("rtsp-install-assistant-dismissed")||Cn():Q?.classList.contains("open")&&M(w("live.installReady"),"ok")}for(const e of ma)e.addEventListener("click",Cn);for(const e of ga)e.addEventListener("click",Zu);xa?.addEventListener("click",()=>{wn()});window.addEventListener("keydown",e=>{e.key==="Escape"&&Q?.classList.contains("open")&&Zu()});window.addEventListener("message",e=>{if(e.source!==window||e.origin!==location.origin)return;const n=e.data||{};n.source!=="rtsp-web-player-extension"||n.type!=="RTSP_EXTENSION_STATUS"||wa(n)});ya();kn();window.setTimeout(()=>{wn(),window.setTimeout(()=>{!We&&!sessionStorage.getItem("rtsp-install-assistant-dismissed")&&(N(Me,w("install.notFound"),!1),N(_n,w("install.waitInstall"),!1),N(yn,w("install.waitInstall"),!1),Cn())},1100)},400);da?.addEventListener("submit",e=>{e.preventDefault();const n=J?.value.trim()||"",u=Le?.value.trim()||"";if(!n){M(w("live.needExtension"),"error"),J?.focus();return}if(!u||!u.startsWith("rtsp://")){M(w("live.needUrl"),"error"),Le?.focus();return}_a(n,u),Jt("rtsp-live-player",{extensionId:n}),Ie.innerHTML="",R=document.createElement("rtsp-live-player"),R.setAttribute("extension-id",n),R.setAttribute("url",u),R.setAttribute("autoplay",""),R.setAttribute("controls",""),R.setAttribute("transport","auto"),R.setAttribute("codec","auto"),R.setAttribute("width","100%"),R.setAttribute("height","360"),R.addEventListener("ready",()=>{window.clearTimeout(fe),M(w("live.ready"),"ok")}),R.addEventListener("recovering",t=>{const r=t.detail?.attempt||1,o=t.detail?.maxAttempts||6;M(`${w("live.recovering")} (${r}/${o})...`,"error")}),R.addEventListener("recovered",()=>{M(w("live.recovered"),"ok")}),R.addEventListener("error",t=>{window.clearTimeout(fe);const r=t.detail?.error||"播放器返回错误，请检查 RTSP 地址、鉴权和 H.264 编码。";M(r,"error")}),Ie.appendChild(R),M(w("live.waiting")),window.clearTimeout(fe),fe=window.setTimeout(()=>{M(w("live.timeout"),"error")},5e3)});fa?.addEventListener("click",ka);
