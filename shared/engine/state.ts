// shared/engine/state.ts
import type { GameCore, Player, PieceCore } from './types';
import { BOARD8, BOARD10 } from './boards';

/* ------------------------ newGame ------------------------ */

export function newGame(size: 8 | 10, bottomOwner: Player): GameCore {
  const board = (size === 8) ? BOARD8 : BOARD10;


  const pieces: PieceCore[] = [];

  // Top player’s pieces (row 0)
  for (let c = 0; c < size; c++) {
    pieces.push({
      owner: bottomOwner === 'White' ? 'Black' : 'White',
      colorIndex: board[0][c],
      r: 0,
      c,
    });
  }

  // Bottom player’s pieces (row size-1)
  for (let c = 0; c < size; c++) {
    pieces.push({
      owner: bottomOwner,
      colorIndex: board[size - 1][c],
      r: size - 1,
      c,
    });
  }

  const game: GameCore = {
    size,
    bottomOwner,
    toMove: 'White', // White always starts
    requiredColorIndex: undefined,
    winner: undefined,
    message: '',
    pieces,
    maxRay: (size === 10) ? 7 : Number.POSITIVE_INFINITY,
  };

  return game;
}
