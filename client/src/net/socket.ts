// client/src/net/socket.ts
import { io, type Socket } from 'socket.io-client';

const DEFAULT_URL =
  (import.meta as any)?.env?.VITE_SERVER_URL ||
  (typeof window !== 'undefined' ? `${location.protocol}//${location.hostname}:8787` : 'http://localhost:8787');

let socket: Socket | null = null;

export function connect(url = DEFAULT_URL) {
  socket = io(url, { transports: ['websocket'] });
  return socket;
}

export function getSocket(): Socket {
  if (!socket) throw new Error('socket not connected yet');
  return socket;
}
