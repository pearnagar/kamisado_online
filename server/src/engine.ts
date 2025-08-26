// server/src/engine.ts
import { newGame } from '../../shared/engine/state';
import { applyMoveServer, checkForcedPassServer } from '../../shared/engine/rules-core';
import type { GameSnapshot, Side } from '../../shared/net/protocol';

// Keep the server’s engine state as the return type of newGame
export type ServerGame = ReturnType<typeof newGame>;

/** Create a fresh game for a room */
export function makeGame(size: 8 | 10, bottomOwner: Side): ServerGame {
  return newGame(size, bottomOwner);
}

/**
 * Apply a move and resolve any forced-pass chain.
 * Returns false if illegal.
 */
export function applyMoveAndResolve(
  S: ServerGame,
  from: { r: number; c: number },
  to: { r: number; c: number }
): boolean {
  const ok = applyMoveServer(S, from, to);
  if (!ok) return false;

  // Resolve any automatic forced passes that result from this move.
  while (checkForcedPassServer(S)) { /* keep resolving */ }
  return true;
}

/** Build a snapshot to send to clients */
export function snapshot(
  S: ServerGame,
  size: 8 | 10,
  bottomOwner: Side
): GameSnapshot {
  return {
    size,
    bottomOwner,
    toMove: S.toMove,
    requiredColorIndex: S.requiredColorIndex,
    winner: S.winner,
    message: S.message,
    // Explicitly type the map param to avoid "implicit any" under strict TS
    pieces: S.pieces.map((p): { owner: Side; colorIndex: number; r: number; c: number } => ({
      owner: p.owner as Side,
      colorIndex: p.colorIndex,
      r: p.r,
      c: p.c,
    })),
  };
}
