// client/src/net/online.ts
// Online play helpers (wrapping socket.io client). Provides mode checks,
// mySide, leaveRoom, sendMove, etc.

import { io, Socket } from 'socket.io-client';
import { state, pieces, MODE } from '../uiState';
import type { Player } from '../types';
// import type { ClientToServer, ServerToClient } from '@shared/net/protocol';
import { initLocalGame } from '../setup';

let socket: any = null;
let mySide: Player | null = null;
let roomId: string | null = null;

/* -------------------- Mode helpers -------------------- */

export function isOnline() {
  return MODE === 'online';
}

export function getMySide(): Player | null {
  return mySide;
}

/* -------------------- Lifecycle -------------------- */

export function initOnlineGame() {
  if (MODE !== 'online') return;

  // Access Vite env safely; fall back to localhost
  const url =
    ((import.meta as any)?.env?.VITE_SERVER_URL as string) ||
    (window as any).__SERVER_URL ||
    'http://localhost:8787';

  socket = io(url);

  socket.on('connect', () => {
    console.log('connected to server');
    // For now, auto-create room (you can add UI to join)
    socket!.emit('msg', { t: 'create_room', size: state.size as 8 | 10, bottomOwner: 'White' });
  });

  socket.on('msg', (msg: any) => {
    if (!msg || !msg.t) return;

    if (msg.t === 'room_created') {
      mySide = msg.you as Player;
      roomId = msg.room as string;
      console.log(`room created: ${roomId}, you=${mySide}`);
    } else if (msg.t === 'room_joined') {
      mySide = msg.you as Player;
      roomId = msg.room as string;
      console.log(`joined room: ${roomId}, you=${mySide}`);
    } else if (msg.t === 'state') {
      // Apply server snapshot to local state
      const snap = msg.state || {};
      state.size = (snap.size as 8 | 10) ?? state.size;
      state.toMove = (snap.toMove as Player) ?? state.toMove;

      // Some servers might send `required`, others `req`
      state.requiredColorIndex =
        (snap.required as number | undefined) ??
        (snap.req as number | undefined);

      state.winner = snap.winner as Player | undefined;

      pieces.length = 0;
      const sp = Array.isArray(snap.pieces) ? snap.pieces : [];
      for (const it of sp) {
        pieces.push({
          owner: it.owner as Player,
          colorIndex: it.colorIndex as number,
          pos: { r: it.r as number, c: it.c as number },
        });
      }
    } else if (msg.t === 'error') {
      console.error('server error', msg.msg);
    }
  });
}

/** Leave current room and reset back to local game. */
export function leaveRoom() {
  if (socket && roomId) {
    socket.emit('msg', { t: 'resign', room: roomId });
    socket.disconnect();
  }
  socket = null;
  roomId = null;
  mySide = null;

  // Back to local default
  initLocalGame();
}

/* -------------------- Moves -------------------- */

export function sendMove(from: { r: number; c: number }, to: { r: number; c: number }) {
  if (!socket || !roomId) return;
  socket.emit('msg', { t: 'move', room: roomId, from, to });
}
