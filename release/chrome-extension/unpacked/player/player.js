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
  'https://rtsp-roan.vercel.app'
];
let player = null;
let parentOrigin = null;
let lastLoggedStatus = '';
let currentStreamId = '';
let activeOptions = null;
let activeOrigin = '';
let playGeneration = 0;
let recoveryAttempts = 0;
let recoveryTimer = 0;
let userStopRequested = false;

const MAX_RECOVERY_ATTEMPTS = 6;
const RECOVERY_BASE_DELAY_MS = 700;
const RECOVERY_MAX_DELAY_MS = 8000;
const WEBSOCKET_FIRST_FRAME_TIMEOUT_MS = 45000;
const WEBSOCKET_KEYFRAME_NOTICE_MS = 3000;
const WEBRTC_FIRST_FRAME_TIMEOUT_MS = 9000;

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

async function startFromOptions(options, eventOrigin, meta = {}) {
  const url = String(options.url || '').trim();
  if (!url) {
    setStatus('等待 RTSP URL…');
    return;
  }
  clearRecoveryTimer();
  userStopRequested = false;
  activeOptions = { ...options, url };
  activeOrigin = eventOrigin;
  if (!meta.recovery) recoveryAttempts = 0;
  const generation = ++playGeneration;
  logPlayer('info', 'play requested', {
    url,
    mediaTransport: options.mediaTransport || normalizeMediaTransport(options.transport),
    codec: options.codec || 'auto',
    eventOrigin,
    recovery: Boolean(meta.recovery),
    recoveryAttempt: recoveryAttempts
  });
  stopPlayer({ userInitiated: false, clearPlayback: false });
  setStatus('正在启动本地 Go 网关…');
  sendParent(eventOrigin, { type: 'RTSP_PLAYER_STARTING' });

  let response;
  try {
    response = await startNativeStream(url, options);
  } catch (err) {
    response = { ok: false, error: err?.message || String(err) };
  }

  if (!response?.ok) {
    const err = response?.error || 'Native runtime start failed';
    logPlayer('error', 'startStream failed', { error: err, url });
    if (meta.recovery) {
      scheduleRecovery(generation, 'native-start-failed', { error: err });
      return;
    }
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
    logPlayer('info', 'attempting WebRTC transport', { codec, streamId: response.streamId });
    const webrtcPlayer = new WebRTCTransportPlayer(canvas, {
      onStatus: (msg, kind) => setStatus(msg, kind),
      onError: (error) => sendParent(eventOrigin, { type: 'RTSP_PLAYER_ERROR', error }),
      onReady: () => sendParent(eventOrigin, { type: 'RTSP_PLAYER_READY' }),
      onHealthy: () => markPlaybackHealthy(generation),
      onRecoverableError: (reason, details) => scheduleRecovery(generation, reason, details)
    });
    player = webrtcPlayer;
    let started = false;
    try {
      started = await webrtcPlayer.connect(url, codec, response.streamId, response.streamToken);
    } catch (err) {
      logPlayer('error', 'WebRTC threw before fallback', { error: err?.message || String(err), streamId: response.streamId });
      setStatus(`WebRTC 启动失败，回退 WebSocket：${err?.message || err}`);
      try { webrtcPlayer.close(); } catch {}
    }
    if (started) {
      currentStreamId = response.streamId || '';
      return;
    }
    await stopNativeStream(response.streamId);
    player = null;
    logPlayer('info', 'falling back to WebSocket transport', { reason: 'webrtc-no-video-or-failed', requested: mediaTransport });
    if (mediaTransport === 'webrtc') {
      setStatus('WebRTC 协商成功但没有收到视频，已切换 WebSocket 低延迟链路。');
    }
    try {
      response = await startNativeStream(url, { ...options, mediaTransport: 'ws-annexb' });
    } catch (err) {
      response = { ok: false, error: err?.message || String(err) };
    }
    if (!response?.ok) {
      const err = response?.error || 'Native runtime WebSocket fallback failed';
      logPlayer('error', 'WebSocket fallback startStream failed', { error: err, url });
      if (meta.recovery) {
        scheduleRecovery(generation, 'native-fallback-start-failed', { error: err });
        return;
      }
      setStatus(err, 'error');
      sendParent(eventOrigin, { type: 'RTSP_PLAYER_ERROR', error: err });
      return;
    }
  } else if (mediaTransport === 'auto' || mediaTransport === 'webrtc') {
    logPlayer('info', 'WebRTC capability probe skipped transport', { codec, canUseWebRTC });
  }

  currentStreamId = response.streamId || '';
  player = new WebCodecsRTSPPlayer(canvas, {
    onStatus: (msg, kind) => setStatus(msg, kind),
    onStats: (stats) => setStats(stats),
    onError: (error) => sendParent(eventOrigin, { type: 'RTSP_PLAYER_ERROR', error }),
    onReady: () => sendParent(eventOrigin, { type: 'RTSP_PLAYER_READY' }),
    onHealthy: () => markPlaybackHealthy(generation),
    onRecoverableError: (reason, details) => scheduleRecovery(generation, reason, details)
  });
  player.connect(response.wsUrl);
}

