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
export const probeHost = async (host, timeoutMs = 800) => {
  if (!host || typeof host !== 'string') return false;
  const cleanHost = host.trim().replace(/^https?:\/\//, '').split(':')[0].replace(/\/.*$/, '');
  if (!cleanHost) return false;

  const url = `http://${cleanHost}:5000/health`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok || res.status === 200 || res.status === 304) {
      debugLog(`[DISCOVERY] Probe SUCCESS on ${cleanHost}`);
      return true;
    }
  } catch (_err) {
    // Host không phản hồi hoặc timeout
  }
  return false;
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
    const isLive = await probeHost(host, 700);
    if (isLive) {
      return {
        success: true,
        host,
        adminUrl: `http://${host}:5000`,
        aiServiceUrl: `http://${host}:8000`,
        attendanceUrl: `http://${host}:5001/api`,
      };
    }
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

      // Danh sách các IP phổ biến thường được cấp cho máy chủ/PC dev
      const commonSuffixes = [
        parseInt(parts[3], 10), // Chính máy này (nếu dev trên PC)
        25, 1, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
        2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 50, 60, 70, 80, 90,
        150, 200
      ];

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

      // Quét song song từng đợt (batch) 8 IP cùng lúc để tối ưu tốc độ
      const batchSize = 8;
      for (let i = 0; i < subnetCandidates.length; i += batchSize) {
        const batch = subnetCandidates.slice(i, i + batchSize);
        if (onProgress) onProgress(`Đang quét ${batch[0]} -> ${batch[batch.length - 1]}...`);

        const results = await Promise.all(
          batch.map(async (ip) => {
            const ok = await probeHost(ip, 700);
            return ok ? ip : null;
          })
        );

        const found = results.find(Boolean);
        if (found) {
          debugLog(`[DISCOVERY] Server found on subnet: ${found}`);
          return {
            success: true,
            host: found,
            adminUrl: `http://${found}:5000`,
            aiServiceUrl: `http://${found}:8000`,
            attendanceUrl: `http://${found}:5001/api`,
          };
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
