const NATIVE_HOST = 'com.rtspweb.player';
const LOG_KEY = 'rtspExtensionLogs';
const MAX_EXTENSION_LOGS = 400;
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost',
  'http://127.0.0.1',
  'https://localhost',
  'https://rtsp.flyfish.dev',
  'https://rtsp-roan.vercel.app',
  'https://doc.flyfish.dev'
];
const QUIET_NATIVE_TYPES = new Set(['getDiagnostics', 'getLogs']);
const TRANSIENT_NATIVE_ERRORS = [
  'native host has exited',
  'error when communicating with the native messaging host',
  'specified native messaging host not found'
];

async function sendNative(message) {
  const maxAttempts = QUIET_NATIVE_TYPES.has(message?.type) ? 1 : 2;
  let last = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    last = await sendNativeOnce(message, attempt);
    if (last?.ok || !shouldRetryNative(last?.error) || attempt === maxAttempts) return last;
    await sleep(180);
  }
  return last || { ok: false, error: 'native message failed' };
}

function sendNativeOnce(message, attempt) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendNativeMessage(NATIVE_HOST, message, (response) => {
        const err = chrome.runtime.lastError;
        if (err) {
          const out = { ok: false, error: err.message || String(err) };
          logNativeResult(message, out, attempt);
          resolve(out);
          return;
        }
        const out = response || { ok: false, error: 'empty native response' };
        logNativeResult(message, out, attempt);
        resolve(out);
      });
    } catch (err) {
      const out = { ok: false, error: err?.message || String(err) };
      logNativeResult(message, out, attempt);
      resolve(out);
    }
  });
}

function shouldRetryNative(error) {
  const value = String(error || '').toLowerCase();
  return TRANSIENT_NATIVE_ERRORS.some((item) => value.includes(item));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (!message || typeof message.type !== 'string') {
      sendResponse({ ok: false, error: 'bad message' });
      return;
    }

    if (message.type === 'addLog') {
      await addLog(message.level || 'info', message.area || senderLabel(sender), message.message || '', message.details || {});
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'getExtensionLogs') {
      const data = await chrome.storage.local.get({ [LOG_KEY]: [] });
      sendResponse({ ok: true, logs: Array.isArray(data[LOG_KEY]) ? data[LOG_KEY] : [] });
      return;
    }

    if (message.type === 'clearExtensionLogs') {
      await chrome.storage.local.set({ [LOG_KEY]: [] });
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'getDiagnostics') {
      sendResponse(await sendNative({ type: 'getDiagnostics', maxBytes: Number(message.maxBytes || 0) }));
      return;
    }

    if (message.type === 'getNativeLogs') {
      sendResponse(await sendNative({ type: 'getLogs', maxBytes: Number(message.maxBytes || 0) }));
      return;
    }

    if (message.type === 'clearNativeLogs') {
      sendResponse(await sendNative({ type: 'clearLogs' }));
      return;
    }

    if (message.type === 'stopGateway') {
      sendResponse(await sendNative({ type: 'stopGateway' }));
      return;
    }

    if (message.type === 'nativePing') {
      sendResponse(await sendNative({ type: 'ping' }));
      return;
    }

    if (message.type === 'startStream') {
      const url = String(message.url || '').trim();
      if (!/^rtsps?:\/\//i.test(url)) {
        const error = 'RTSP URL must start with rtsp:// or rtsps://';
        await addLog('error', 'service-worker', error, { url });
        sendResponse({ ok: false, error });
        return;
      }
      sendResponse(await sendNative({
        type: 'startStream',
        url,
        transport: message.rtspTransport || message.transport || 'tcp',
        mediaTransport: message.mediaTransport || 'auto',
        codec: message.codec || 'auto'
      }));
      return;
    }

    if (message.type === 'createWebRTCOffer') {
      const url = String(message.url || '').trim();
      if (!/^rtsps?:\/\//i.test(url)) {
        const error = 'RTSP URL must start with rtsp:// or rtsps://';
        await addLog('error', 'service-worker', error, { url, fallback: 'ws-annexb' });
        sendResponse({ ok: false, error, fallback: 'ws-annexb' });
        return;
      }
      sendResponse(await sendNative({
        type: 'createWebRTCOffer',
        url,
        codec: message.codec || 'auto',
        offer: message.offer || ''
      }));
      return;
    }

    if (message.type === 'getAllowedOrigins') {
      const data = await chrome.storage.local.get({ allowedOrigins: defaultAllowedOrigins() });
      sendResponse({ ok: true, allowedOrigins: withDefaultAllowedOrigins(data.allowedOrigins) });
      return;
    }

    if (message.type === 'setAllowedOrigins') {
      const allowedOrigins = Array.isArray(message.allowedOrigins) ? message.allowedOrigins.map(String) : [];
      await chrome.storage.local.set({ allowedOrigins });
      sendResponse({ ok: true, allowedOrigins: withDefaultAllowedOrigins(allowedOrigins) });
      return;
    }

    sendResponse({ ok: false, error: `unknown message type: ${message.type}` });
  })();
  return true;
});