function startNativeStream(url, options) {
  return chrome.runtime.sendMessage({
    type: 'startStream',
    url,
    transport: options.rtspTransport || (options.transport === 'tcp' ? 'tcp' : 'tcp'),
    mediaTransport: options.mediaTransport || normalizeMediaTransport(options.transport),
    codec: options.codec || 'auto'
  });
}

function stopNativeStream(streamId) {
  if (!streamId) return Promise.resolve();
  return chrome.runtime.sendMessage({ type: 'stopStream', streamId }).catch(() => null);
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

function stopPlayer(options = {}) {
  const userInitiated = options.userInitiated !== false;
  const clearPlayback = options.clearPlayback !== false;
  if (userInitiated) {
    userStopRequested = true;
    clearRecoveryTimer();
    playGeneration++;
  }
  if (clearPlayback) {
    activeOptions = null;
    activeOrigin = '';
    recoveryAttempts = 0;
  }
  const streamId = currentStreamId;
  currentStreamId = '';
  if (player) {
    player.close();
    player = null;
  }
  stopNativeStream(streamId);
  setStats(null);
}

function clearRecoveryTimer() {
  if (recoveryTimer) {
    clearTimeout(recoveryTimer);
    recoveryTimer = 0;
  }
}

function markPlaybackHealthy(generation) {
  if (generation !== playGeneration || userStopRequested) return;
  if (recoveryAttempts > 0) {
    logPlayer('info', 'playback recovered', { attempt: recoveryAttempts });
    sendParent(activeOrigin, { type: 'RTSP_PLAYER_RECOVERED', attempt: recoveryAttempts });
  }
  recoveryAttempts = 0;
}

function scheduleRecovery(generation, reason, details = {}) {
  if (generation !== playGeneration || userStopRequested || !activeOptions || !activeOrigin) return;
  if (recoveryTimer) return;
  if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
    const error = `播放自动恢复失败：${reason}`;
    logPlayer('error', 'recovery exhausted', { reason, details, attempts: recoveryAttempts });
    setStatus(error, 'error');
    sendParent(activeOrigin, { type: 'RTSP_PLAYER_ERROR', error, reason, details });
    return;
  }
  recoveryAttempts++;
  const delay = Math.min(RECOVERY_MAX_DELAY_MS, RECOVERY_BASE_DELAY_MS * (2 ** Math.max(0, recoveryAttempts - 1)));
  const nextOptions = { ...activeOptions };
  if (String(reason || '').startsWith('webrtc') && normalizeMediaTransport(nextOptions.mediaTransport || nextOptions.transport) === 'auto') {
    nextOptions.mediaTransport = 'ws-annexb';
  }
  logPlayer('error', 'recoverable playback failure, scheduling restart', {
    reason,
    details,
    attempt: recoveryAttempts,
    maxAttempts: MAX_RECOVERY_ATTEMPTS,
    delay
  });
  setStatus(`播放中断，正在自动恢复（${recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS}）…`, 'error');
  sendParent(activeOrigin, {
    type: 'RTSP_PLAYER_RECOVERING',
    reason,
    details,
    attempt: recoveryAttempts,
    maxAttempts: MAX_RECOVERY_ATTEMPTS,
    delay
  });
  recoveryTimer = setTimeout(() => {
    recoveryTimer = 0;
    startFromOptions(nextOptions, activeOrigin, { recovery: true });
  }, delay);
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
    this.configuredAt = 0;
    this.lastFrameAt = 0;
    this.reportedHealthy = false;
    this.decoderErrorTimes = [];
    this.recovering = false;
    this.watchdog = 0;
    this.waitingKeyLogged = false;
    this.waitingKeyStatusAt = 0;
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
        this.notifyRecoverable('websocket-closed');
      }
    };
    this.ws.onmessage = (event) => this.handleMessage(event.data);
    this.startWatchdog();
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
        this.notifyRecoverable('gateway-error', { error: msg.error || 'RTSP 错误' });
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
        this.hooks.onStatus?.(`解码错误，正在重建解码器：${msg}`, 'error');
        this.recoverDecoder(msg);
      }
    });
    this.decoder.configure(config);
    this.gotKey = false;
    this.configuredAt = performance.now();
    this.waitingKeyLogged = false;
    this.waitingKeyStatusAt = 0;
    logPlayer('info', 'VideoDecoder configured', { codec });
    this.hooks.onStatus?.(`解码器已就绪：${codec}，等待首个关键帧/起播帧…`, 'ok');
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
    if (!key && !this.gotKey) {
      const now = performance.now();
      if (!this.waitingKeyLogged || now - this.waitingKeyStatusAt > 5000) {
        this.waitingKeyLogged = true;
        this.waitingKeyStatusAt = now;
        logPlayer('info', 'dropping delta frame before first keyframe', { codec: this.codec, timestamp });
        this.hooks.onStatus?.('正在等待摄像头关键帧/起播帧…');
      }
      return;
    }
    if (key && !this.gotKey) {
      this.gotKey = true;
      logPlayer('info', 'first keyframe access unit received', { codec: this.codec, timestamp, bytes: length });
      this.hooks.onStatus?.('已收到关键帧，正在渲染首帧…');
    }
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
      this.hooks.onStatus?.(`送入解码器失败，正在恢复：${err?.message || err}`, 'error');
      this.recoverDecoder(err?.message || String(err));
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
      this.lastFrameAt = performance.now();
      if (!this.reportedHealthy) {
        this.reportedHealthy = true;
        logPlayer('info', 'first rendered WebCodecs frame', {
          codec: this.codec,
          width: frame.displayWidth,
          height: frame.displayHeight
        });
        this.hooks.onStatus?.(`视频已就绪：${frame.displayWidth}x${frame.displayHeight}`, 'ok');
        this.hooks.onReady?.();
        this.hooks.onHealthy?.();
      }
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

  recoverDecoder(error) {
    if (this.closed || this.recovering) return;
    const now = performance.now();
    this.decoderErrorTimes = this.decoderErrorTimes.filter((ts) => now - ts < 10000);
    this.decoderErrorTimes.push(now);
    if (this.decoderErrorTimes.length > 2) {
      this.notifyRecoverable('decoder-error-loop', { error, codec: this.codec, decoderErrors: this.decoderErrorTimes.length });
      return;
    }
    this.recovering = true;
    try {
      if (this.decoder) this.decoder.close();
    } catch {}
    this.decoder = null;
    this.gotKey = false;
    logPlayer('info', 'resetting VideoDecoder after recoverable error', {
      codec: this.codec,
      decoderErrors: this.decoderErrorTimes.length
    });
    setTimeout(() => {
      if (this.closed) return;
      this.recovering = false;
      this.configure(this.codec).catch((err) => {
        this.notifyRecoverable('decoder-reconfigure-failed', { error: err?.message || String(err), codec: this.codec });
      });
    }, 180);
  }

  startWatchdog() {
    if (this.watchdog) return;
    this.watchdog = setInterval(() => {
      if (this.closed || this.recovering) return;
      const now = performance.now();
      if (this.configuredAt && !this.lastFrameAt && now - this.configuredAt > WEBSOCKET_KEYFRAME_NOTICE_MS && !this.waitingKeyLogged) {
        this.waitingKeyLogged = true;
        this.waitingKeyStatusAt = now;
        logPlayer('info', 'waiting for first keyframe after decoder config', { codec: this.codec });
        this.hooks.onStatus?.('正在等待摄像头关键帧/起播帧…');
      }
      if (this.configuredAt && !this.lastFrameAt && now - this.configuredAt > WEBSOCKET_FIRST_FRAME_TIMEOUT_MS) {
        this.notifyRecoverable('video-stall-before-first-frame', { codec: this.codec });
        return;
      }
      if (this.lastFrameAt && now - this.lastFrameAt > 10000) {
        this.notifyRecoverable('video-stall', { codec: this.codec, msSinceFrame: Math.round(now - this.lastFrameAt) });
      }
    }, 2000);
  }

  notifyRecoverable(reason, details = {}) {
    if (this.closed || this.recovering) return;
    this.recovering = true;
    logPlayer('error', 'recoverable WebCodecs playback failure', { reason, details });
    this.hooks.onRecoverableError?.(reason, details);
  }

  close() {
    this.closed = true;
    if (this.watchdog) {
      clearInterval(this.watchdog);
      this.watchdog = 0;
    }
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
    this.lastFrameAt = 0;
    this.recovering = false;
    this.watchdog = 0;
    this.framePromise = new Promise((resolve) => {
      this.resolveFirstFrame = resolve;
    });
  }

  async connect(url, codec, streamId, streamToken) {
    this.pc = new RTCPeerConnection({ iceServers: [] });
    const stream = new MediaStream();
    this.pc.addTransceiver('video', { direction: 'recvonly' });
    this.pc.addEventListener('connectionstatechange', () => {
      const state = this.pc?.connectionState || 'closed';
      logPlayer('info', 'WebRTC connection state changed', { state, codec });
      if (this.gotFrame && (state === 'failed' || state === 'disconnected')) {
        this.notifyRecoverable(`webrtc-connection-${state}`, { codec, state });
      }
    });
    this.pc.addEventListener('iceconnectionstatechange', () => {
      logPlayer('info', 'WebRTC ICE state changed', { state: this.pc?.iceConnectionState || 'closed', codec });
    });
    this.pc.ontrack = (event) => {
      this.gotTrack = true;
      logPlayer('info', 'WebRTC video track received', { codec, trackKind: event.track?.kind });
      event.track?.addEventListener?.('ended', () => {
        this.notifyRecoverable('webrtc-track-ended', { codec });
      });
      event.track?.addEventListener?.('mute', () => {
        setTimeout(() => {
          if (!this.closed && this.gotFrame && performance.now() - this.lastFrameAt > 3500) {
            this.notifyRecoverable('webrtc-track-muted', { codec });
          }
        }, 3600);
      });
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
      offer: this.pc.localDescription?.sdp || offer.sdp,
      streamId,
      streamToken
    });
    if (!response?.ok || !response.answer) {
      logPlayer('error', 'WebRTC native offer failed', { error: response?.error || 'no answer', fallback: response?.fallback, codec: response?.codec || codec });
      this.hooks.onStatus?.(response?.error || 'WebRTC 不可用，回退 WebSocket。');
      this.close();
      return false;
    }
    logPlayer('info', 'WebRTC remote answer received', { codec: response.codec || codec, sdpBytes: response.answer.length });
    await this.pc.setRemoteDescription({ type: 'answer', sdp: response.answer });
    const gotFrame = await promiseWithTimeout(this.framePromise, WEBRTC_FIRST_FRAME_TIMEOUT_MS, false);
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
        this.lastFrameAt = performance.now();
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
    this.startWatchdog();
  }

  markFirstFrame(width, height) {
    if (this.gotFrame || this.closed || !width || !height) return;
    this.gotFrame = true;
    logPlayer('info', 'WebRTC first rendered frame', { width, height });
    this.hooks.onStatus?.(`WebRTC 已就绪：${width}x${height}`, 'ok');
    this.hooks.onReady?.();
    this.hooks.onHealthy?.();
    this.resolveFirstFrame?.(true);
  }

  startWatchdog() {
    if (this.watchdog) return;
    this.watchdog = setInterval(() => {
      if (this.closed || this.recovering || !this.gotFrame) return;
      const now = performance.now();
      if (this.lastFrameAt && now - this.lastFrameAt > 10000) {
        this.notifyRecoverable('webrtc-video-stall', { msSinceFrame: Math.round(now - this.lastFrameAt) });
      }
    }, 2000);
  }

  notifyRecoverable(reason, details = {}) {
    if (this.closed || this.recovering) return;
    this.recovering = true;
    logPlayer('error', 'recoverable WebRTC playback failure', { reason, details });
    this.hooks.onRecoverableError?.(reason, details);
  }

  close() {
    this.closed = true;
    if (this.watchdog) {
      clearInterval(this.watchdog);
      this.watchdog = 0;
    }
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
