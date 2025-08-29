// shared/engine/rules-core.ts
import type { GameCore, Player, Square } from './types';
import { colorIdxAt } from './boards';

/* ------------------------ Helpers ------------------------ */

export function onBoard(S: GameCore, r: number, c: number): boolean {
  return r >= 0 && r < S.size && c >= 0 && c < S.size;
}

export function homeRow(S: GameCore, owner: Player): number {
  // Bottom owner’s home is last row; the other’s is row 0
  return owner === S.bottomOwner ? (S.size - 1) : 0;
}

export function dirsFor(S: GameCore, owner: Player) {
  const dr = owner === S.bottomOwner ? -1 : +1; // bottom moves “up”
  return [{ dr, dc: 0 }, { dr, dc: -1 }, { dr, dc: 1 }];
}

/* ----------------- Move generation ----------------- */

export function legalMovesForPieceCore(S: GameCore, pi: number): Square[] {
  const P = S.pieces[pi];
  const out: Square[] = [];
  const MAX_RAY = S.maxRay;

  for (const d of dirsFor(S, P.owner)) {
    let steps = 0;
    let r = P.r + d.dr, c = P.c + d.dc;

    while (onBoard(S, r, c) && !occupied(S, r, c) && steps < MAX_RAY) {
      out.push({ r, c });
      steps++;
      const nr = r + d.dr, nc = c + d.dc;
      if (!onBoard(S, nr, nc) || occupied(S, nr, nc) || steps >= MAX_RAY) break;
      r = nr; c = nc;
    }
  }
  return out;
}

export function pieceIndexAt(S: GameCore, r: number, c: number): number {
  return S.pieces.findIndex(p => p.r === r && p.c === c);
}

export function occupied(S: GameCore, r: number, c: number): boolean {
  return pieceIndexAt(S, r, c) !== -1;
}

export function currentPlayersPieceIndexByColor(S: GameCore, ci: number): number | undefined {
  const i = S.pieces.findIndex(p => p.owner === S.toMove && p.colorIndex === ci);
  return i === -1 ? undefined : i;
}

/* ----------------- Move application ----------------- */

/**
 * Apply a move on the *server side*. Mutates GameCore state.
 * Returns false if the move was illegal.
 */
export function applyMoveServer(S: GameCore, from: Square, to: Square): boolean {
  const pi = pieceIndexAt(S, from.r, from.c);
  if (pi === -1) return false;

  const P = S.pieces[pi];
  if (P.owner !== S.toMove) return false;

  const moves = legalMovesForPieceCore(S, pi);
  if (!moves.some(m => m.r === to.r && m.c === to.c)) return false;

  // Apply move
  P.r = to.r; P.c = to.c;

  // Win check
  const opp: Player = P.owner === 'White' ? 'Black' : 'White';
  if (to.r === homeRow(S, opp)) {
    S.winner = P.owner;
    S.message = `${P.owner} wins!`;
  }

  // Update required color
  S.requiredColorIndex = colorIdxAt(S.size, to.r, to.c);

  // Switch turn
  S.toMove = opp;
  return true;
}

/* ----------------- Forced pass ----------------- */

/**
 * If the required piece for the side to move has no legal moves,
 * update state: simulate “pass on same square” and switch turn.
 * Returns true if a pass was applied.
 */
export function checkForcedPassServer(S: GameCore): boolean {
  if (S.requiredColorIndex === undefined || S.winner) return false;

  const forcedIdx = currentPlayersPieceIndexByColor(S, S.requiredColorIndex);
  if (forcedIdx === undefined) return false;

  const moves = legalMovesForPieceCore(S, forcedIdx);
  if (moves.length > 0) return false;

  // Blocked piece → pass
  const blocked = S.pieces[forcedIdx];
  const blockedSquareColor = colorIdxAt(S.size, blocked.r, blocked.c);

  S.message = `${blocked.owner} ${blocked.colorIndex} blocked — pass`;
  // Switch turn
  S.toMove = S.toMove === 'White' ? 'Black' : 'White';
  S.requiredColorIndex = blockedSquareColor;
  return true;
}