function defaultAllowedOrigins() {
  return DEFAULT_ALLOWED_ORIGINS.slice();
}

function withDefaultAllowedOrigins(origins) {
  const list = Array.isArray(origins) ? origins : [];
  return Array.from(new Set([...defaultAllowedOrigins(), ...list]));
}

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get({ allowedOrigins: null });
  const stored = Array.isArray(data.allowedOrigins) ? data.allowedOrigins.map(String) : [];
  await chrome.storage.local.set({ allowedOrigins: withDefaultAllowedOrigins(stored) });
  await addLog('info', 'extension', 'extension installed or updated');
});

function logNativeResult(message, response, attempt = 1) {
  if (QUIET_NATIVE_TYPES.has(message?.type)) return;
  const ok = Boolean(response?.ok);
  addLog(ok ? 'info' : 'error', 'native', `native ${message?.type || 'message'} ${ok ? 'ok' : 'failed'}`, {
    attempt,
    request: summarizeNativeMessage(message),
    response: summarizeNativeResponse(response)
  });
}

function summarizeNativeMessage(message) {
  const out = sanitizeForLog(message || {});
  if (out.offer) out.offer = `<sdp ${String(message.offer || '').length} bytes>`;
  return out;
}

function summarizeNativeResponse(response) {
  const out = sanitizeForLog(response || {});
  if (out.answer) out.answer = `<sdp ${String(response.answer || '').length} bytes>`;
  if (out.logs) out.logs = `<log ${String(response.logs || '').length} bytes>`;
  return out;
}

async function addLog(level, area, message, details = {}) {
  try {
    const data = await chrome.storage.local.get({ [LOG_KEY]: [] });
    const logs = Array.isArray(data[LOG_KEY]) ? data[LOG_KEY] : [];
    logs.push({
      ts: new Date().toISOString(),
      level: String(level || 'info'),
      area: String(area || 'extension'),
      message: redactURL(String(message || '')),
      details: sanitizeForLog(details)
    });
    await chrome.storage.local.set({ [LOG_KEY]: logs.slice(-MAX_EXTENSION_LOGS) });
  } catch {
    // Logging must never break playback or extension control messages.
  }
}

function sanitizeForLog(value, depth = 0) {
  if (value == null) return value;
  if (typeof value === 'string') return redactURL(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth > 4) return '[depth-limit]';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeForLog(item, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (/password|secret|token/i.test(key)) {
        out[key] = '***';
      } else {
        out[key] = sanitizeForLog(item, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

function redactURL(value) {
  return value
    .replace(/\b(rtsps?:\/\/)([^/\s@]+)@/gi, '$1***:***@')
    .replace(/([?&]token=)[^&\s]+/gi, '$1***');
}

function senderLabel(sender) {
  if (sender?.tab?.id != null) return `tab-${sender.tab.id}`;
  if (sender?.url) return 'extension-page';
  return 'extension';
}
