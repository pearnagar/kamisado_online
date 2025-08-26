// client/src/net/online.ts
import { connect, onMessage, send } from './socket';
import type { GameSnapshot, Side } from '@shared/net/protocol';

let currentRoom = '';
let mySide: Side = 'White';
let snapshot: GameSnapshot | null = null;

type OnState = (s: GameSnapshot, you: Side) => void;
let onState: OnState | null = null;

export function setOnState(cb: OnState) { onState = cb; }
export function getSnapshot() { return snapshot; }
export function getMySide() { return mySide; }
export function getRoom() { return currentRoom; }

export function startOnline(serverUrl: string) {
  connect(serverUrl);
  onMessage((msg) => {
    if (msg.t === 'room_created') { currentRoom = msg.room; mySide = msg.you; }
    if (msg.t === 'room_joined')  { currentRoom = msg.room; mySide = msg.you; }
    if (msg.t === 'state') {
      snapshot = msg.state;
      onState?.(snapshot, mySide);
    }
    if (msg.t === 'error') {
      // eslint-disable-next-line no-alert
      alert(`Server: ${msg.msg}`);
    }
  });
}

export function createRoom(size: 8 | 10, bottomOwner: Side) {
  send({ t: 'create_room', size, bottomOwner });
}
export function joinRoom(room: string) {
  send({ t: 'join_room', room });
}
export function sendMove(from: { r: number; c: number }, to: { r: number; c: number }) {
  send({ t: 'move', room: currentRoom, from, to });
}
