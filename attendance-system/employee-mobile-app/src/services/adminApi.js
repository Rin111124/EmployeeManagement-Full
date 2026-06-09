import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  accessToken: 'employee_access_token',
  refreshToken: 'employee_refresh_token',
  user: 'employee_user',
  adminUrl: 'employee_admin_url',
};

function getExpoHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest?.hostUri;

  return hostUri ? hostUri.split(':')[0] : null;
}

function readPublicEnv(key) {
  const value = typeof process !== 'undefined' ? process.env?.[key] : '';
  return typeof value === 'string' ? value.trim() : '';
}

export function getDefaultAdminUrl() {
  const configuredUrl = readPublicEnv('EXPO_PUBLIC_ADMIN_URL');
  if (configuredUrl) return normalizeAdminUrl(configuredUrl);

  const host = readPublicEnv('EXPO_PUBLIC_API_HOST') || getExpoHost() || 'localhost';
  return `http://${host}:5000/api/v1`;
}

function hasConfiguredAdminUrl() {
  return Boolean(readPublicEnv('EXPO_PUBLIC_ADMIN_URL'));
}

export function normalizeAdminUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return getDefaultAdminUrl();
  return trimmed.includes('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function secureGetItem(key) {
  try {
    if (await SecureStore.isAvailableAsync()) {
      const value = await SecureStore.getItemAsync(key);
      if (value) return value;
    }
  } catch {
    // Fall through to AsyncStorage for unsupported runtimes such as web preview.
  }

  return AsyncStorage.getItem(key);
}

async function secureSetItem(key, value) {
  try {
    if (await SecureStore.isAvailableAsync()) {
      await SecureStore.setItemAsync(key, value);
      await AsyncStorage.removeItem(key);
      return;
    }
  } catch {
    // Fall through to AsyncStorage for unsupported runtimes such as web preview.
  }

  await AsyncStorage.setItem(key, value);
}

async function secureRemoveItem(key) {
  try {
    if (await SecureStore.isAvailableAsync()) {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    // Ignore and still clear the fallback store.
  }

  await AsyncStorage.removeItem(key);
}

export async function loadStoredSession() {
  const [accessToken, refreshToken, userRaw, adminUrl] = await Promise.all([
    secureGetItem(STORAGE_KEYS.accessToken),
    secureGetItem(STORAGE_KEYS.refreshToken),
    AsyncStorage.getItem(STORAGE_KEYS.user),
    AsyncStorage.getItem(STORAGE_KEYS.adminUrl),
  ]);

  return {
    accessToken,
    refreshToken,
    user: userRaw ? JSON.parse(userRaw) : null,
    adminUrl: normalizeAdminUrl(hasConfiguredAdminUrl() ? getDefaultAdminUrl() : (adminUrl || getDefaultAdminUrl())),
  };
}

export async function saveAdminUrl(adminUrl) {
  if (hasConfiguredAdminUrl()) return;
  await AsyncStorage.setItem(STORAGE_KEYS.adminUrl, normalizeAdminUrl(adminUrl));
}

async function saveSession(payload) {
  const data = payload?.data || payload || {};
  const user = data.user || null;
  const accessToken = data.access_token || data.token || null;
  const refreshToken = data.refresh_token || null;

  if (accessToken) await secureSetItem(STORAGE_KEYS.accessToken, accessToken);
  if (refreshToken) await secureSetItem(STORAGE_KEYS.refreshToken, refreshToken);
  if (user) await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));

  return { user, accessToken, refreshToken };
}

export async function clearSession() {
  await Promise.all([
    secureRemoveItem(STORAGE_KEYS.accessToken),
    secureRemoveItem(STORAGE_KEYS.refreshToken),
    AsyncStorage.removeItem(STORAGE_KEYS.user),
  ]);
}

export function createAdminClient(getState, setState) {
  async function expireLocalSession() {
    await clearSession();
    setState((prev) => ({
      ...prev,
      accessToken: null,
      refreshToken: null,
      user: null,
      adminUrl: normalizeAdminUrl(prev.adminUrl || getDefaultAdminUrl()),
    }));
  }

  async function request(path, options = {}, retry = true) {
    const state = getState();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (state.accessToken) {
      headers.Authorization = `Bearer ${state.accessToken}`;
    }

    const init = {
      ...options,
      headers,
    };

    if (init.body && typeof init.body !== 'string') {
      init.body = JSON.stringify(init.body);
    }

    const response = await fetch(`${state.adminUrl}${path}`, init);

    if (response.status === 401 && retry && state.refreshToken && path !== '/auth/login') {
      const refreshed = await refreshToken();
      if (refreshed) {
        return request(path, options, false);
      }

      await expireLocalSession();
      const error = new Error('Phien dang nhap da het han. Vui long dang nhap lai.');
      error.status = 401;
      error.path = path;
      throw error;
    }

    const data = await readJson(response);
    if (!response.ok) {
      const message = data?.message || response.statusText || 'Request failed';
      if (/jwt expired|token.*expired|expired.*token|invalid token|revoked/i.test(message)) {
        await expireLocalSession();
        const error = new Error('Phien dang nhap da het han. Vui long dang nhap lai.');
        error.status = 401;
        error.path = path;
        error.response = data;
        throw error;
      }

      const error = new Error(`${message} (${response.status} ${path})`);
      error.status = response.status;
      error.path = path;
      error.response = data;
      throw error;
    }

    return data;
  }

  async function refreshToken() {
    const state = getState();
    try {
      const response = await fetch(`${state.adminUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: state.refreshToken }),
      });

      if (!response.ok) return false;
      const data = await readJson(response);
      const session = await saveSession(data);
      setState((prev) => ({ ...prev, ...session }));
      return true;
    } catch {
      return false;
    }
  }

  return {
    login: async (username, password) => {
      const data = await request('/auth/login', {
        method: 'POST',
        body: { username, password },
      }, false);
      const session = await saveSession(data);
      setState((prev) => ({ ...prev, ...session }));
      return session;
    },
    logout: async () => {
      try {
        await request('/auth/logout', { method: 'POST', body: {} }, false);
      } catch {
        // Local logout still succeeds if the server is unreachable.
      }
      await clearSession();
      setState((prev) => ({ ...prev, accessToken: null, refreshToken: null, user: null }));
    },
    clearLocalSession: expireLocalSession,
    getMe: () => request('/auth/me'),
    getEmployee: (id) => request(`/employees/${id}`),
    getAttendance: (params) => request(`/attendance/history?${new URLSearchParams(params).toString()}`),
    getPayroll: (params) => request(`/payroll?${new URLSearchParams(params).toString()}`),
    getContracts: (params) => request(`/contracts?${new URLSearchParams(params).toString()}`),
    getAssets: (params) => request(`/assets?${new URLSearchParams(params).toString()}`),
    getShiftAssignments: (params) => request(`/shift-assignments?${new URLSearchParams(params).toString()}`),
    getLeaveRequests: (params) => request(`/leave-requests?${new URLSearchParams(params).toString()}`),
    getOvertimeRequests: (params) => request(`/overtime?${new URLSearchParams(params).toString()}`),
    createLeaveRequest: (payload) => request('/leave-requests/mine', { method: 'POST', body: payload }),
    createOvertimeRequest: (payload) => request('/overtime/mine', { method: 'POST', body: payload }),
  };
}
