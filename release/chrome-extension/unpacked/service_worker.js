const NATIVE_HOST = 'com.rtspweb.player';
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost',
  'http://127.0.0.1',
  'https://localhost',
  'https://rtsp.flyfish.dev',
  'https://rtsp-roan.vercel.app',
  'https://doc.flyfish.dev'
];

function sendNative(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendNativeMessage(NATIVE_HOST, message, (response) => {
        const err = chrome.runtime.lastError;
        if (err) {
          resolve({ ok: false, error: err.message || String(err) });
          return;
        }
        resolve(response || { ok: false, error: 'empty native response' });
      });
    } catch (err) {
      resolve({ ok: false, error: err?.message || String(err) });
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (!message || typeof message.type !== 'string') {
      sendResponse({ ok: false, error: 'bad message' });
      return;
    }

    if (message.type === 'nativePing') {
      sendResponse(await sendNative({ type: 'ping' }));
      return;
    }

    if (message.type === 'startStream') {
      const url = String(message.url || '').trim();
      if (!/^rtsps?:\/\//i.test(url)) {
        sendResponse({ ok: false, error: 'RTSP URL must start with rtsp:// or rtsps://' });
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
        sendResponse({ ok: false, error: 'RTSP URL must start with rtsp:// or rtsps://', fallback: 'ws-annexb' });
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
      sendResponse({ ok: true, allowedOrigins: data.allowedOrigins });
      return;
    }

    if (message.type === 'setAllowedOrigins') {
      const allowedOrigins = Array.isArray(message.allowedOrigins) ? message.allowedOrigins.map(String) : [];
      await chrome.storage.local.set({ allowedOrigins });
      sendResponse({ ok: true, allowedOrigins });
      return;
    }

    sendResponse({ ok: false, error: `unknown message type: ${message.type}` });
  })();
  return true;
});

function defaultAllowedOrigins() {
  return DEFAULT_ALLOWED_ORIGINS.slice();
}

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get({ allowedOrigins: null });
  const stored = Array.isArray(data.allowedOrigins) ? data.allowedOrigins.map(String) : [];
  await chrome.storage.local.set({ allowedOrigins: Array.from(new Set([...defaultAllowedOrigins(), ...stored])) });
});
