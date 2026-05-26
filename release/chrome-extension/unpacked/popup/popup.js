const nativeStatus = document.getElementById('nativeStatus');
const checkBtn = document.getElementById('checkBtn');
const openPlayerBtn = document.getElementById('openPlayerBtn');
const originInput = document.getElementById('originInput');
const addOriginBtn = document.getElementById('addOriginBtn');
const originList = document.getElementById('originList');
const DEFAULTS = [
  'http://localhost',
  'http://127.0.0.1',
  'https://localhost',
  'https://rtsp.flyfish.dev',
  'https://rtsp-roan.vercel.app',
  'https://doc.flyfish.dev'
];

checkBtn.addEventListener('click', checkNative);
openPlayerBtn.addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('player/player.html') }));
addOriginBtn.addEventListener('click', addOrigin);
originInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') addOrigin(); });

async function checkNative() {
  nativeStatus.textContent = '检测中…';
  nativeStatus.className = 'status';
  const resp = await chrome.runtime.sendMessage({ type: 'nativePing' });
  if (resp?.ok) {
    nativeStatus.textContent = `Native Runtime 正常，Gateway 端口：${resp.port}`;
    nativeStatus.className = 'status ok';
  } else {
    nativeStatus.textContent = `未检测到 Native Runtime：${resp?.error || 'unknown error'}`;
    nativeStatus.className = 'status error';
  }
}

async function loadOrigins() {
  const { allowedOrigins = DEFAULTS } = await chrome.storage.local.get({ allowedOrigins: DEFAULTS });
  renderOrigins(withDefaultAllowedOrigins(allowedOrigins));
}

function withDefaultAllowedOrigins(origins) {
  const list = Array.isArray(origins) ? origins : [];
  return Array.from(new Set([...DEFAULTS, ...list]));
}

function renderOrigins(items) {
  originList.innerHTML = '';
  for (const item of items) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = item;
    const btn = document.createElement('button');
    btn.textContent = '删除';
    btn.addEventListener('click', async () => {
      const next = items.filter((x) => x !== item);
      await chrome.storage.local.set({ allowedOrigins: next });
      renderOrigins(next);
    });
    li.append(span, btn);
    originList.appendChild(li);
  }
}

async function addOrigin() {
  const value = originInput.value.trim().replace(/\/$/, '');
  if (!value) return;
  if (value !== '*' && !/^https?:\/\//.test(value)) {
    nativeStatus.textContent = 'Origin 必须类似 https://example.com，或使用 * 仅用于内网调试';
    nativeStatus.className = 'status error';
    return;
  }
  const { allowedOrigins = DEFAULTS } = await chrome.storage.local.get({ allowedOrigins: DEFAULTS });
  const next = Array.from(new Set([...withDefaultAllowedOrigins(allowedOrigins), value]));
  await chrome.storage.local.set({ allowedOrigins: next });
  originInput.value = '';
  renderOrigins(next);
}

checkNative();
loadOrigins();
