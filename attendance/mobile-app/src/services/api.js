import { create } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import * as Crypto from 'expo-crypto';

/**
 * MOCK STORAGE FALLBACK
 */
const memoryStorage = {};
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
const debugLog = (...args) => {
  if (isDev) console.log(...args);
};
const debugWarn = (...args) => {
  if (isDev) console.warn(...args);
};
const SECURE_STORAGE_KEYS = new Set(['device_token', 'temp_claim_code', 'bootstrap_secret', 'device_unique_id']);

const canUseSecureStore = async () => {
  try {
    return await SecureStore.isAvailableAsync();
  } catch (_e) {
    return false;
  }
};

const safeStorage = {
  getItem: async (key) => {
    if (SECURE_STORAGE_KEYS.has(key)) {
      if (!await canUseSecureStore()) {
        throw new Error('SecureStore is unavailable. Device credentials cannot be read securely.');
      }
      try {
        const secureVal = await SecureStore.getItemAsync(key);
        if (secureVal) return secureVal;
      } catch (_error) {
        throw new Error('SecureStore could not read device credentials.');
      }

      // Migrate credentials saved by older app versions into SecureStore.
      try {
        const legacyVal = await AsyncStorage.getItem(key);
        if (legacyVal) {
          await SecureStore.setItemAsync(key, legacyVal);
          await AsyncStorage.removeItem(key);
          memoryStorage[key] = legacyVal;
          return legacyVal;
        }
      } catch (_error) {
        throw new Error('Device credentials could not be migrated into SecureStore.');
      }

      return memoryStorage[key] || null;
    }

    try {
      const val = await AsyncStorage.getItem(key);
      if (val) return val;
    } catch (_e) { }
    return memoryStorage[key] || null;
  },
  setItem: async (key, value) => {
    debugLog(`[STORAGE] Saving ${key}...`);
    if (SECURE_STORAGE_KEYS.has(key)) {
      if (!await canUseSecureStore()) {
        throw new Error('SecureStore is unavailable. Device credentials were not saved.');
      }
      try {
        await SecureStore.setItemAsync(key, value);
        await AsyncStorage.removeItem(key);
        memoryStorage[key] = value;
        return;
      } catch (_error) {
        throw new Error('SecureStore could not save device credentials.');
      }
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch (_e) {
      debugWarn(`[STORAGE] Native save failed, using memory for ${key}`);
    }
    memoryStorage[key] = value;
  },
  removeItem: async (key) => {
    if (SECURE_STORAGE_KEYS.has(key) && await canUseSecureStore()) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (_e) { }
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch (_e) { }
    delete memoryStorage[key];
  }
};

/**
 * CONFIGURATION & INSTANCES
 */
const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest?.hostUri;

  return hostUri ? hostUri.split(':')[0] : null;
};

const readPublicEnv = (key) => {
  const value = typeof process !== 'undefined' ? process.env?.[key] : '';
  return typeof value === 'string' ? value.trim() : '';
};

const buildLocalUrl = (host, port, suffix = '') => `http://${host}:${port}${suffix}`;

const isUsableIpAddress = (value) => {
  const ip = String(value || '').trim();
  if (!ip || ip === '0.0.0.0' || ip === '::') return false;

  const parts = ip.split('.');
  if (parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part))) {
    return parts.every((part) => Number(part) >= 0 && Number(part) <= 255);
  }

  return ip.includes(':') && /^[\da-f:]+$/i.test(ip);
};

const resolveDeviceIpAddress = async (preferredIp) => {
  if (isUsableIpAddress(preferredIp)) return String(preferredIp).trim();

  try {
    const networkIp = await Network.getIpAddressAsync();
    if (isUsableIpAddress(networkIp)) return networkIp;
  } catch (_error) {
    // Report a single actionable error below if the platform cannot provide an IP.
  }

  throw new Error('Khong lay duoc IP hop le cua thiet bi. Hay ket noi kiosk vao Wi-Fi/LAN roi thu lai.');
};

let deviceCredentialsPromise = null;

