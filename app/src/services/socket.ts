import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import { syncEngine } from './syncEngine';
import { getSocketUrl } from './apiConfig';

let socket: Socket | null = null;

export function getSocketServerUrl(): string {
  return getSocketUrl();
}

export function initSocket(customUrl?: string): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  const url = customUrl || getSocketServerUrl();
  console.log('[Socket] Connecting to:', url);

  socket = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected with ID:', socket?.id);
    if (socket) {
      syncEngine.init(socket);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.warn('[Socket] Connection error:', error.message);
  });

  return socket;
}

export function getSocket(): Socket {
  if (!socket) {
    return initSocket();
  }
  return socket;
}
