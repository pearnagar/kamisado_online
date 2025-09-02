// client/src/rules.ts
import type { Player } from './types';
import { state, pieces, anim } from './uiState';
import { colorIdxAt } from '../../shared/engine/boards';
import { KANJI } from './palette';
import { recordMove, pushAction, type PassAction } from './history';

// Render callback (set from main/render to avoid circular imports)
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
  // White moves "up" (toward smaller r); Black moves "down"
  const dr = player === 'White' ? -1 : +1;
  return [{ dr, dc: 0 }, { dr, dc: -1 }, { dr, dc: 1 }];
}

export function switchTurn() {
  state.toMove = state.toMove === 'White' ? 'Black' : 'White';
}

export function currentPlayersPieceIndexByColor(ci: number) {
  const i = pieces.findIndex(p => p.owner === state.toMove && p.colorIndex === ci);
  return i === -1 ? undefined : i;
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

export function tryMoveTo(r: number, c: number) {
  if (state.selectedIndex === undefined) return;
  if (!state.legalTargets.some(t => t.r === r && t.c === c)) return;

  const idx = state.selectedIndex;
  const p = pieces[idx];

  // Record BEFORE mutating (for Undo/Redo)
  const from = { r: p.pos.r, c: p.pos.c };
  recordMove(idx, from, { r, c });

  // Apply move
  p.pos = { r, c };

  // Win: reach opponent's home row
  const opp: Player = p.owner === 'White' ? 'Black' : 'White';
  const oppHomeRow = (opp === 'White') ? 0 : (state.size - 1);
  if (r === oppHomeRow) {
    state.winner = p.owner;
    state.message = `${p.owner} wins!`;
    state.selectedIndex = undefined;
    state.legalTargets = [];
    _render();
    return;
  }

  // Next required color is the landing square
  state.requiredColorIndex = colorIdxAt(state.size as 8 | 10, r, c);

  // Clear selection and switch turn
  state.selectedIndex = undefined;
  state.legalTargets = [];
  switchTurn();

  // Immediately check forced-pass for the new player
  if (!checkForcedPass()) {
    state.message = '';
    _render();
  }
}

/**
 * If the required piece for the side to move is blocked (no legal moves),
 * animate a "step on the same square", record a pass, switch turn, and set
 * the required color to the color of that square.
 * Returns true if a pass was initiated.
 */
export function checkForcedPass(): boolean {
  if (state.requiredColorIndex === undefined || state.winner || anim.active) return false;

  const forcedIdx = currentPlayersPieceIndexByColor(state.requiredColorIndex);
  if (forcedIdx === undefined) return false;

  const moves = legalMovesForPiece(forcedIdx);
  if (moves.length > 0) return false;

  passWithAnimation(forcedIdx);
  return true;
}

/* ---------------------- Pass / Skip logic -------------------- */

export function passWithAnimation(forcedIdx: number) {
  const blocked = pieces[forcedIdx];
  const blockedSquareColor = colorIdxAt(state.size as 8 | 10, blocked.pos.r, blocked.pos.c);

  // Setup "step on the same square" animation (vertical bounce)
  anim.active = true;
  anim.pieceIndex = forcedIdx;
  anim.start = performance.now();
  anim.kind = 'passStep';

  state.message = `${KANJI[blocked.colorIndex]} piece is blocked — ${state.toMove} passes`;

  const step = () => {
    if (!anim.active) return;

    const t = (performance.now() - anim.start) / anim.duration;
    _render(); // draw the bounce frame

    if (t >= 1) {
      // End of animation: record the pass, then apply its effects
      anim.active = false;

      const action: PassAction = {
        kind: 'pass',
        playerWhoPassed: state.toMove,
        blockedPieceIndex: forcedIdx,
        blockedColorIndex: blocked.colorIndex,
        blockedSquareColor,
        prevToMove: state.toMove,
        prevRequired: state.requiredColorIndex,
        prevMessage: state.message,
      };
      pushAction(action);

      // Turn goes to opponent; required color becomes the BLOCKED SQUARE color
      switchTurn();
      state.requiredColorIndex = blockedSquareColor;
      state.message = `Required color changes to ${KANJI[blockedSquareColor]} (blocked square)`;

      _render();
      return;
    }

    requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}
