// shared/net/protocol.ts

/* Sides / players */
export type Side = 'White' | 'Black';
export type RoomId = string;

/* Snapshot of the whole game (what server broadcasts) */
export type GameSnapshot = {
  size: 8 | 10;
  bottomOwner: Side;
  toMove: Side;
  requiredColorIndex?: number;
  winner?: Side;
  message?: string;
  pieces: Array<{
    owner: Side;
    colorIndex: number;
    r: number;
    c: number;
  }>;
};

/* Messages sent from client → server */
export type ClientToServer =
  | { t: 'create_room'; size: 8 | 10; bottomOwner: Side }
  | { t: 'join_room'; room: RoomId }
  | { t: 'move'; room: RoomId; from: { r: number; c: number }; to: { r: number; c: number } }
  | { t: 'resign'; room: RoomId };

/* Messages sent from server → client */
export type ServerToClient =
  | { t: 'error'; msg: string }
  | { t: 'room_created'; room: RoomId; you: Side; size: 8 | 10 }
  | { t: 'room_joined'; room: RoomId; you: Side; size: 8 | 10; oppJoined?: boolean }
  | { t: 'state'; room: RoomId; state: GameSnapshot };
