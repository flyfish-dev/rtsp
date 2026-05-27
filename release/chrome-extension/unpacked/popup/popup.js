const nativeStatus = document.getElementById('nativeStatus');
const checkBtn = document.getElementById('checkBtn');
const openPlayerBtn = document.getElementById('openPlayerBtn');
const originInput = document.getElementById('originInput');
const addOriginBtn = document.getElementById('addOriginBtn');
const originList = document.getElementById('originList');
const refreshLogsBtn = document.getElementById('refreshLogsBtn');
const copyLogsBtn = document.getElementById('copyLogsBtn');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const restartGatewayBtn = document.getElementById('restartGatewayBtn');
const debugToggle = document.getElementById('debugToggle');
const diagnosticStatus = document.getElementById('diagnosticStatus');
const logOutput = document.getElementById('logOutput');
const DEFAULTS = [
  'http://localhost',
  'http://127.0.0.1',
  'https://localhost',
  'https://rtsp.flyfish.dev',
  'https://rtsp-roan.vercel.app'
];

checkBtn.addEventListener('click', async () => {
  await checkNative();
  await refreshLogs();
});
openPlayerBtn.addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('player/player.html') }));
addOriginBtn.addEventListener('click', addOrigin);
originInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') addOrigin(); });
refreshLogsBtn.addEventListener('click', refreshLogs);
copyLogsBtn.addEventListener('click', copyLogs);
clearLogsBtn.addEventListener('click', clearLogs);
restartGatewayBtn.addEventListener('click', restartGateway);
debugToggle.addEventListener('change', setDebugLogging);

async function checkNative() {
  nativeStatus.textContent = '检测中…';
  nativeStatus.className = 'status';
  const resp = await chrome.runtime.sendMessage({ type: 'nativePing' });
  if (resp?.ok) {
    nativeStatus.textContent = `Native Runtime 正常，Gateway 端口：${resp.port}，版本：${resp.gatewayVersion || resp.version || '-'}，Debug：${resp.debug ? '开' : '关'}`;
    nativeStatus.className = 'status ok';
  } else {
    nativeStatus.textContent = `未检测到 Native Runtime：${resp?.error || 'unknown error'}`;
    nativeStatus.className = 'status error';
  }
}

async function loadDebugSetting() {
  const resp = await chrome.runtime.sendMessage({ type: 'getNativeDebug' }).catch(() => ({ enabled: false }));
  debugToggle.checked = Boolean(resp?.enabled);
}

async function setDebugLogging() {
  const enabled = debugToggle.checked;
  diagnosticStatus.textContent = enabled ? '正在开启 Debug 日志并重启 Native…' : '正在关闭 Debug 日志并重启 Native…';
  await chrome.runtime.sendMessage({ type: 'setNativeDebug', enabled }).catch(() => null);
  await restartGateway();
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
      renderOrigins(withDefaultAllowedOrigins(next));
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

async function refreshLogs() {
  diagnosticStatus.textContent = '正在读取诊断信息…';
  const [diagnostics, extensionLogs] = await Promise.all([
    chrome.runtime.sendMessage({ type: 'getDiagnostics', maxBytes: 512 * 1024 }).catch((err) => ({ ok: false, error: err?.message || String(err) })),
    chrome.runtime.sendMessage({ type: 'getExtensionLogs' }).catch((err) => ({ ok: false, error: err?.message || String(err), logs: [] }))
  ]);
  const text = renderDiagnostics(diagnostics, extensionLogs?.logs || []);
  logOutput.value = text;
  if (diagnostics?.ok) {
    diagnosticStatus.textContent = diagnostics.healthy
      ? `Native 正常：PID ${diagnostics.pid || '-'}，端口 ${diagnostics.port || '-'}，版本 ${diagnostics.gatewayVersion || diagnostics.version || '-'}，Debug：${diagnostics.debug ? '开' : '关'}`
      : `Native 未运行或不可用：${diagnostics.error || 'no active gateway'}`;
  } else {
    diagnosticStatus.textContent = `Native 诊断失败：${diagnostics?.error || 'unknown error'}`;
  }
}

function renderDiagnostics(diagnostics, extensionLogs) {
  const lines = [];
  lines.push('# Runtime');
  lines.push(`time: ${new Date().toISOString()}`);
  lines.push(`extension: ${chrome.runtime.id}`);
  if (diagnostics?.ok) {
    lines.push(`nativeHost: ok`);
    lines.push(`runtimeVersion: ${diagnostics.version || '-'}`);
    lines.push(`gatewayHealthy: ${diagnostics.healthy ? 'yes' : 'no'}`);
    lines.push(`gatewayVersion: ${diagnostics.gatewayVersion || '-'}`);
    lines.push(`debugLogging: ${diagnostics.debug ? 'yes' : 'no'}`);
    lines.push(`gatewayPID: ${diagnostics.pid || '-'}`);
    lines.push(`gatewayPort: ${diagnostics.port || '-'}`);
    lines.push(`pendingStreams: ${diagnostics.pendingStreams ?? '-'}`);
    lines.push(`activeStreams: ${diagnostics.activeStreams ?? '-'}`);
    lines.push(`startedAt: ${diagnostics.startedAt || '-'}`);
    lines.push(`configDir: ${diagnostics.configDir || '-'}`);
    lines.push(`statePath: ${diagnostics.statePath || '-'}`);
    lines.push(`logPath: ${diagnostics.logPath || '-'}`);
    if (diagnostics.error) lines.push(`diagnosticNote: ${diagnostics.error}`);
  } else {
    lines.push(`nativeHost: failed`);
    lines.push(`error: ${diagnostics?.error || 'unknown error'}`);
  }

  lines.push('');
  lines.push('# Extension Logs');
  if (extensionLogs.length === 0) {
    lines.push('(empty)');
  } else {
    for (const item of extensionLogs) {
      const details = item.details && Object.keys(item.details).length ? ` ${JSON.stringify(item.details)}` : '';
      lines.push(`[${item.ts || '-'}] [${item.level || 'info'}] [${item.area || 'extension'}] ${item.message || ''}${details}`);
    }
  }

  lines.push('');
  lines.push('# Native Gateway Log');
  lines.push(diagnostics?.logs || '(empty)');
  return lines.join('\n');
}

async function copyLogs() {
  if (!logOutput.value) await refreshLogs();
  await navigator.clipboard.writeText(logOutput.value);
  diagnosticStatus.textContent = '日志已复制到剪贴板';
}

async function clearLogs() {
  diagnosticStatus.textContent = '正在清空日志…';
  await chrome.runtime.sendMessage({ type: 'clearExtensionLogs' }).catch(() => null);
  await chrome.runtime.sendMessage({ type: 'clearNativeLogs' }).catch(() => null);
  await refreshLogs();
}

async function restartGateway() {
  diagnosticStatus.textContent = '正在重启 Native Gateway…';
  await chrome.runtime.sendMessage({ type: 'stopGateway' }).catch(() => null);
  await checkNative();
  await refreshLogs();
}

checkNative();
loadOrigins();
loadDebugSetting();
refreshLogs();
