// client/src/rules.ts
import { state, pieces, SIZE, anim, BOTTOM_OWNER } from './uiState';
import type { Player } from './types';
import { colorIdxAt } from '@shared/engine/boards';
import { KANJI } from './palette';
import { recordMove, pushAction, type PassAction } from './history';

/* ---------------- Render callback (set by main) ---------------- */
let _render = () => {};
export function registerRenderer(fn: () => void) { _render = fn; }

/* ---------------------- Utilities / helpers -------------------- */

const MAX_RAY = (SIZE === 10) ? 7 : Number.POSITIVE_INFINITY;

const onBoard = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

export function homeRow(owner: Player) {
  // Bottom owner’s home is last row; the other's is top row.
  return owner === BOTTOM_OWNER ? (SIZE - 1) : 0;
}

export function pieceIndexAt(r: number, c: number) {
  return pieces.findIndex(p => p.pos.r === r && p.pos.c === c);
}
const occupied = (r: number, c: number) => pieceIndexAt(r, c) !== -1;

function dirsFor(owner: Player) {
  // Bottom owner moves "up" (toward smaller r), top owner moves "down"
  const dr = (owner === BOTTOM_OWNER) ? -1 : +1;
  return [{ dr, dc: 0 }, { dr, dc: -1 }, { dr, dc: 1 }];
}

function switchTurn() {
  state.toMove = state.toMove === 'White' ? 'Black' : 'White';
}

export function currentPlayersPieceIndexByColor(ci: number) {
  const i = pieces.findIndex(p => p.owner === state.toMove && p.colorIndex === ci);
  return i === -1 ? undefined : i;
}

/* ---------------------- Move generation ----------------------- */

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

/* -------------------------- Selection ------------------------- */

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

/* --------------------------- Moving --------------------------- */

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

  // Win: reached opponent's home row
  const opp: Player = p.owner === 'White' ? 'Black' : 'White';
  if (r === homeRow(opp)) {
    state.winner = p.owner;
    state.message = `${p.owner} wins!`;
    state.selectedIndex = undefined;
    state.legalTargets = [];
    _render();
    return;
  }

  // Next required color is the landing square's color
  state.requiredColorIndex = colorIdxAt(SIZE as 8 | 10, r, c);

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

/* ---------------------- Forced pass (blocked) ------------------ */

/**
 * Call at the start of a turn. If the required piece for the side to move
 * is blocked (no legal moves), we animate a "step on the same square",
 * record a pass, switch turn, and set the required color to that square's color.
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

export function passWithAnimation(forcedIdx: number) {
  const blocked = pieces[forcedIdx];
  const blockedSquareColor = colorIdxAt(SIZE as 8 | 10, blocked.pos.r, blocked.pos.c); // color under the blocked piece

  // Set up the "step on the same square" animation (vertical bounce)
  anim.active = true;
  anim.pieceIndex = forcedIdx;
  anim.start = performance.now();
  anim.kind = 'passStep'; // render.ts will translate the piece up/down on the SAME square

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

      // Turn goes to the opponent, and required color becomes the BLOCKED SQUARE's color
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
