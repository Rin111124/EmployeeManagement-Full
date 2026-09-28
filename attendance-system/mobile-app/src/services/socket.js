import { io } from 'socket.io-client';
import { getDefaultApiConfig } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket = null;
let currentSocketUrl = null;
let _lastConnectErrorLog = 0;
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
const debugLog = (...args) => {
  if (isDev) console.log(...args);
};

const getStoredToken = async () => {
  try {
    // Thử SecureStore trước, fallback AsyncStorage
    const { default: SecureStore } = await import('expo-secure-store');
    const val = await SecureStore.getItemAsync('device_token');
    if (val) return val;
  } catch { }
  try {
    return await AsyncStorage.getItem('device_token');
  } catch { }
  return null;
};

export const initSocket = async (url) => {
  const targetUrl = (url || getDefaultApiConfig().adminUrl).replace(/\/api\/v1\/?$/, '');

  // Đọc token để gửi trong auth handshake
  const token = await getStoredToken();

  // Nếu socket đã kết nối đúng URL và đúng token thì giữ nguyên
  if (socket && currentSocketUrl === targetUrl && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentSocketUrl = targetUrl;
  debugLog('[SOCKET] Connecting to:', targetUrl, token ? '(with token)' : '(no token yet)');

  socket = io(targetUrl, {
    transports: ['polling', 'websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    auth: token ? { token } : {},
  });

  socket.on('connect', () => {
    debugLog('[SOCKET] Connected to Admin Server');
  });

  socket.on('disconnect', (reason) => {
    debugLog('[SOCKET] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    // Throttle log: chỉ log 1 lần mỗi 10 giây để tránh spam
    const now = Date.now();
    if (now - _lastConnectErrorLog > 10000) {
      debugLog('[SOCKET] Connection error:', error?.message || error);
      _lastConnectErrorLog = now;
    }
  });

  return socket;
};

export const getSocket = () => socket;

/** Gọi sau khi có device_token để reconnect với auth mới */
export const reconnectSocketWithToken = async (url) => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentSocketUrl = null;
  }
  return initSocket(url);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentSocketUrl = null;
  }
};

