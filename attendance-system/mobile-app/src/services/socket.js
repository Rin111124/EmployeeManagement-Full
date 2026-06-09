import { io } from 'socket.io-client';
import { getDefaultApiConfig } from './api';

let socket = null;
let currentSocketUrl = null;
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
const debugLog = (...args) => {
  if (isDev) console.log(...args);
};

export const initSocket = (url) => {
  const targetUrl = (url || getDefaultApiConfig().adminUrl).replace(/\/api\/v1\/?$/, '');
  if (socket && currentSocketUrl === targetUrl) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  currentSocketUrl = targetUrl;
  debugLog('[SOCKET] Connecting to:', targetUrl);
  
  socket = io(targetUrl, {
    transports: ['polling', 'websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    debugLog('[SOCKET] Connected to Admin Server');
  });

  socket.on('disconnect', (reason) => {
    debugLog('[SOCKET] Disconnected from Admin Server:', reason);
  });

  socket.on('connect_error', (error) => {
    debugLog('[SOCKET] Connection error:', error?.message || error);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentSocketUrl = null;
  }
};
