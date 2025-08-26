import type { GameCore, Player, PieceCore } from './types';
import { colorIdxAt } from './boards';

export function newGame(size: 8 | 10, bottomOwner: Player): GameCore {
  // ...
  return { /* ... */ };
}

export function homeRow(size: 8 | 10, owner: Player, bottomOwner: Player) {
  // ...
}

// (No default export needed; just ensure there is at least one export)
