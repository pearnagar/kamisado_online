// client/src/input.ts
import { pieces, state, MODE, BOT, SIZE } from './uiState';
import type { Player } from './types';
import { selectPieceAt, tryMoveTo, legalMovesForPiece } from './rules';
import { undo, redo, past, future } from './history';
import { initLocalGame } from './setup';
import { getMySide, sendMove } from './net/online';

/* ------------------------------------------------------------------ */
/* Toolbar binding & state                                             */
/* ------------------------------------------------------------------ */

let bound = false;
let resetBtn: HTMLButtonElement | null = null;
let undoBtn:  HTMLButtonElement | null = null;
let redoBtn:  HTMLButtonElement | null = null;
let fsBtn:    HTMLButtonElement | null = null;

/** Enable/disable buttons based on mode & history stacks */
export function updateToolbar() {
  if (!bound) return;

  const online = MODE === 'online';

  // Reset allowed only offline (server controls new game in online mode)
  if (resetBtn) {
    resetBtn.disabled = online;
    resetBtn.title = online ? 'Disabled in online mode' : 'Start a new local game';
  }

  // Undo / Redo only offline and depend on history stacks
  if (undoBtn) {
    undoBtn.disabled = online || past.length === 0;
    undoBtn.title = online ? 'Disabled in online mode' : 'Undo last move';
  }
  if (redoBtn) {
    redoBtn.disabled = online || future.length === 0;
    redoBtn.title = online ? 'Disabled in online mode' : 'Redo move';
  }

  // Fullscreen always enabled
  if (fsBtn) {
    fsBtn.disabled = false;
    fsBtn.title = 'Toggle fullscreen';
  }
}

/** Bind toolbar buttons once */
export function bindButtons() {
  if (bound) return; // guard against hot-reload double binds

  resetBtn = document.getElementById('reset-btn') as HTMLButtonElement | null;
  undoBtn  = document.getElementById('undo-btn')  as HTMLButtonElement | null;
  redoBtn  = document.getElementById('redo-btn')  as HTMLButtonElement | null;
  fsBtn    = document.getElementById('fs-btn')    as HTMLButtonElement | null;

  // New game (offline only)
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (MODE === 'online') {
        alert('New game is controlled by the server in online mode.\nCreate or join from the homepage.');
        return;
      }
      initLocalGame();
      updateToolbar();
    });
  }

  // Undo / Redo (offline only)
  if (undoBtn) {
    undoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (MODE !== 'online') {
        undo();
        updateToolbar();
      }
    });
  }
  if (redoBtn) {
    redoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (MODE !== 'online') {
        redo();
        updateToolbar();
      }
    });
  }

  // Fullscreen toggle (works in any mode)
  if (fsBtn) {
    fsBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const doc: any = document;
      const root: any = document.documentElement;
      const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
      try {
        if (!isFs) {
          if (root.requestFullscreen) await root.requestFullscreen();
          else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
          else if (root.msRequestFullscreen) await root.msRequestFullscreen();
        } else {
          if (doc.exitFullscreen) await doc.exitFullscreen();
          else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
          else if (doc.msExitFullscreen) await doc.msExitFullscreen();
        }
      } catch {
        /* ignore */
      }
    });
  }

  bound = true;
  updateToolbar();
}

/* ------------------------------------------------------------------ */
/* Board click handling                                                */
/* ------------------------------------------------------------------ */

/** Bind click handling on the game canvas */
export function bindCanvasClicks(canvas: HTMLCanvasElement) {
  canvas.style.pointerEvents = 'auto';

  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const y = (ev.clientY - rect.top)  * (canvas.height / rect.height);

    const tileW = canvas.width  / SIZE;
    const tileH = canvas.height / SIZE;
    const c = Math.floor(x / tileW);
    const r = Math.floor(y / tileH);
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;

    if (MODE === 'online') {
      handleOnlineClick(r, c);
    } else {
      handleOfflineClick(r, c);
    }
  });
}

/* ----------------------------- Offline ------------------------------ */

function handleOfflineClick(r: number, c: number) {
  // If a legal target is clicked while a piece is selected → move
  if (
    state.selectedIndex !== undefined &&
    state.legalTargets.some((t) => t.r === r && t.c === c)
  ) {
    tryMoveTo(r, c);
    updateToolbar(); // history changed
    return;
  }

  // Otherwise try to select a piece (block selecting bot's pieces)
  const idx = pieces.findIndex((p) => p.pos.r === r && p.pos.c === c);
  if (idx === -1) return;

  const p = pieces[idx];
  if (BOT && p.owner === BOT) return; // can't select bot's piece in singleplayer
  if (p.owner !== state.toMove) return;
  if (state.requiredColorIndex !== undefined && p.colorIndex !== state.requiredColorIndex) return;

  selectPieceAt(r, c);
}

/* ------------------------------ Online ------------------------------ */

function handleOnlineClick(r: number, c: number) {
  const me: Player | null = (typeof getMySide === 'function') ? getMySide() : null;
  if (!me || state.toMove !== me) return;

  if (state.selectedIndex !== undefined) {
    const sel = pieces[state.selectedIndex];
    const legal = legalMovesForPiece(state.selectedIndex);
    if (legal.some((t) => t.r === r && t.c === c)) {
      // Send to server; server will broadcast a fresh snapshot
      sendMove({ r: sel.pos.r, c: sel.pos.c }, { r, c });
      // Clear local highlights
      state.selectedIndex = undefined;
      state.legalTargets = [];
      return;
    }
  }

  const idx = pieces.findIndex((p) => p.pos.r === r && p.pos.c === c);
  if (idx === -1) return;

  const p = pieces[idx];
  if (p.owner !== me) return;
  if (state.requiredColorIndex !== undefined && p.colorIndex !== state.requiredColorIndex) return;

  state.selectedIndex = idx;
  state.legalTargets = legalMovesForPiece(idx);
}
