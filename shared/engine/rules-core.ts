import type { GameCore, Player, Square } from './types';
import { colorIdxAt } from './boards';

export function legalMovesForPieceCore(S: GameCore, pi: number): Square[] { /* ... */ }
export function applyMoveServer(S: GameCore, from: Square, to: Square): boolean { /* ... */ }
export function checkForcedPassServer(S: GameCore): boolean { /* ... */ }
export function homeRow(S: GameCore, owner: Player): number { /* ... */ }