const getDeviceCredentials = async () => {
  if (!deviceCredentialsPromise) {
    deviceCredentialsPromise = (async () => {
      let deviceId = await safeStorage.getItem('device_unique_id');
      if (!deviceId) {
        deviceId = Crypto.randomUUID();
        await safeStorage.setItem('device_unique_id', deviceId);
      }

      let bootstrapSecret = await safeStorage.getItem('bootstrap_secret');
      if (!bootstrapSecret) {
        const randomBytes = await Crypto.getRandomBytesAsync(32);
        bootstrapSecret = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
        await safeStorage.setItem('bootstrap_secret', bootstrapSecret);
      }

      const bootstrapHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        bootstrapSecret,
      );

      return { deviceId, bootstrapSecret, bootstrapHash };
    })();
  }

  const pendingCredentials = deviceCredentialsPromise;
  try {
    return await pendingCredentials;
  } finally {
    if (deviceCredentialsPromise === pendingCredentials) deviceCredentialsPromise = null;
  }
};

const toAsciiBytes = (value) => Uint8Array.from(value, (character) => character.charCodeAt(0));

const hmacSha256Hex = async (secret, message) => {
  const blockSize = 64;
  const key = toAsciiBytes(secret);
  const innerPad = new Uint8Array(blockSize);
  const outerPad = new Uint8Array(blockSize);

  for (let index = 0; index < blockSize; index += 1) {
    const byte = key[index] || 0;
    innerPad[index] = byte ^ 0x36;
    outerPad[index] = byte ^ 0x5c;
  }

  const messageBytes = toAsciiBytes(message);
  const innerInput = new Uint8Array(innerPad.length + messageBytes.length);
  innerInput.set(innerPad);
  innerInput.set(messageBytes, innerPad.length);
  const innerHash = new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, innerInput));

  const outerInput = new Uint8Array(outerPad.length + innerHash.length);
  outerInput.set(outerPad);
  outerInput.set(innerHash, outerPad.length);
  const digest = new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, outerInput));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const getConfiguredApiEnv = () => ({
  adminUrl: readPublicEnv('EXPO_PUBLIC_ADMIN_URL'),
  aiServiceUrl: readPublicEnv('EXPO_PUBLIC_AI_SERVICE_URL'),
  attendanceUrl: readPublicEnv('EXPO_PUBLIC_ATTENDANCE_URL'),
});

export const hasConfiguredApiEnv = () => {
  const envConfig = getConfiguredApiEnv();
  return Boolean(envConfig.adminUrl || envConfig.aiServiceUrl || envConfig.attendanceUrl);
};

export const getDefaultApiConfig = () => {
  const host = readPublicEnv('EXPO_PUBLIC_API_HOST') || getExpoHost() || 'localhost';
  const envConfig = getConfiguredApiEnv();
  return {
    adminUrl: envConfig.adminUrl || buildLocalUrl(host, 5000),
    aiServiceUrl: envConfig.aiServiceUrl || buildLocalUrl(host, 8000),
    attendanceUrl: envConfig.attendanceUrl || buildLocalUrl(host, 5001, '/api'),
    aiApiKey: ''
  };
};

const normalizeAdminUrl = (url) => {
  const trimmed = String(url || '').trim().replace(/\/+$/, '');
  return trimmed.includes('/api/v1') ? trimmed : `${trimmed}/api/v1`;
};

const normalizeBaseUrl = (url) => String(url || '').trim().replace(/\/+$/, '');

