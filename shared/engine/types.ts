export type Player = 'White' | 'Black';
export type PieceCore = { owner: Player; colorIndex: number; r: number; c: number };
export type GameCore = {
  size: 8 | 10;
  bottomOwner: Player;
  toMove: Player;
  requiredColorIndex?: number;
  winner?: Player;
  message?: string;
  pieces: PieceCore[];
  maxRay: number;
};
export type Square = { r: number; c: number };
