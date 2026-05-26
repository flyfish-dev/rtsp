const canvas = document.getElementById('video');
const statusEl = document.getElementById('status');
const statsEl = document.getElementById('stats');
const directBar = document.getElementById('directBar');
const urlInput = document.getElementById('urlInput');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost',
  'http://127.0.0.1',
  'https://localhost',
  'https://rtsp.flyfish.dev',
  'https://rtsp-roan.vercel.app',
  'https://doc.flyfish.dev'
];
let player = null;
let parentOrigin = null;
let lastLoggedStatus = '';

function logPlayer(level, message, details = {}) {
  try {
    chrome.runtime.sendMessage({ type: 'addLog', level, area: 'player', message, details }).catch(() => {});
  } catch {
    // Logging must not affect playback.
  }
}

if (window.top === window) {
  directBar.classList.remove('hidden');
}

playBtn?.addEventListener('click', () => {
  startFromOptions({ url: urlInput.value, autoplay: true, controls: true, rtspTransport: 'tcp', mediaTransport: 'auto', codec: 'auto' }, location.origin);
});
stopBtn?.addEventListener('click', () => stopPlayer());

window.addEventListener('message', async (event) => {
  if (!event.data || !String(event.data.type || '').startsWith('RTSP_PLAYER_')) return;
  if (event.source !== window.parent) return;
  if (event.data.type === 'RTSP_PLAYER_STOP') {
    stopPlayer();
    return;
  }
  if (event.data.type !== 'RTSP_PLAYER_INIT') return;
  if (!(await isParentAllowed(event.origin))) {
    logPlayer('error', 'parent origin rejected', { origin: event.origin });
    sendParent(event.origin, { type: 'RTSP_PLAYER_ERROR', error: `Origin not allowed: ${event.origin}` });
    setStatus(`当前网页来源未授权：${event.origin}`, 'error');
    return;
  }
  parentOrigin = event.origin;
  startFromOptions(event.data, event.origin);
});

async function isParentAllowed(origin) {
  if (origin === 'null') return false;
  const { allowedOrigins = DEFAULT_ALLOWED_ORIGINS } = await chrome.storage.local.get({ allowedOrigins: DEFAULT_ALLOWED_ORIGINS });
  const allowed = withDefaultAllowedOrigins(allowedOrigins);
  return allowed.some((pattern) => originMatches(pattern, origin));
}

function withDefaultAllowedOrigins(origins) {
  const list = Array.isArray(origins) ? origins : [];
  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...list]));
}

function originMatches(pattern, origin) {
  if (pattern === '*') return true;
  if (pattern === origin) return true;
  if (pattern.endsWith('*')) return origin.startsWith(pattern.slice(0, -1));
  return false;
}

async function startFromOptions(options, eventOrigin) {
  const url = String(options.url || '').trim();
  if (!url) {
    setStatus('等待 RTSP URL…');
    return;
  }
  logPlayer('info', 'play requested', {
    url,
    mediaTransport: options.mediaTransport || normalizeMediaTransport(options.transport),
    codec: options.codec || 'auto',
    eventOrigin
  });
  stopPlayer();
  setStatus('正在启动本地 Go 网关…');
  sendParent(eventOrigin, { type: 'RTSP_PLAYER_STARTING' });

  const response = await chrome.runtime.sendMessage({
    type: 'startStream',
    url,
    transport: options.rtspTransport || (options.transport === 'tcp' ? 'tcp' : 'tcp'),
    mediaTransport: options.mediaTransport || normalizeMediaTransport(options.transport),
    codec: options.codec || 'auto'
  });

  if (!response?.ok) {
    const err = response?.error || 'Native runtime start failed';
    logPlayer('error', 'startStream failed', { error: err, url });
    setStatus(err, 'error');
    sendParent(eventOrigin, { type: 'RTSP_PLAYER_ERROR', error: err });
    return;
  }
  logPlayer('info', 'startStream ok', {
    streamId: response.streamId,
    port: response.port,
    mediaTransport: response.mediaTransport,
    codec: response.codec,
    gatewayVersion: response.gatewayVersion || response.version
  });

  const mediaTransport = options.mediaTransport || normalizeMediaTransport(options.transport);
  const codec = options.codec || 'auto';
  const canUseWebRTC = await canAttemptWebRTC(codec);
  if ((mediaTransport === 'auto' || mediaTransport === 'webrtc') && canUseWebRTC) {
    logPlayer('info', 'attempting WebRTC transport', { codec });
    const webrtcPlayer = new WebRTCTransportPlayer(canvas, {
      onStatus: (msg, kind) => setStatus(msg, kind),
      onError: (error) => sendParent(eventOrigin, { type: 'RTSP_PLAYER_ERROR', error }),
      onReady: () => sendParent(eventOrigin, { type: 'RTSP_PLAYER_READY' })
    });
    player = webrtcPlayer;
    let started = false;
    try {
      started = await webrtcPlayer.connect(url, codec);
    } catch (err) {
      logPlayer('error', 'WebRTC threw before fallback', { error: err?.message || String(err) });
      setStatus(`WebRTC 启动失败，回退 WebSocket：${err?.message || err}`);
      try { webrtcPlayer.close(); } catch {}
    }
    if (started) return;
    player = null;
    logPlayer('info', 'falling back to WebSocket transport', { reason: 'webrtc-no-video-or-failed', requested: mediaTransport });
    if (mediaTransport === 'webrtc') {
      setStatus('WebRTC 协商成功但没有收到视频，已切换 WebSocket 低延迟链路。');
    }
  } else if (mediaTransport === 'auto' || mediaTransport === 'webrtc') {
    logPlayer('info', 'WebRTC capability probe skipped transport', { codec, canUseWebRTC });
  }

  player = new WebCodecsRTSPPlayer(canvas, {
    onStatus: (msg, kind) => setStatus(msg, kind),
    onStats: (stats) => setStats(stats),
    onError: (error) => sendParent(eventOrigin, { type: 'RTSP_PLAYER_ERROR', error }),
    onReady: () => sendParent(eventOrigin, { type: 'RTSP_PLAYER_READY' })
  });
  player.connect(response.wsUrl);
}

