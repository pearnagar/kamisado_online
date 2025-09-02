// client/src/input.ts
// User input wiring: canvas clicks, toolbar buttons (Home/New/Undo/Redo/Fullscreen),
// and mode-aware guards (offline vs online). Includes robust click → cell mapping
// with clamping so the bottom/top rows are always reachable.

import { MODE, SIZE, state, pieces, BOT } from './uiState';
import type { Player } from './types';
import { selectPieceAt, tryMoveTo, legalMovesForPiece } from './rules';
import { undo, redo, past, future } from './history';
import { initLocalGame } from './setup';
import { isOnline, getMySide, sendMove, leaveRoom } from './net/online';
import { KANJI } from "./palette";


/* ------------------------------ Toolbar ------------------------------ */

const $ = (id: string) => document.getElementById(id)!;

const btnNew = $('reset-btn') as HTMLButtonElement;
const btnUndo = $('undo-btn') as HTMLButtonElement;
const btnRedo = $('redo-btn') as HTMLButtonElement;
const btnFS   = $('fs-btn') as HTMLButtonElement;

// "Home" = click the title in header (works on your game.html)
const titleEl = document.querySelector('header h1') as HTMLElement;

/** Enable/disable buttons according to mode and history. */
export function updateToolbar() {
  // Buttons
  const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement | null;
  const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement | null;
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement | null;

  const online = isOnline();
  if (undoBtn) undoBtn.disabled = online;
  if (redoBtn) redoBtn.disabled = online;
  if (resetBtn) resetBtn.disabled = false;

  // Header status
  const roomEl = document.getElementById('room-label');
  const turnEl = document.querySelector('#status-label strong');
  const reqEl  = document.querySelector('#required-label strong');

  if (roomEl) roomEl.textContent = `Room: ${online ? (getMySide() ? '— (online)' : '—') : '—'}`;
  if (turnEl) turnEl.textContent = state.winner ? `${state.winner} (won)` : state.toMove ?? '—';
  if (reqEl)  reqEl.textContent  = (state.requiredColorIndex !== undefined)
      ? KANJI[state.requiredColorIndex]
      : '—';
}


