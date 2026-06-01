const STATUS_REQUEST_TYPE = "RTSP_INSTALL_STATUS_REQUEST";
const STATUS_RESPONSE_TYPE = "RTSP_EXTENSION_STATUS";
const ALLOW_ORIGIN_REQUEST_TYPE = "RTSP_ALLOW_ORIGIN_REQUEST";
const DEFAULT_TIMEOUT_MS = 1800;
const DEFAULT_DOWNLOAD_BASE = new URL("./downloads/", import.meta.url).href;

const INSTALLER_FILES = {
  mac: [
    { label: "macOS DMG", file: "rtsp-macos-installer.dmg" },
    { label: "macOS ZIP", file: "rtsp-macos-installer.zip" },
  ],
  windows: [
    { label: "Windows ZIP", file: "rtsp-windows-installer.zip" },
  ],
  linux: [
    { label: "Linux TAR.GZ", file: "rtsp-linux-installer.tar.gz" },
  ],
};

export function detectRTSPPlatform() {
  const platform = String(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || "").toLowerCase();
  if (platform.includes("mac")) return "mac";
  if (platform.includes("win")) return "windows";
  return "linux";
}

export function getRTSPInstallerLinks(options = {}) {
  const base = options.downloadBase ? new URL(options.downloadBase, location.href).href : DEFAULT_DOWNLOAD_BASE;
  const links = {};
  for (const [platform, files] of Object.entries(INSTALLER_FILES)) {
    links[platform] = files.map((item) => ({
      ...item,
      url: new URL(item.file, base).href,
    }));
  }
  return links;
}

export function recommendedRTSPInstallers(options = {}) {
  return getRTSPInstallerLinks(options)[detectRTSPPlatform()] || [];
}

export function requestRTSPInstallStatus(options = {}) {
  return waitForExtensionStatus({
    type: STATUS_REQUEST_TYPE,
    autoAllowOrigin: Boolean(options.autoAllowOrigin),
  }, options);
}

export function ensureRTSPOriginAllowed(options = {}) {
  return waitForExtensionStatus({ type: ALLOW_ORIGIN_REQUEST_TYPE }, options);
}

export function createRTSPInstallDetector(options = {}) {
  let lastStatus = null;
  const listeners = new Set();

  async function detect(overrides = {}) {
    lastStatus = await requestRTSPInstallStatus({ ...options, ...overrides });
    notify(lastStatus);
    return lastStatus;
  }

  async function ensureOriginAllowed(overrides = {}) {
    lastStatus = await ensureRTSPOriginAllowed({ ...options, ...overrides });
    notify(lastStatus);
    return lastStatus;
  }

  function notify(status) {
    for (const listener of listeners) {
      try {
        listener(status);
      } catch {
        // A consumer listener must not break install detection.
      }
    }
  }

  return {
    detect,
    ensureOriginAllowed,
    getInstallers: () => getRTSPInstallerLinks(options),
    recommendedInstallers: () => recommendedRTSPInstallers(options),
    get lastStatus() {
      return lastStatus;
    },
    onStatus(listener) {
      listeners.add(listener);
      if (lastStatus) listener(lastStatus);
      return () => listeners.delete(listener);
    },
  };
}

function waitForExtensionStatus(request, options = {}) {
  const timeout = Number(options.timeout || DEFAULT_TIMEOUT_MS);
  return new Promise((resolve) => {
    let done = false;
    const timer = window.setTimeout(() => {
      finish({
        installed: false,
        extensionId: "",
        extensionOrigin: "",
        nativeOk: false,
        nativePort: 0,
        nativeError: "Chrome extension not detected",
        origin: location.origin,
        originAllowed: false,
        originAdded: false,
        timedOut: true,
      });
    }, timeout);

    function finish(status) {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(normalizeStatus(status));
    }

    function onMessage(event) {
      if (event.source !== window || event.origin !== location.origin) return;
      const data = event.data || {};
      if (data.source !== "rtsp-web-player-extension" || data.type !== STATUS_RESPONSE_TYPE) return;
      finish(data);
    }

    window.addEventListener("message", onMessage);
    window.postMessage(request, location.origin);
  });
}

function normalizeStatus(status) {
  return {
    installed: Boolean(status.installed),
    extensionId: status.extensionId || "",
    extensionOrigin: status.extensionOrigin || "",
    nativeOk: Boolean(status.nativeOk),
    nativePort: Number(status.nativePort || 0),
    nativeError: status.nativeError || "",
    origin: status.origin || location.origin,
    originAllowed: Boolean(status.originAllowed),
    originAdded: Boolean(status.originAdded),
    originError: status.originError || "",
    timedOut: Boolean(status.timedOut),
  };
}
