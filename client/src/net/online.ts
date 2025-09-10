import { connect, getSocket } from './socket';
import type { Socket } from 'socket.io-client';
import type {
  ClientToServer,
  ServerToClient,
  RoomId,
  GameSnapshot,
} from '../../../shared/net/protocol';
import { MODE, setSize, setBottomOwner, state, pieces } from '../uiState';
import { render } from '../render';
import { updateToolbar } from '../input';
import { initLocalGame } from '../setup';
import type { Player } from '../types';
import { updateHeader } from '../ui/header';

// Small status helpers (no-arg render/updateToolbar calls)
function setHeader(msg: string) {
  const el = document.getElementById('msg');
  if (el) el.textContent = msg;
}
function invalidateUI() {
  render();
  updateToolbar();
}

/** Resolve server URL from env (vite) or default */
function serverURL(): string {
  const v = (import.meta as any).env?.VITE_SERVER_URL as string | undefined;
  return v || 'http://localhost:8787';
}

let socket: Socket | null = null;
let currentRoom: RoomId | null = null;
let mySide: Player | null = null;

export function getMySide(): Player | null {
  return mySide;
}

/** Apply a full game snapshot sent by the server */
function applySnapshot(s: GameSnapshot) {
  setSize(s.size);
  setBottomOwner(s.bottomOwner);
  state.toMove = s.toMove;
  state.requiredColorIndex = s.requiredColorIndex ?? undefined;
  state.winner = s.winner ?? undefined;
  state.message = s.message ?? '';

  pieces.length = 0;
  for (const P of s.pieces) {
    pieces.push({
      owner: P.owner,
      colorIndex: P.colorIndex,
      pos: { r: P.r, c: P.c },
    });
  }

  invalidateUI();
  updateHeader();
}

/** Wire all socket listeners */
function attachSocketHandlers(sock: Socket) {
  sock.on('connect', () => setHeader('Online: connected'));
  sock.on('disconnect', () => setHeader('Online: disconnected'));

  sock.on('room_created', (payload: any) => {
    currentRoom = payload.room;
    mySide = payload.you;
    setHeader(`Room created: ${payload.room}. Share this URL to invite.`);
    // Update URL so you can copy/share
    const url = new URL(window.location.href);
    url.searchParams.set('room', payload.room);
    history.replaceState({}, '', url.toString());
    updateHeader();
  });

  sock.on('room_joined', (payload: any) => {
    currentRoom = payload.room;
    mySide = payload.you;
    setHeader(`Joined room: ${payload.room}`);
    updateHeader();
  });

  sock.on('state', (payload: any) => {
    if (!payload.state) return;
    applySnapshot(payload.state);
  });

  sock.on('error', (payload: any) => {
    setHeader(`Online error: ${payload.msg}`);
  });
}

/** Create or join depending on URL ?room=... */
function createOrJoin(sock: Socket) {
  const qs = new URLSearchParams(location.search);
  const size = qs.get('size') === '10' ? 10 : 8;
  const human =
    (qs.get('human') || 'white').toLowerCase() === 'black' ? 'Black' : 'White';
  const room = qs.get('room');

  if (room) {
    sock.emit('join_room', { room });
    setHeader(`Joining room ${room}…`);
  } else {
    sock.emit('create_room', { size, bottomOwner: human });
    setHeader('Creating room…');
  }
}

/** Leave current room and reset back to local game. */
export function leaveRoom() {
  if (socket && currentRoom) {
    socket.emit('resign', { room: currentRoom });
    socket.disconnect();
  }
  socket = null;
  currentRoom = null;
  mySide = null;

  // Back to local default
  initLocalGame();
  invalidateUI();
}

/* -------------------- Moves -------------------- */

export function sendMove(
  from: { r: number; c: number },
  to: { r: number; c: number }
) {
  if (!socket || !currentRoom) return;
  socket.emit('move', { room: currentRoom, from, to });
}

/** Public entry for online mode */
export function initOnlineGame() {
  if (MODE !== 'online') return;

  try {
    socket = connect(serverURL());
    attachSocketHandlers(socket);
    createOrJoin(socket);
  } catch (e) {
    console.error(e);
    setHeader('Online: cannot connect to server');
  }
}