function wireToolbar() {
  // Home: clicking the title
  if (titleEl) {
    titleEl.style.cursor = 'pointer';
    titleEl.addEventListener('click', () => {
      if (isOnline()) leaveRoom();
      // Go back to homepage (adjust path if needed)
      window.location.href = '/';
    });
  }

  // New Game
  btnNew.addEventListener('click', () => {
    if (isOnline()) {
      // In online, "new game" means go home and create/join again
      leaveRoom();
      window.location.href = '/';
      return;
    }
    // Local reset keeps the current size (SIZE from uiState)
    initLocalGame(SIZE as 8 | 10);
    updateToolbar();
  });

  // Undo / Redo
  btnUndo.addEventListener('click', () => {
    if (isOnline()) return; // disabled by updateToolbar anyway
    undo();
    updateToolbar();
  });
  btnRedo.addEventListener('click', () => {
    if (isOnline()) return;
    redo();
    updateToolbar();
  });

  // Fullscreen
  btnFS.addEventListener('click', async () => {
    const root = document.documentElement as any;
    const inFS = document.fullscreenElement != null;
    try {
      if (!inFS) {
        await root.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch (_) {
      // ignore; keep UI responsive
    }
  });
}

/* --------------------------- Click → cell map -------------------------- */

/** Pick the legal target nearest to a click (in canvas pixels). */
function nearestLegalTarget(clickPx: number, clickPy: number) {
  if (!state.legalTargets || state.legalTargets.length === 0) return null;
  const board = (window as any).__boardGeom;
  if (!board) return;  // not ready yet

  let best: { r: number; c: number; d2: number } | null = null;
  for (const t of state.legalTargets) {
    const cx = board.x + (t.c + 0.5) * board.tile;
    const cy = board.y + (t.r + 0.5) * board.tile;
    const dx = clickPx - cx, dy = clickPy - cy;
    const d2 = dx * dx + dy * dy;
    if (!best || d2 < best.d2) best = { r: t.r, c: t.c, d2 };
  }
  return best;
}

/* ------------------------------ Offline ------------------------------ */

function handleOfflineClick(r: number, c: number, clickPx: number, clickPy: number) {
  // If a piece is selected, try to move
  if (state.selectedIndex !== undefined && state.legalTargets.length) {
    // Friendly snapping to the nearest legal dot (within half-tile)
    const board = (window as any).__boardGeom;
    if (!board) return;  // not ready yet
    const snap = nearestLegalTarget(clickPx, clickPy);
    if (snap) {
      const withinHalfTile = Math.sqrt(snap.d2) <= board.tile * 0.5 + 0.5;
      if (withinHalfTile) {
        tryMoveTo(snap.r, snap.c);
        updateToolbar();
        return;
      }
    }
    // Or exact square
    if (state.legalTargets.some(t => t.r === r && t.c === c)) {
      tryMoveTo(r, c);
      updateToolbar();
      return;
    }
  }

  // Otherwise try selecting a piece (don’t let user select bot’s pieces)
  const idx = pieces.findIndex(p => p.pos.r === r && p.pos.c === c);
  if (idx === -1) return;
  const p = pieces[idx];

  if (BOT && p.owner === BOT) return;
  if (p.owner !== state.toMove) return;
  if (state.requiredColorIndex !== undefined && p.colorIndex !== state.requiredColorIndex) return;

  selectPieceAt(r, c);
}

/* ------------------------------ Online ------------------------------- */

function handleOnlineClick(r: number, c: number, clickPx: number, clickPy: number) {
  const me: Player | null = getMySide();
  if (!me || state.toMove !== me) return;

  if (state.selectedIndex !== undefined && state.legalTargets.length) {
    const board = (window as any).__boardGeom;
    if (!board) return;  // not ready yet
    const snap = nearestLegalTarget(clickPx, clickPy);
    if (snap) {
      const withinHalfTile = Math.sqrt(snap.d2) <= board.tile * 0.5 + 0.5;
      if (withinHalfTile) {
        const sel = pieces[state.selectedIndex];
        sendMove({ r: sel.pos.r, c: sel.pos.c }, { r: snap.r, c: snap.c });
        state.selectedIndex = undefined;
        state.legalTargets = [];
        return;
      }
    }
    if (state.legalTargets.some(t => t.r === r && t.c === c)) {
      const sel = pieces[state.selectedIndex];
      sendMove({ r: sel.pos.r, c: sel.pos.c }, { r, c });
      state.selectedIndex = undefined;
      state.legalTargets = [];
      return;
    }
  }

  const idx = pieces.findIndex(p => p.pos.r === r && p.pos.c === c);
  if (idx === -1) return;
  const p = pieces[idx];

  if (p.owner !== me) return;
  if (state.requiredColorIndex !== undefined && p.colorIndex !== state.requiredColorIndex) return;

  state.selectedIndex = idx;
  state.legalTargets = legalMovesForPiece(idx);
}

/* --------------------------- Canvas binding --------------------------- */

export function bindCanvasClicks(canvas: HTMLCanvasElement) {
  canvas.style.pointerEvents = 'auto';

  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();

    // Convert to canvas pixel space (accounts for CSS scaling & DPR)
    const px = (ev.clientX - rect.left) * (canvas.width  / rect.width);
    const py = (ev.clientY - rect.top)  * (canvas.height / rect.height);

    const board = (window as any).__boardGeom;
    if (!board) return;  // not ready yet

    // Local coords relative to the grid origin
    let lx = px - board.x;
    let ly = py - board.y;

    // ✅ Clamp inside the grid to avoid “outside” misses on bottom/top rows
    const EPS = 0.001;
    lx = Math.max(0, Math.min(lx, board.size - EPS));
    ly = Math.max(0, Math.min(ly, board.size - EPS));

    // Tile index (no center bias)
    const c = Math.floor(lx / board.tile);
    const r = Math.floor(ly / board.tile);

    if (MODE === 'online') handleOnlineClick(r, c, px, py);
    else                   handleOfflineClick(r, c, px, py);
  });
}

/* ------------------------------ Boot glue ----------------------------- */

export function initInput(canvas: HTMLCanvasElement) {
  wireToolbar();
  bindCanvasClicks(canvas);
  updateToolbar();
}
