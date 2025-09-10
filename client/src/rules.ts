// client/src/rules.ts
import type { Player } from './types';
import { state, pieces } from './uiState';
import { colorIdxAt } from '../../shared/engine/boards';
import { recordMove } from './history';

// Let render.ts register a repaint callback without circular deps
let _render = () => {};
export function registerRenderer(fn: () => void) { _render = fn; }

/* -------------------------- Helpers -------------------------- */

export const onBoard = (r: number, c: number) =>
  r >= 0 && r < state.size && c >= 0 && c < state.size;

export function pieceIndexAt(r: number, c: number) {
  return pieces.findIndex(p => p.pos.r === r && p.pos.c === c);
}
export const occupied = (r: number, c: number) => pieceIndexAt(r, c) !== -1;

export function dirsFor(player: Player) {
  const dr = (player === 'White') ? -1 : +1; // White (bottom) goes up; Black goes down
  return [{ dr, dc: 0 }, { dr, dc: -1 }, { dr, dc: 1 }];
}

/* --------------------- Move generation ---------------------- */

const MAX_RAY = (state.size === 10) ? 7 : Number.POSITIVE_INFINITY;

export function legalMovesForPiece(pi: number) {
  const p = pieces[pi];
  const out: { r: number; c: number }[] = [];

  for (const d of dirsFor(p.owner)) {
    let steps = 0;
    let r = p.pos.r + d.dr, c = p.pos.c + d.dc;
    while (onBoard(r, c) && !occupied(r, c) && steps < MAX_RAY) {
      out.push({ r, c });
      steps++;
      const nr = r + d.dr, nc = c + d.dc;
      if (!onBoard(nr, nc) || occupied(nr, nc) || steps >= MAX_RAY) break;
      r = nr; c = nc;
    }
  }
  return out;
}

/* ------------------------ Selection ------------------------- */

export function selectPieceAt(r: number, c: number) {
  const idx = pieceIndexAt(r, c);
  if (idx === -1) return;

  const p = pieces[idx];
  if (p.owner !== state.toMove) return;
  if (state.requiredColorIndex !== undefined && p.colorIndex !== state.requiredColorIndex) return;

  state.selectedIndex = idx;
  state.legalTargets = legalMovesForPiece(idx);
  _render();
}

/* -------------------------- Moving -------------------------- */

/**
 * Attempt to move selected piece to (r, c).
 * Returns true if the move is applied, false otherwise.
 */
export function tryMoveTo(r: number, c: number): boolean {
  const idx = state.selectedIndex;
  if (idx === undefined) return false;

  if (!state.legalTargets.some(t => t.r === r && t.c === c)) return false;

  const p = pieces[idx];
  const from = { r: p.pos.r, c: p.pos.c };
  const to   = { r, c };

  // record first for undo/redo
  recordMove(idx, from, to);

  // apply
  p.pos = to;

  // win?
  const opp: Player = p.owner === 'White' ? 'Black' : 'White';
  const winRow = (opp === 'White') ? 0 : (state.size - 1);
  if (r === winRow) {
    state.winner = p.owner;
    state.message = `${p.owner} wins!`;
    state.requiredColorIndex = undefined;
    state.selectedIndex = undefined;
    state.legalTargets = [];
    _render();
    return true;
  }

  // next required color is landing square
  state.requiredColorIndex = colorIdxAt(state.size as 8 | 10, r, c);

  // switch turn & clear selection
  state.toMove = opp;
  state.selectedIndex = undefined;
  state.legalTargets = [];
  state.message = '';

  _render();
  return true;
}
