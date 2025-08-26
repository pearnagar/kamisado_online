// server/src/room.ts
import type { Side, RoomId } from '@shared/net/protocol';
import type { ServerGame } from './engine';
import { makeGame } from './engine';

/** A game room on the server */
export type Room = {
  id: RoomId;
  size: 8 | 10;
  bottomOwner: Side;
  game: ServerGame;
  sockets: { [side in Side]?: string };
};

/** In-memory room store (replace with DB if needed) */
const rooms = new Map<RoomId, Room>();

/** Generate a short random room code */
export function makeRoomId(): RoomId {
  return Math.random().toString(36).slice(2, 7);
}

/** Create a new room */
export function createRoom(size: 8 | 10, bottomOwner: Side, socketId: string): Room {
  const id = makeRoomId();
  const room: Room = {
    id,
    size,
    bottomOwner,
    game: makeGame(size, bottomOwner),
    sockets: { [bottomOwner]: socketId },
  };
  rooms.set(id, room);
  return room;
}

/** Get a room by ID */
export function getRoom(id: RoomId): Room | undefined {
  return rooms.get(id);
}

/** Delete a room (on resign/disconnect) */
export function deleteRoom(id: RoomId) {
  rooms.delete(id);
}

/** Assign the opponent side when someone joins */
export function assignOpponent(room: Room, socketId: string): Side | null {
  const opp: Side = room.bottomOwner === 'White' ? 'Black' : 'White';
  if (room.sockets[opp]) return null; // already taken
  room.sockets[opp] = socketId;
  return opp;
}

/** Iterate all rooms to clean up when a socket disconnects */
export function cleanupSocket(socketId: string): RoomId[] {
  const removed: RoomId[] = [];
  for (const [id, room] of rooms) {
    if (room.sockets.White === socketId || room.sockets.Black === socketId) {
      rooms.delete(id);
      removed.push(id);
    }
  }
  return removed;
}
