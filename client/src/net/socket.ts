import { io, type Socket } from 'socket.io-client';

// Prefer env; else current host on :8787
const envUrl = (import.meta as any)?.env?.VITE_SERVER_URL as string | undefined;
const DEFAULT_URL = envUrl || `${location.protocol}//${location.hostname}:8787`;

let socket: Socket | null = null;

export function connect(url = DEFAULT_URL) {
  console.log('[socket] VITE_SERVER_URL =', envUrl);
  console.log('[socket] connecting to', url);

  socket = io(url, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],  // allow fallback
    timeout: 10000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect_error', (err) => {
    console.error('[socket] connect_error:', err?.message || err);
  });
  socket.on('error', (err) => {
    console.error('[socket] error:', err);
  });

  return socket;
}

export function getSocket(): Socket {
  if (!socket) throw new Error('socket not connected yet');
  return socket;
}