function normalizeMediaTransport(value) {
  if (value === 'webrtc' || value === 'ws-annexb' || value === 'auto') return value;
  return 'auto';
}

async function canAttemptWebRTC(codec) {
  if (!('RTCPeerConnection' in window)) return false;
  const caps = window.RTCRtpReceiver?.getCapabilities?.('video');
  const names = (caps?.codecs || []).map((item) => String(item.mimeType || '').toLowerCase());
  if (codec === 'h265' || codec === 'hevc') return names.includes('video/h265') || names.includes('video/hevc');
  if (codec === 'h264' || codec === 'avc') return names.includes('video/h264');
  return names.includes('video/h264') || names.includes('video/h265') || names.includes('video/hevc');
}

function stopPlayer() {
  if (player) {
    player.close();
    player = null;
  }
  setStats(null);
}

function sendParent(origin, msg) {
  if (window.parent && window.parent !== window && origin) {
    window.parent.postMessage(msg, origin);
  }
}

function setStatus(msg, kind = '') {
  statusEl.textContent = msg || '';
  statusEl.className = `status ${kind || ''}`;
  const key = `${kind}:${msg || ''}`;
  if (msg && key !== lastLoggedStatus) {
    lastLoggedStatus = key;
    logPlayer(kind === 'error' ? 'error' : 'info', msg, { kind });
  }
}

function setStats(stats) {
  if (!stats) {
    statsEl.textContent = '';
    return;
  }
  statsEl.textContent = `${stats.codec || '-'} · ${stats.frames} frames · ${stats.fps.toFixed(1)} fps · q=${stats.queue}`;
}

