import { create } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

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
const SECURE_STORAGE_KEYS = new Set(['device_token', 'temp_claim_code']);

const canUseSecureStore = async () => {
  try {
    return await SecureStore.isAvailableAsync();
  } catch (_e) {
    return false;
  }
};

const safeStorage = {
  getItem: async (key) => {
    if (SECURE_STORAGE_KEYS.has(key) && await canUseSecureStore()) {
      try {
        const secureVal = await SecureStore.getItemAsync(key);
        if (secureVal) return secureVal;
      } catch (_e) { }
    }

    try {
      const val = await AsyncStorage.getItem(key);
      if (val) {
        if (SECURE_STORAGE_KEYS.has(key) && await canUseSecureStore()) {
          try {
            await SecureStore.setItemAsync(key, val);
            await AsyncStorage.removeItem(key);
          } catch (_e) { }
        }
        return val;
      }
    } catch (_e) { }
    return memoryStorage[key] || null;
  },
  setItem: async (key, value) => {
    debugLog(`[STORAGE] Saving ${key}...`);
    if (SECURE_STORAGE_KEYS.has(key) && await canUseSecureStore()) {
      try {
        await SecureStore.setItemAsync(key, value);
        await AsyncStorage.removeItem(key);
        memoryStorage[key] = value;
        return;
      } catch (_e) {
        debugWarn(`[STORAGE] Secure save failed, using AsyncStorage for ${key}`);
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
let AI_API_KEY = getDefaultApiConfig().aiApiKey;

const adminApi = create({ timeout: 10000 });
const aiClient = create({ timeout: 15000 });
const attendanceClient = create({ timeout: 10000 });
adminApi.defaults.baseURL = ADMIN_URL;
aiClient.defaults.baseURL = AI_SERVICE_URL;
attendanceClient.defaults.baseURL = ATTENDANCE_URL;

export const updateApiConfig = (config) => {
  if (config.adminUrl) {
    ADMIN_URL = normalizeAdminUrl(config.adminUrl);
    adminApi.defaults.baseURL = ADMIN_URL;
    debugLog('[API] Target set to:', ADMIN_URL);
  }
  if (config.aiServiceUrl) {
    AI_SERVICE_URL = String(config.aiServiceUrl).trim().replace(/\/+$/, '');
    aiClient.defaults.baseURL = AI_SERVICE_URL;
  }
  if (config.aiApiKey !== undefined) {
    AI_API_KEY = String(config.aiApiKey || '').trim();
  }
  if (config.attendanceUrl) {
    ATTENDANCE_URL = String(config.attendanceUrl).trim().replace(/\/+$/, '');
    attendanceClient.defaults.baseURL = ATTENDANCE_URL;
  }
};

adminApi.interceptors.request.use(async (config) => {
  const publicEndpoints = ['/devices/request-access', '/devices/claim-token'];
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

aiClient.interceptors.request.use((config) => {
  if (AI_API_KEY) {
    config.headers['x-api-key'] = AI_API_KEY;
  }
  config.baseURL = AI_SERVICE_URL;
  return config;
});

const getDeviceInfo = (config = {}) => ({
  device_name: config.terminalId || 'Mobile Terminal',
  ip_address: config.deviceIp || '192.168.1.x',
  port: Number(config.port || 8080),
  location: config.location || 'Khu vuc chua xac dinh',
  device_type: 'face'
});

export const deviceApi = {
  requestAccess: async (deviceInfo) => {
    debugLog('[API] Handshaking with Admin...');
    const response = await adminApi.post('/devices/request-access', deviceInfo);

    // Luu device_id de poll status hoac claim token sau nay
    const deviceId = response.data?.device?.id;
    if (deviceId) {
      await safeStorage.setItem('temp_device_id', deviceId);
      await safeStorage.setItem('temp_device_name', deviceInfo.device_name);
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
      const claimCode = await safeStorage.getItem('temp_claim_code');
      const response = await adminApi.post('/devices/claim-token', {
        device_id: deviceId,
        device_name: deviceName,
        claim_code: claimCode
      });

      const token = response.data?.device_token;
      if (token) {
        await safeStorage.setItem('device_token', token);
        await safeStorage.removeItem('temp_claim_code');
        debugLog('[API] SUCCESS: Token claimed and saved.');
        return token;
      }
    } catch (error) {
      debugWarn('[API] Claim token failed:', error.response?.data?.message || error.message);
    }
    return null;
  },
  ensureAccess: async (config) => {
    const token = await safeStorage.getItem('device_token');
    if (token) return token;

    const deviceInfo = getDeviceInfo(config);
    let result;
    try {
      result = await deviceApi.requestAccess(deviceInfo);
    } catch (error) {
      if (error?.response) throw error;
      throw new Error(`Khong the ket noi Admin API tai ${ADMIN_URL}. Kiem tra dien thoai va may tinh cung Wi-Fi, backend dang chay, va Admin URL dung IP LAN.`);
    }

    const deviceId = result?.device?.id || await safeStorage.getItem('temp_device_id');
    const deviceStatus = result?.device?.status;

    // Neu da duoc duyet, thu lay token ngay
    if (deviceStatus === 'approved' && deviceId) {
      const claimedToken = await deviceApi.claimToken(deviceId, deviceInfo.device_name);
      if (claimedToken) return claimedToken;
    }

    // Neu chua co token (vi pending hoac claim failed), bao loi de user biet
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
    debugLog('[API] Fetching list...');
    try {
      const response = await adminApi.get('/devices/unregistered-employees');
      return response.data;
    } catch (error) {
      if (!error?.response) {
        throw new Error(`Khong the ket noi Admin API tai ${ADMIN_URL}. Kiem tra dien thoai va may tinh cung Wi-Fi, backend dang chay, va Admin URL dung IP LAN.`);
      }
      if (error?.response?.status !== 403) throw error;

      debugWarn('[API] Stored device token was rejected. Clearing token and retrying handshake...');
      await deviceApi.clearToken();
      await deviceApi.ensureAccess(config);
      try {
        const response = await adminApi.get('/devices/unregistered-employees');
        return response.data;
      } catch (retryError) {
        if (retryError?.response) throw retryError;
        throw new Error(`Khong the ket noi Admin API tai ${ADMIN_URL}. Kiem tra dien thoai va may tinh cung Wi-Fi, backend dang chay, va Admin URL dung IP LAN.`);
      }
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
      const response = await aiClient.post('/extract-features', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      return response.data;
    } catch (error) {
      wrapNetworkError(error, 'AI Service', AI_SERVICE_URL);
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

export default adminApi;
