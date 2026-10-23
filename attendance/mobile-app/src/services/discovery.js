import Constants from 'expo-constants';
import * as Network from 'expo-network';

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
const debugLog = (...args) => {
  if (isDev) console.log(...args);
};

/**
 * Lấy IP host từ Expo Manifest hoặc window.location
 */
export const getExpoHost = () => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const webHost = window.location.hostname;
    if (webHost && webHost !== 'localhost' && webHost !== '127.0.0.1') {
      return webHost;
    }
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest?.hostUri;

  return hostUri ? hostUri.split(':')[0] : null;
};

/**
 * Kiểm tra xem 1 host IP có backend admin server (port 5000) đang phản hồi không
 */
export const probeHost = async (target, timeoutMs = 800) => {
  if (!target || typeof target !== 'string') return false;
  let healthUrl;
  try {
    const value = target.trim();
    const hasProtocol = /^https?:\/\//i.test(value);
    const hasPort = /^https?:\/\/[^/]+:\d+/i.test(value);
    const parsed = new URL(hasProtocol ? value : `http://${value}${hasPort || value.includes(':') ? '' : ':5000'}`);
    healthUrl = `${parsed.origin}/health`;
  } catch (_err) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(healthUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const health = await res.json();
        if (health?.success !== true) return false;
        debugLog(`[DISCOVERY] Probe SUCCESS on ${healthUrl}`);
        return true;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (_err) {
    // Host không phản hồi hoặc timeout
  }
  return false;
};

const getDiscoveredConfig = (host, port) => {
  const origin = port === 80 ? `http://${host}`
    : port === 443 ? `https://${host}`
      : `http://${host}:${port}`;
  const isDirectBackend = port === 5000;
  return {
    success: true,
    host,
    adminUrl: origin,
    aiServiceUrl: isDirectBackend ? `http://${host}:8000` : origin,
    attendanceUrl: isDirectBackend ? `http://${host}:5001/api` : `${origin}/attendance/api`,
  };
};

const probeServerOnHost = async (host, timeoutMs = 700) => {
  const ports = [5000, 80, 443];
  const results = await Promise.all(ports.map(async (port) => {
    const origin = port === 80 ? `http://${host}`
      : port === 443 ? `https://${host}`
        : `http://${host}:${port}`;
    return await probeHost(origin, timeoutMs);
  }));
  const foundIndex = results.findIndex(Boolean);
  return foundIndex < 0 ? null : getDiscoveredConfig(host, ports[foundIndex]);
};

/**
 * Tự động quét và tìm kiếm IP máy chủ trong mạng LAN
 */
export const discoverServerHost = async (onProgress) => {
  debugLog('[DISCOVERY] Starting server auto-discovery...');
  if (onProgress) onProgress('Đang kiểm tra kết nối cục bộ...');

  const testedSet = new Set();
  const candidatesPriority = [];

  // 1. Host từ Expo Bundler / Developer machine
  const expoHost = getExpoHost();
  if (expoHost && !testedSet.has(expoHost)) {
    candidatesPriority.push(expoHost);
    testedSet.add(expoHost);
  }

  // 2. Localhost & Emulator Gateways
  const localCandidates = ['127.0.0.1', 'localhost', '10.0.2.2'];
  for (const h of localCandidates) {
    if (!testedSet.has(h)) {
      candidatesPriority.push(h);
      testedSet.add(h);
    }
  }

  // 3. Kiểm tra các candidate ưu tiên trước (rất nhanh, < 300ms)
  for (const host of candidatesPriority) {
    if (onProgress) onProgress(`Kiểm tra ${host}...`);
    const found = await probeServerOnHost(host);
    if (found) return found;
  }

  // 4. Lấy IP của thiết bị hiện tại để quét dải mạng Subnet
  let deviceIp = null;
  try {
    deviceIp = await Network.getIpAddressAsync();
  } catch (_e) { }

  if (deviceIp && deviceIp.includes('.')) {
    const parts = deviceIp.split('.');
    if (parts.length === 4) {
      const subnetPrefix = `${parts[0]}.${parts[1]}.${parts[2]}.`;
      if (onProgress) onProgress(`Quét dải mạng ${subnetPrefix}x...`);

      // Search the complete local /24. Servers often use a DHCP address that
      // is not one of the usual development-machine suffixes.
      const commonSuffixes = Array.from({ length: 254 }, (_, index) => index + 1);

      const subnetCandidates = [];
      for (const suffix of commonSuffixes) {
        if (suffix >= 1 && suffix <= 254) {
          const target = `${subnetPrefix}${suffix}`;
          if (!testedSet.has(target)) {
            subnetCandidates.push(target);
            testedSet.add(target);
          }
        }
      }

      // Probe common backend and reverse-proxy ports in bounded batches.
      const batchSize = 32;
      for (let i = 0; i < subnetCandidates.length; i += batchSize) {
        const batch = subnetCandidates.slice(i, i + batchSize);
        if (onProgress) onProgress(`Đang quét ${batch[0]} -> ${batch[batch.length - 1]}...`);

        const results = await Promise.all(
          batch.map(async (ip) => {
            return await probeServerOnHost(ip, 500);
          })
        );

        const found = results.find(Boolean);
        if (found) {
          debugLog(`[DISCOVERY] Server found on subnet: ${found.host}`);
          return found;
        }
      }
    }
  }

  debugLog('[DISCOVERY] No server found on local network.');
  return {
    success: false,
    message: 'Không tìm thấy máy chủ đang mở ở cổng 5000 trong mạng nội bộ. Hãy kiểm tra máy tính và điện thoại cùng kết nối 1 mạng Wi-Fi và backend đang chạy.',
  };
};