class WebCodecsRTSPPlayer {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.ws = null;
    this.decoder = null;
    this.codec = '';
    this.gotKey = false;
    this.closed = false;
    this.frames = 0;
    this.dropped = 0;
    this.lastStatsAt = performance.now();
    this.lastFrames = 0;
    this.lastTimestamp = -1;
    this.pending = [];
  }

  connect(wsUrl) {
    logPlayer('info', 'opening WebSocket media transport');
    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = () => {
      logPlayer('info', 'WebSocket media transport open');
      this.hooks.onStatus?.('已连接本地网关，等待视频参数…', '');
    };
    this.ws.onerror = () => {
      logPlayer('error', 'WebSocket media transport error');
      this.hooks.onStatus?.('WebSocket 连接错误', 'error');
    };
    this.ws.onclose = () => {
      if (!this.closed) {
        logPlayer('error', 'WebSocket media transport closed unexpectedly');
        this.hooks.onStatus?.('视频连接已关闭', 'error');
      }
    };
    this.ws.onmessage = (event) => this.handleMessage(event.data);
  }

  async handleMessage(data) {
    if (typeof data === 'string') {
      let msg;
      try { msg = JSON.parse(data); } catch { return; }
      if (msg.type === 'config') {
        logPlayer('info', 'WebSocket codec config received', { codec: msg.codec, mediaTransport: msg.mediaTransport });
        await this.configure(msg.codec);
      } else if (msg.type === 'error') {
        logPlayer('error', 'Gateway reported stream error', { error: msg.error || 'RTSP 错误' });
        this.hooks.onStatus?.(msg.error || 'RTSP 错误', 'error');
        this.hooks.onError?.(msg.error || 'RTSP 错误');
      }
      return;
    }
    if (!(data instanceof ArrayBuffer)) return;
    this.handleAccessUnit(data);
  }

  async configure(codec) {
    if (!codec) codec = 'avc1.42E01E';
    if (this.decoder && this.codec === codec) return;
    this.codec = codec;
    if (this.decoder) {
      try { this.decoder.close(); } catch {}
    }
    const config = {
      codec,
      hardwareAcceleration: 'prefer-hardware',
      optimizeForLatency: true
    };
    if (!('VideoDecoder' in window)) {
      logPlayer('error', 'VideoDecoder is not available');
      this.hooks.onStatus?.('当前浏览器不支持 WebCodecs VideoDecoder', 'error');
      return;
    }
    try {
      const support = await VideoDecoder.isConfigSupported(config);
      if (!support.supported) {
        logPlayer('error', 'VideoDecoder config is not supported', { codec });
        this.hooks.onStatus?.(`浏览器不支持该 H.264 配置：${codec}`, 'error');
        return;
      }
    } catch {
      // Some Chromium builds throw for feature-probe but still decode after configure.
    }
    this.decoder = new VideoDecoder({
      output: (frame) => this.render(frame),
      error: (err) => {
        const msg = err?.message || String(err);
        logPlayer('error', 'VideoDecoder error', { error: msg, codec: this.codec });
        this.hooks.onStatus?.(`解码错误：${msg}`, 'error');
        this.hooks.onError?.(msg);
      }
    });
    this.decoder.configure(config);
    this.gotKey = false;
    logPlayer('info', 'VideoDecoder configured', { codec });
    this.hooks.onStatus?.(`解码器已就绪：${codec}`, 'ok');
    this.hooks.onReady?.();
  }

  handleAccessUnit(buffer) {
    if (buffer.byteLength < 16) return;
    const view = new DataView(buffer);
    const msgType = view.getUint8(0);
    if (msgType !== 1) return;
    const key = view.getUint8(1) === 1;
    let timestamp = Number(view.getBigUint64(4, true));
    const length = view.getUint32(12, true);
    if (length <= 0 || 16 + length > buffer.byteLength) return;
    if (!this.decoder || this.decoder.state !== 'configured') return;
    if (!key && !this.gotKey) return;
    if (key) this.gotKey = true;
    if (timestamp <= this.lastTimestamp) timestamp = this.lastTimestamp + 1;
    this.lastTimestamp = timestamp;

    if (!key && this.decoder.decodeQueueSize > 6) {
      this.dropped++;
      return;
    }
    const payload = new Uint8Array(buffer, 16, length);
    try {
      const chunk = new EncodedVideoChunk({
        type: key ? 'key' : 'delta',
        timestamp,
        data: payload
      });
      this.decoder.decode(chunk);
    } catch (err) {
      logPlayer('error', 'EncodedVideoChunk decode enqueue failed', { error: err?.message || String(err), codec: this.codec });
      this.hooks.onStatus?.(`送入解码器失败：${err?.message || err}`, 'error');
    }
  }

  render(frame) {
    try {
      if (this.canvas.width !== frame.displayWidth || this.canvas.height !== frame.displayHeight) {
        this.canvas.width = frame.displayWidth;
        this.canvas.height = frame.displayHeight;
      }
      this.ctx.drawImage(frame, 0, 0, this.canvas.width, this.canvas.height);
      this.frames++;
      const now = performance.now();
      if (now - this.lastStatsAt >= 1000) {
        const fps = (this.frames - this.lastFrames) * 1000 / (now - this.lastStatsAt);
        this.hooks.onStats?.({ codec: this.codec, frames: this.frames, fps, queue: this.decoder?.decodeQueueSize ?? 0, dropped: this.dropped });
        this.lastFrames = this.frames;
        this.lastStatsAt = now;
      }
    } finally {
      frame.close();
    }
  }

  close() {
    this.closed = true;
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    if (this.decoder) {
      try { this.decoder.close(); } catch {}
      this.decoder = null;
    }
  }
}

