// shared/net/protocol.ts
export type Side = 'White' | 'Black';
export type RoomId = string;

export type GameSnapshot = {
  size: 8 | 10;
  bottomOwner: Side;              // who is at the bottom (human choice)
  toMove: Side;
  requiredColorIndex?: number;
  winner?: Side;
  message?: string;
  pieces: Array<{ owner: Side; colorIndex: number; r: number; c: number }>;
};

export type ClientToServer =
  | { t: 'create_room'; size: 8 | 10; bottomOwner: Side }                  // returns room + your side
  | { t: 'join_room'; room: RoomId }
  | { t: 'move'; room: RoomId; from: { r: number; c: number }; to: { r: number; c: number } }
  | { t: 'resign'; room: RoomId };

export type ServerToClient =
  | { t: 'room_created'; room: RoomId; you: Side; size: 8 | 10 }
  | { t: 'room_joined'; room: RoomId; you: Side; size: 8 | 10; oppJoined: boolean }
  | { t: 'state'; room: RoomId; state: GameSnapshot }
  | { t: 'error'; msg: string };