const wrapNetworkError = (error, serviceLabel, baseUrl) => {
  if (error?.response) {
    // If the backend sent a specific error message, throw it so the UI displays it
    if (error.response.data && error.response.data.message) {
      error.message = error.response.data.message;
      if (error.response.data.confidence !== undefined) {
          error.message += ` (Độ tương đồng: ${(error.response.data.confidence * 100).toFixed(1)}%)`;
      }
    }
    throw error;
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  throw new Error(
    `Khong the ket noi ${serviceLabel} tai ${normalizedBaseUrl}. Kiem tra dien thoai va server cung Wi-Fi, server dang chay, va URL duoc cau hinh dung.`
  );
};

let ADMIN_URL = normalizeAdminUrl(getDefaultApiConfig().adminUrl);
let AI_SERVICE_URL = getDefaultApiConfig().aiServiceUrl.replace(/\/+$/, '');
let ATTENDANCE_URL = getDefaultApiConfig().attendanceUrl.replace(/\/+$/, '');
const adminApi = create({ timeout: 10000 });
const attendanceClient = create({ timeout: 10000 });
adminApi.defaults.baseURL = ADMIN_URL;
attendanceClient.defaults.baseURL = ATTENDANCE_URL;

export const updateApiConfig = (config) => {
  if (config.adminUrl) {
    ADMIN_URL = normalizeAdminUrl(config.adminUrl);
    adminApi.defaults.baseURL = ADMIN_URL;
    debugLog('[API] Target set to:', ADMIN_URL);
  }
  if (config.aiServiceUrl) {
    AI_SERVICE_URL = String(config.aiServiceUrl).trim().replace(/\/+$/, '');
  }
  if (config.attendanceUrl) {
    ATTENDANCE_URL = String(config.attendanceUrl).trim().replace(/\/+$/, '');
    attendanceClient.defaults.baseURL = ATTENDANCE_URL;
  }
};

export const getAiServiceUrl = () => AI_SERVICE_URL;

adminApi.interceptors.request.use(async (config) => {
  const publicEndpoints = ['/devices/request-access', '/devices/enroll/challenge', '/devices/claim-token'];
  const isPublicDeviceEndpoint = publicEndpoints.some(ep => config.url?.startsWith(ep)) || config.url?.includes('/devices/status/');
  
  const token = isPublicDeviceEndpoint ? null : await safeStorage.getItem('device_token');
  if (token) {
    config.headers['x-device-token'] = token;
    debugLog('[API] Header attached: x-device-token present');
  } else if (!isPublicDeviceEndpoint) {
    debugWarn(`[API] Header missing: x-device-token is NULL for ${config.url}! (This causes 403)`);
  }
  config.baseURL = ADMIN_URL;
  return config;
});

attendanceClient.interceptors.request.use(async (config) => {
  const token = await safeStorage.getItem('device_token');
  if (token) {
    config.headers['x-device-token'] = token;
  }
  config.baseURL = ATTENDANCE_URL;
  return config;
});

const getDeviceInfo = async (config = {}) => {
  const credentials = await getDeviceCredentials();
  return {
    device_name: config.terminalId || 'Mobile Terminal',
    device_id: credentials.deviceId,
    bootstrap_hash: credentials.bootstrapHash,
    ip_address: await resolveDeviceIpAddress(config.deviceIp),
    port: Number(config.port || 8080),
    location: config.location || 'Khu vuc chua xac dinh',
    device_type: 'face'
  };
};

export const deviceApi = {
  requestAccess: async (deviceInfo) => {
    debugLog('[API] Handshaking with Admin...');
    const credentials = await getDeviceCredentials();
    const verifiedDeviceInfo = {
      ...deviceInfo,
      device_id: credentials.deviceId,
      bootstrap_hash: credentials.bootstrapHash,
      ip_address: await resolveDeviceIpAddress(deviceInfo?.ip_address),
    };
    const response = await adminApi.post('/devices/request-access', verifiedDeviceInfo);

    // Luu device_id de poll status hoac claim token sau nay
    const deviceId = response.data?.device?.id;
    if (deviceId) {
      await safeStorage.setItem('temp_device_id', deviceId);
      await safeStorage.setItem('temp_device_name', verifiedDeviceInfo.device_name);
    }
    const claimCode = response.data?.claim_code;
    if (claimCode) {
      await safeStorage.setItem('temp_claim_code', claimCode);
    }

    // Backend request-access KHONG tra ve token (bao mat)
    // Thiet bi phai goi /claim-token sau khi duoc approved
    return response.data;
  },
  claimToken: async (deviceId, deviceName) => {
    debugLog('[API] Claiming device token...');
    try {
      const credentials = await getDeviceCredentials();
      const legacyRecordId = deviceId || await safeStorage.getItem('temp_device_id');
      let claimResponse;

      try {
        const challengeResponse = await adminApi.post('/devices/enroll/challenge', {
          device_id: credentials.deviceId,
        });
        const challenge = challengeResponse.data?.challenge;
        if (!challenge) throw new Error('Admin API did not return a device challenge.');

        const proof = await hmacSha256Hex(credentials.bootstrapSecret, challenge);
        claimResponse = await adminApi.post('/devices/claim-token', {
          device_id: credentials.deviceId,
          challenge,
          proof,
        });
      } catch (challengeError) {
        const isLegacyDevice =
          challengeError?.response?.status === 409 &&
          challengeError?.response?.data?.details?.code === 'BOOTSTRAP_NOT_CONFIGURED';
        if (!isLegacyDevice) throw challengeError;

        const claimCode = await safeStorage.getItem('temp_claim_code');
        if (!claimCode) return null;
        if (!legacyRecordId) throw new Error('Legacy device record ID is missing.');

        claimResponse = await adminApi.post('/devices/claim-token', {
          device_id: legacyRecordId,
          device_name: deviceName,
          claim_code: claimCode,
          device_instance_id: credentials.deviceId,
          bootstrap_hash: credentials.bootstrapHash,
        });
      }

      const token = claimResponse.data?.device_token;
      if (token) {
        await safeStorage.setItem('device_token', token);
        await safeStorage.removeItem('temp_claim_code');
        await safeStorage.removeItem('temp_device_id');
        debugLog('[API] SUCCESS: Token claimed and saved.');
        return token;
      }
    } catch (error) {
      debugWarn('[API] Claim token failed:', error?.response?.data?.message || error.message);
      throw error;
    }
    return null;
  },
  pollStatus: async (deviceId) => {
    // Kiểm tra trạng thái device qua public endpoint (không cần token)
    try {
      const response = await adminApi.get(`/devices/status/${deviceId}`, {
        headers: { 'x-device-token': undefined }
      });
      return response.data?.device || response.data;
    } catch {
      return null;
    }
  },
  ensureAccess: async (config) => {
    const token = await safeStorage.getItem('device_token');
    if (token) return token;

    const deviceInfo = await getDeviceInfo(config);
    let result;
    try {
      result = await deviceApi.requestAccess(deviceInfo);
    } catch (error) {
      if (error?.response) throw error;
      throw new Error(`Khong the ket noi Admin API tai ${ADMIN_URL}. Kiem tra Wi-Fi va dam bao backend dang chay.`);
    }

    const deviceId = result?.device?.id || await safeStorage.getItem('temp_device_id');
    const deviceStatus = result?.device?.status;

    if (!deviceId) {
      throw new Error('Thiet bi chua duoc phe duyet. Vui long phe duyet trong Admin Portal.');
    }

    // Lưu device_id để dùng sau
    await safeStorage.setItem('temp_device_id', String(deviceId));

    if (deviceStatus === 'approved') {
      // Claim with the device bootstrap secret, or safely upgrade an old
      // installation through its one-time claim code.
      const claimedToken = await deviceApi.claimToken(deviceId, deviceInfo.device_name);
      if (claimedToken) return claimedToken;
      throw new Error(
        `Thiet bi "${deviceInfo.device_name}" da duoc phe duyet nhung khong con thong tin claim cu. Trong Admin Portal, hay Revoke thiet bi; sau do bam Yeu cau truy cap tren kiosk va phe duyet yeu cau moi.`
      );
    }

    if (deviceStatus === 'pending') {
      throw new Error(
        `Thiet bi "${deviceInfo.device_name}" dang cho phe duyet. Vui long phe duyet trong Admin Portal > Quan ly Thiet bi, sau do bam thu lai.`
      );
    }

    throw new Error('Thiet bi chua duoc phe duyet hoac chua co token. Hay phe duyet trong Admin Portal, sau do thu lai.');
  },
  getToken: async () => {
    return safeStorage.getItem('device_token');
  },
  reportLog: async (payload = {}) => {
    await deviceApi.ensureAccess();
    const response = await adminApi.post('/devices/report-log', payload);
    return response.data;
  },
  uploadStreamFrame: async ({ imageUri, terminalId, capturedAt }, config) => {
    await deviceApi.ensureAccess(config);

    const formData = new FormData();
    formData.append('frame', {
      uri: imageUri,
      name: 'kiosk-frame.jpg',
      type: 'image/jpeg'
    });
    formData.append('terminal_id', terminalId || '');
    formData.append('captured_at', capturedAt || new Date().toISOString());

    const response = await adminApi.post('/devices/stream-frame', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 10000,
    });
    debugLog('[STREAM] Frame uploaded');
    return response.data;
  },
  clearToken: async () => {
    await safeStorage.removeItem('device_token');
  },
  getUnregisteredEmployees: async (config) => {
    await deviceApi.ensureAccess(config);
    debugLog('[API] Fetching unregistered employees list...');
    try {
      const response = await adminApi.get('/devices/unregistered-employees');
      return response.data;
    } catch (error) {
      if (!error?.response) {
        throw new Error('Khong the ket noi den Admin Portal. Kiem tra Wi-Fi va dam bao backend dang chay.');
      }
      // Token bị reject → clear và retry một lần
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        debugWarn('[API] Device token rejected (403/401). Clearing and re-authenticating...');
        await deviceApi.clearToken();
        await deviceApi.ensureAccess(config);
        const retryResponse = await adminApi.get('/devices/unregistered-employees');
        return retryResponse.data;
      }
      throw error;
    }
  },
  saveToken: async (token) => {
    await safeStorage.setItem('device_token', token);
  },
  requestRegistration: async (employeeId, terminalId) => {
    debugLog('[API] Sending registration request to Admin...');
    const response = await adminApi.post('/devices/request-registration', {
      employee_id: employeeId,
      device_id: terminalId
    });
    return response.data;
  },
  checkRegistrationStatus: async (employeeId) => {
    const response = await adminApi.get(`/devices/check-registration-status/${employeeId}`);
    return response.data;
  }
};

