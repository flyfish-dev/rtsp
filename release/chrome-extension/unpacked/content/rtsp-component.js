(() => {
  const EXT_ORIGIN = new URL(chrome.runtime.getURL('/')).origin;
  const PLAYER_URL = chrome.runtime.getURL('player/player.html');
  const EXTENSION_STATUS_TYPE = 'RTSP_EXTENSION_STATUS';
  const EXTENSION_STATUS_REQUEST_TYPE = 'RTSP_INSTALL_STATUS_REQUEST';
  const ALLOW_ORIGIN_REQUEST_TYPE = 'RTSP_ALLOW_ORIGIN_REQUEST';
  const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost',
    'http://127.0.0.1',
    'https://localhost',
    'https://rtsp.flyfish.dev',
    'https://rtsp-roan.vercel.app'
  ];
  const mounted = new WeakMap();
  const frames = new Map();
  let allowedOriginsCache = null;

  function logContent(level, message, details = {}) {
    try {
      chrome.runtime.sendMessage({ type: 'addLog', level, area: 'content', message, details }).catch(() => {});
    } catch {
      // Diagnostics must not disturb the host page.
    }
  }

  async function getAllowedOrigins() {
    if (allowedOriginsCache) return allowedOriginsCache;
    try {
      const data = await chrome.storage.local.get({ allowedOrigins: DEFAULT_ALLOWED_ORIGINS });
      allowedOriginsCache = withDefaultAllowedOrigins(data.allowedOrigins);
      return allowedOriginsCache;
    } catch {
      return DEFAULT_ALLOWED_ORIGINS;
    }
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

  async function isOriginAllowed() {
    const list = await getAllowedOrigins();
    return list.some((pattern) => originMatches(pattern, location.origin));
  }

  async function ensureCurrentOriginAllowed() {
    const response = await chrome.runtime.sendMessage({
      type: 'ensureAllowedOrigin',
      origin: location.origin
    }).catch((err) => ({ ok: false, error: err?.message || String(err) }));
    if (response?.ok) {
      allowedOriginsCache = withDefaultAllowedOrigins(response.allowedOrigins || [location.origin]);
      logContent(response.added ? 'info' : 'debug', response.added ? 'page origin auto-allowed' : 'page origin already allowed', {
        origin: location.origin
      });
      scan();
    } else {
      logContent('error', 'page origin auto-allow failed', {
        origin: location.origin,
        error: response?.error || 'unknown error'
      });
    }
    return response;
  }

  function postExtensionStatus(status) {
    window.postMessage({
      source: 'rtsp-web-player-extension',
      type: EXTENSION_STATUS_TYPE,
      installed: true,
      extensionId: chrome.runtime.id,
      extensionOrigin: EXT_ORIGIN,
      ...status
    }, location.origin);
  }

  async function reportInstallStatus(options = {}) {
    const allow = options.autoAllowOrigin ? await ensureCurrentOriginAllowed() : null;
    const [native, originAllowed] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'nativePing' }).catch((err) => ({ ok: false, error: err?.message || String(err) })),
      isOriginAllowed()
    ]);
    if (!native?.ok || !originAllowed) {
      logContent(native?.ok ? 'info' : 'error', 'install status check', {
        nativeOk: Boolean(native?.ok),
        nativeError: native?.ok ? '' : native?.error || 'Native Runtime not detected',
        originAllowed,
        origin: location.origin
      });
    }
    postExtensionStatus({
      nativeOk: Boolean(native?.ok),
      nativePort: native?.port || 0,
      nativeError: native?.ok ? '' : native?.error || 'Native Runtime not detected',
      origin: location.origin,
      originAllowed,
      originAdded: Boolean(allow?.added),
      originError: allow?.ok === false ? allow.error || 'auto allow origin failed' : ''
    });
  }

  function sizeValue(v, fallback) {
    if (!v) return fallback;
    return /^\d+$/.test(v) ? `${v}px` : v;
  }

  async function mount(el) {
    if (mounted.has(el)) {
      const state = mounted.get(el);
      if (state?.blocked && !state.iframe && await isOriginAllowed()) {
        state.blocked = false;
        state.wrap.innerHTML = '';
        attachPlayerFrame(el, state.wrap);
        return;
      }
      update(el);
      return;
    }
    if (el.shadowRoot) {
      logContent('debug', 'rtsp-player already has a shadow root; page sdk owns this element', { origin: location.origin });
      return;
    }
    const shadow = el.attachShadow ? el.attachShadow({ mode: 'open' }) : el;
    const wrap = document.createElement('div');
    wrap.className = 'rtsp-wrap';
    const style = document.createElement('style');
    style.textContent = `
      :host{display:inline-block;contain:content;background:#050505;}
      .rtsp-wrap{width:100%;height:100%;min-width:160px;min-height:90px;background:#050505;color:#fff;font:12px system-ui, sans-serif;position:relative;overflow:hidden;border-radius:6px;}
      iframe{width:100%;height:100%;border:0;display:block;background:#050505;}
      .blocked{display:flex;align-items:center;justify-content:center;height:100%;padding:12px;text-align:center;background:#151515;color:#ddd;box-sizing:border-box;}
    `;
    shadow.appendChild(style);
    shadow.appendChild(wrap);
    mounted.set(el, { shadow, wrap, iframe: null, blocked: false });

    el.style.display = el.style.display || 'inline-block';
    el.style.width = sizeValue(el.getAttribute('width'), el.style.width || '640px');
    el.style.height = sizeValue(el.getAttribute('height'), el.style.height || '360px');

    if (!(await isOriginAllowed())) {
      logContent('error', 'page origin not allowed', { origin: location.origin });
      mounted.get(el).blocked = true;
      wrap.innerHTML = `<div class="blocked">RTSP Player: 当前页面来源未授权。请在扩展弹窗中允许 ${escapeHTML(location.origin)}</div>`;
      return;
    }

    attachPlayerFrame(el, wrap);
  }

  function attachPlayerFrame(el, wrap) {
    const iframe = document.createElement('iframe');
    iframe.src = PLAYER_URL;
    iframe.allow = 'autoplay; fullscreen';
    iframe.referrerPolicy = 'no-referrer';
    wrap.appendChild(iframe);
    mounted.get(el).iframe = iframe;
    mounted.get(el).blocked = false;
    frames.set(iframe.contentWindow, el);

    iframe.addEventListener('load', () => update(el));
  }

  function update(el) {
    const state = mounted.get(el);
    if (!state || !state.iframe || !state.iframe.contentWindow) return;
    const url = el.getAttribute('url') || el.getAttribute('src') || '';
    const options = {
      type: 'RTSP_PLAYER_INIT',
      url,
      autoplay: el.hasAttribute('autoplay'),
      controls: el.hasAttribute('controls'),
      muted: el.hasAttribute('muted'),
      transport: el.getAttribute('rtsp-transport') || (el.getAttribute('transport') === 'tcp' ? 'tcp' : 'tcp'),
      rtspTransport: el.getAttribute('rtsp-transport') || 'tcp',
      mediaTransport: el.getAttribute('media-transport') || el.getAttribute('transport') || 'auto',
      codec: el.getAttribute('codec') || 'auto'
    };
    state.iframe.contentWindow.postMessage(options, EXT_ORIGIN);
    logContent('info', 'player init posted', {
      url,
      mediaTransport: options.mediaTransport,
      codec: options.codec,
      origin: location.origin
    });
  }

  function scan(root = document) {
    const nodes = [];
    if (root.nodeType === Node.ELEMENT_NODE && root.matches?.('rtsp-player')) nodes.push(root);
    root.querySelectorAll?.('rtsp-player').forEach((el) => nodes.push(el));
    nodes.forEach((el) => mount(el));
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\'': '&#39;', '"': '&quot;' }[c]));
  }

  window.addEventListener('message', (event) => {
    if (event.source === window && event.data?.type === EXTENSION_STATUS_REQUEST_TYPE) {
      reportInstallStatus({ autoAllowOrigin: Boolean(event.data.autoAllowOrigin) });
      return;
    }
    if (event.source === window && event.data?.type === ALLOW_ORIGIN_REQUEST_TYPE) {
      ensureCurrentOriginAllowed().then(() => reportInstallStatus());
      return;
    }
    if (event.origin !== EXT_ORIGIN) return;
    const el = frames.get(event.source);
    if (!el || !event.data?.type) return;
    const type = event.data.type.replace(/^RTSP_PLAYER_/, '').toLowerCase();
    el.dispatchEvent(new CustomEvent(type, { detail: event.data, bubbles: true, composed: true }));
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.allowedOrigins) {
      allowedOriginsCache = withDefaultAllowedOrigins(changes.allowedOrigins.newValue || []);
      scan();
    }
  });

  scan();
  postExtensionStatus({ nativeOk: false, nativePort: 0, nativeError: '', originAllowed: false });
  reportInstallStatus();

  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach((n) => scan(n));
      } else if (m.type === 'attributes' && m.target?.matches?.('rtsp-player')) {
        update(m.target);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['url', 'src', 'width', 'height', 'autoplay', 'controls', 'transport', 'rtsp-transport', 'media-transport', 'codec'] });
})();
