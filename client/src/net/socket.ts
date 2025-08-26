// client/src/net/socket.ts
import { io, Socket } from 'socket.io-client';
import type { ClientToServer, ServerToClient } from '@shared/net/protocol';

let socket: Socket | null = null;

export function connect(url = (import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8787')) {
  socket = io(url, { transports: ['websocket'] });
}

export function onMessage(handler: (msg: ServerToClient) => void) {
  socket?.on('msg', handler);
}

export function send(msg: ClientToServer) {
  socket?.emit('msg', msg);
}