const isDeviceAuthRejected = (error) => [401, 403].includes(error?.response?.status);

const retryWithFreshDeviceToken = async (operation, config) => {
  await deviceApi.ensureAccess(config);

  try {
    return await operation();
  } catch (error) {
    if (!isDeviceAuthRejected(error)) throw error;

    debugWarn('[API] Stored device token was rejected by Attendance Service. Reclaiming token...');
    await deviceApi.clearToken();
    await deviceApi.ensureAccess(config);
    return operation();
  }
};

export const aiApi = {
  extractFeatures: async (imageUri) => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: 'face.jpg',
      type: 'image/jpeg'
    });

    try {
      // Route through the authenticated admin API so the AI service key stays
      // server-side and the AI container remains private on the Docker network.
      const response = await adminApi.post('/devices/extract-features', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      return response.data;
    } catch (error) {
      wrapNetworkError(error, 'Admin API', ADMIN_URL);
    }
  }
};

export const attendanceApi = {
  recognizeAndCheck: async (embedding, deviceId) => {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Embedding khong hop le');
    }

    try {
      const response = await retryWithFreshDeviceToken(() =>
        attendanceClient.post('/attendance/recognize', {
          embedding,
          device_id: deviceId
        })
      );

      return response.data;
    } catch (error) {
      debugWarn('[REGISTRATION] Enroll failed:', error.response?.data || error.message);
      wrapNetworkError(error, 'Attendance Service', ATTENDANCE_URL);
    }
  },
  enrollFace: async (employeeId, fullName, embedding, deviceId) => {
    if (!employeeId || !Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Thieu nhan vien hoac du lieu khuon mat');
    }

    // Đảm bảo thiết bị đã được approved và có token trước khi gửi đăng ký
    try {
      const response = await retryWithFreshDeviceToken(async () => {
        return attendanceClient.post('/registration/enroll', {
          employee_id: employeeId,
          full_name: fullName || employeeId,
          embedding,
          device_id: deviceId
        });
      });

      return response.data;
    } catch (error) {
      wrapNetworkError(error, 'Attendance Service', ATTENDANCE_URL);
    }
  },
  checkIn: async (employeeId, deviceId) => {
    try {
      const response = await retryWithFreshDeviceToken(() =>
        attendanceClient.post('/attendance/check-in', {
          employee_id: employeeId,
          device_id: deviceId
        })
      );
      return response.data;
    } catch (error) {
      wrapNetworkError(error, 'Attendance Service', ATTENDANCE_URL);
    }
  },
  checkOut: async (attendanceIdOrEmployeeId) => {
    try {
      const response = await retryWithFreshDeviceToken(() =>
        attendanceClient.post('/attendance/check-out', {
          employee_id: attendanceIdOrEmployeeId
        })
      );
      return response.data;
    } catch (error) {
      wrapNetworkError(error, 'Attendance Service', ATTENDANCE_URL);
    }
  }
};

export { discoverServerHost, probeHost, getExpoHost } from './discovery';

export default adminApi;