class WebRTCTransportPlayer {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.pc = null;
    this.video = null;
    this.closed = false;
    this.gotTrack = false;
    this.gotFrame = false;
    this.framePromise = new Promise((resolve) => {
      this.resolveFirstFrame = resolve;
    });
  }

  async connect(url, codec) {
    this.pc = new RTCPeerConnection({ iceServers: [] });
    const stream = new MediaStream();
    this.pc.addTransceiver('video', { direction: 'recvonly' });
    this.pc.addEventListener('connectionstatechange', () => {
      logPlayer('info', 'WebRTC connection state changed', { state: this.pc?.connectionState || 'closed', codec });
    });
    this.pc.addEventListener('iceconnectionstatechange', () => {
      logPlayer('info', 'WebRTC ICE state changed', { state: this.pc?.iceConnectionState || 'closed', codec });
    });
    this.pc.ontrack = (event) => {
      this.gotTrack = true;
      logPlayer('info', 'WebRTC video track received', { codec, trackKind: event.track?.kind });
      stream.addTrack(event.track);
      this.attachVideo(stream);
      this.hooks.onStatus?.('WebRTC 已收到视频轨道，等待首帧…');
    };
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await waitForIceGathering(this.pc);
    logPlayer('info', 'WebRTC local offer ready', { codec, sdpBytes: String(this.pc.localDescription?.sdp || offer.sdp || '').length });
    const response = await chrome.runtime.sendMessage({
      type: 'createWebRTCOffer',
      url,
      codec,
      offer: this.pc.localDescription?.sdp || offer.sdp
    });
    if (!response?.ok || !response.answer) {
      logPlayer('error', 'WebRTC native offer failed', { error: response?.error || 'no answer', fallback: response?.fallback, codec: response?.codec || codec });
      this.hooks.onStatus?.(response?.error || 'WebRTC 不可用，回退 WebSocket。');
      this.close();
      return false;
    }
    logPlayer('info', 'WebRTC remote answer received', { codec: response.codec || codec, sdpBytes: response.answer.length });
    await this.pc.setRemoteDescription({ type: 'answer', sdp: response.answer });
    const gotFrame = await promiseWithTimeout(this.framePromise, 2200, false);
    if (gotFrame) return true;
    logPlayer('error', 'WebRTC negotiated but no rendered frame arrived', {
      codec,
      gotTrack: this.gotTrack,
      connectionState: this.pc?.connectionState,
      iceConnectionState: this.pc?.iceConnectionState
    });
    this.hooks.onStatus?.('WebRTC 未收到可渲染视频帧，回退 WebSocket。');
    this.close();
    return false;
  }

  attachVideo(stream) {
    const video = document.createElement('video');
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = stream;
    video.play().catch(() => {});
    this.video = video;
    const draw = () => {
      if (this.closed || !this.video) return;
      if (video.videoWidth && video.videoHeight) {
        if (this.canvas.width !== video.videoWidth || this.canvas.height !== video.videoHeight) {
          this.canvas.width = video.videoWidth;
          this.canvas.height = video.videoHeight;
        }
        this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
        this.markFirstFrame(video.videoWidth, video.videoHeight);
      }
      requestAnimationFrame(draw);
    };
    if ('requestVideoFrameCallback' in video) {
      video.requestVideoFrameCallback(() => {
        this.markFirstFrame(video.videoWidth, video.videoHeight);
      });
    }
    requestAnimationFrame(draw);
  }

  markFirstFrame(width, height) {
    if (this.gotFrame || this.closed || !width || !height) return;
    this.gotFrame = true;
    logPlayer('info', 'WebRTC first rendered frame', { width, height });
    this.hooks.onStatus?.(`WebRTC 已就绪：${width}x${height}`, 'ok');
    this.hooks.onReady?.();
    this.resolveFirstFrame?.(true);
  }

  close() {
    this.closed = true;
    if (!this.gotFrame) this.resolveFirstFrame?.(false);
    if (this.pc) {
      try { this.pc.close(); } catch {}
      this.pc = null;
    }
    if (this.video) {
      try { this.video.srcObject = null; } catch {}
      this.video = null;
    }
  }
}

function waitForIceGathering(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(done, 1200);
    function done() {
      clearTimeout(timer);
      pc.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    }
    function onChange() {
      if (pc.iceGatheringState === 'complete') done();
    }
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}

function promiseWithTimeout(promise, ms, fallback) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }, () => {
      clearTimeout(timer);
      resolve(fallback);
    });
  });
}
