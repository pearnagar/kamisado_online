// client/src/net/online.ts
import { connect, getSocket } from './socket';
import { pieces, state, SIZE } from '../uiState';
import { render } from '../render';
import type { GameSnapshot, ClientToServer, ServerToClient, Side } from '../../shared/net/protocol';

// Local session vars
let mySide: Side | null = null;
let roomId: string | null = null;

export function getMySide() { return mySide; }

export function sendMove(from: { r: number; c: number }, to: { r: number; c: number }) {
  if (!roomId) return;
  const msg: ClientToServer = { t: 'move', room: roomId, from, to };
  getSocket().emit('msg', msg);
}

/** Apply a server snapshot into UI state & pieces, then render */
function applySnapshot(s: GameSnapshot) {
  // sanity: size mismatch guard (client URL should pass the same size you created)
  if (s.size !== SIZE) {
    console.warn('Snapshot size differs from URL size. URL size:', SIZE, 'snapshot size:', s.size);
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

  render();
}

/** Initialize online mode: connect, then create or join based on URL */
export function initOnlineGame() {
  const params = new URLSearchParams(location.search);
  const url = (import.meta as any)?.env?.VITE_SERVER_URL || undefined;

  const sock = connect(url);

  sock.on('connect', () => {
    // Decide create vs join
    const room = params.get('room');
    const sizeParam = (params.get('size') === '10' ? 10 : 8) as 8 | 10;
    // By default let White be bottomOwner for new rooms
    const bottomOwner: Side = 'White';

    if (room) {
      const msg: ClientToServer = { t: 'join_room', room };
      sock.emit('msg', msg);
    } else {
      const msg: ClientToServer = { t: 'create_room', size: sizeParam, bottomOwner };
      sock.emit('msg', msg);
    }
  });

  sock.on('msg', (m: ServerToClient) => {
    if (m.t === 'error') {
      console.error('Server error:', m.msg);
      state.message = `Online: ${m.msg}`;
      render();
      return;
    }

    if (m.t === 'room_created') {
      roomId = m.room;
      mySide = m.you;
      state.message = `Room created: ${roomId}. Share this code to join.`;
      // Add room code to URL so you can copy/paste the link
      const url = new URL(location.href);
      url.searchParams.set('room', roomId);
      history.replaceState(null, '', url.toString());
      render();
      return;
    }

    if (m.t === 'room_joined') {
      roomId = m.room;
      mySide = m.you;
      state.message = `Joined room ${roomId}.`;
      render();
      return;
    }

    if (m.t === 'state') {
      roomId = m.room;
      applySnapshot(m.state);
      return;
    }
  });

  sock.on('disconnect', () => {
    state.message = 'Disconnected from server';
    render();
  });
}
