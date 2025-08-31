// client/src/net/online.ts
import { connect, getSocket } from './socket';
import { pieces, state, SIZE } from '../uiState';
import { render } from '../render';
import type { GameSnapshot, ClientToServer, ServerToClient, Side } from '../../../shared/net/protocol';

let mySide: Side | null = null;
let roomId: string | null = null;

export function getMySide(): Side | null { return mySide; }

export function sendMove(from: { r: number; c: number }, to: { r: number; c: number }) {
  if (!roomId) return;
  const msg: ClientToServer = { t: 'move', room: roomId, from, to };
  getSocket().emit('msg', msg);
}

function applySnapshot(s: GameSnapshot) {
  if (s.size !== SIZE) {
    console.warn(`Snapshot size (${s.size}) != URL size (${SIZE}). Consider reloading with ?size=${s.size}`);
  }

  pieces.length = 0;
  for (const p of s.pieces) {
    pieces.push({ owner: p.owner, colorIndex: p.colorIndex, pos: { r: p.r, c: p.c } });
  }

  state.toMove = s.toMove;
  state.requiredColorIndex = s.requiredColorIndex;
  state.winner = s.winner;
  state.message = s.message || '';
  state.selectedIndex = undefined;
  state.legalTargets = [];

  const roomEl = document.getElementById('room-label');
  if (roomEl && roomId) roomEl.textContent = `Room: ${roomId}`;

  render();
}

export function initOnlineGame() {
  const params = new URLSearchParams(location.search);

  const url =
    (import.meta as any)?.env?.VITE_SERVER_URL ||
    (typeof window !== 'undefined' ? `${location.protocol}//${location.hostname}:8787` : 'http://localhost:8787');

  const sock = connect(url);

  sock.on('connect', () => {
    const roomParam = params.get('room');           // string | null
    const sizeParam = (params.get('size') === '10' ? 10 : 8) as 8 | 10;
    const bottomOwner: Side = 'White';

    if (roomParam && roomParam.trim().length > 0) {
      const room: string = roomParam.trim();        // narrow to string
      const msg: ClientToServer = { t: 'join_room', room };
      sock.emit('msg', msg);
    } else {
      const msg: ClientToServer = { t: 'create_room', size: sizeParam, bottomOwner };
      sock.emit('msg', msg);
    }
  });

  sock.on('connect_error', (err) => {
    console.error('Socket connect_error:', err);
    state.message = 'Online: cannot connect to server';
    render();
  });

  sock.on('disconnect', () => {
    state.message = 'Online: disconnected';
    render();
  });

  sock.on('msg', (m: ServerToClient) => {
    switch (m.t) {
      case 'error': {
        console.error('Server error:', m.msg);
        state.message = `Online: ${m.msg}`;
        render();
        break;
      }
      case 'room_created': {
        roomId = m.room;
        mySide = m.you;

        const u = new URL(location.href);
        u.searchParams.set('room', roomId);        // roomId is string here
        history.replaceState(null, '', u.toString());

        state.message = `Room created: ${roomId}. Share this link to invite.`;
        const roomEl = document.getElementById('room-label');
        if (roomEl) roomEl.textContent = `Room: ${roomId}`;
        render();
        break;
      }
      case 'room_joined': {
        roomId = m.room;
        mySide = m.you;
        state.message = `Joined room ${roomId}.`;
        const roomEl = document.getElementById('room-label');
        if (roomEl) roomEl.textContent = `Room: ${roomId}`;
        render();
        break;
      }
      case 'state': {
        roomId = m.room;
        applySnapshot(m.state);
        break;
      }
    }
  });
}
