// client/src/input.ts
import { pieces, state, MODE, BOT, BOTTOM_OWNER, SIZE } from './uiState';
import type { Player } from './types';
import { selectPieceAt, tryMoveTo, legalMovesForPiece } from './rules';
import { undo, redo } from './history';
import { initLocalGame } from './setup';

// Online helpers (only used in online mode)
import { getMySide, sendMove } from './net/online';

/* ----------------------------- Buttons ----------------------------- */

export function bindButtons() {
  const resetBtn = document.getElementById('reset-btn');
  const undoBtn  = document.getElementById('undo-btn');
  const redoBtn  = document.getElementById('redo-btn');
  const fsBtn    = document.getElementById('fs-btn');

  // Reset / New Game
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (MODE === 'online') {
        // In online mode the server is authoritative; simple UX note:
        alert('In online mode, new games are created from the home page or by reloading with ?online=1 (server controls state).');
        return;
      }
      initLocalGame();
    });
  }

  // Undo / Redo (disabled in online)
  if (undoBtn) {
    if (MODE === 'online') {
      (undoBtn as HTMLButtonElement).disabled = true;
      undoBtn.title = 'Disabled in online mode';
    } else {
      undoBtn.addEventListener('click', () => undo());
    }
  }
  if (redoBtn) {
    if (MODE === 'online') {
      (redoBtn as HTMLButtonElement).disabled = true;
      redoBtn.title = 'Disabled in online mode';
    } else {
      redoBtn.addEventListener('click', () => redo());
    }
  }

  // Fullscreen
  if (fsBtn) {
    fsBtn.addEventListener('click', async () => {
      const doc: any = document;
      const root = document.documentElement as any;
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
        // no-op; some browsers may block without user gesture
      }
    });
  }
}

/* ----------------------------- Canvas clicks ----------------------------- */

/**
 * Bind click handling on the board canvas.
 * - Offline: uses rules to move locally.
 * - Online: only sends moves for your side; server applies and broadcasts.
 */
export function bindCanvasClicks(canvas: HTMLCanvasElement) {
  canvas.addEventListener('click', ev => {
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const y = (ev.clientY - rect.top) * (canvas.height / rect.height);

    const tileW = canvas.width / SIZE;
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

/* ----------------------------- Offline logic ----------------------------- */

function handleOfflineClick(r: number, c: number) {
  // If there’s a selection and the user clicked a legal target → move
  if (state.selectedIndex !== undefined &&
      state.legalTargets.some(t => t.r === r && t.c === c)) {
    tryMoveTo(r, c);
    return;
  }

  // Otherwise, try selecting a piece (but not the bot's pieces in singleplayer)
  const idx = pieces.findIndex(p => p.pos.r === r && p.pos.c === c);
  if (idx === -1) return;

  const p = pieces[idx];

  // In singleplayer, don't allow clicking bot's pieces
  if (BOT && p.owner === BOT) return;

  // Must be the side to move
  if (p.owner !== state.toMove) return;

  // If a required color is set, enforce it
  if (state.requiredColorIndex !== undefined && p.colorIndex !== state.requiredColorIndex) return;

  selectPieceAt(r, c);
}

/* ----------------------------- Online logic ------------------------------ */

function handleOnlineClick(r: number, c: number) {
  const me: Player | null = getMySide?.() ?? null;
  if (!me) return;

  // Only allow actions on your turn
  if (state.toMove !== me) return;

  // If a piece is selected and target is legal → send move
  if (state.selectedIndex !== undefined) {
    const sel = pieces[state.selectedIndex];
    const legal = legalMovesForPiece(state.selectedIndex);
    if (legal.some(t => t.r === r && t.c === c)) {
      sendMove({ r: sel.pos.r, c: sel.pos.c }, { r, c });
      // Clear local selection; server will broadcast authoritative state
      state.selectedIndex = undefined;
      state.legalTargets = [];
      return;
    }
  }

  // Otherwise, try selecting one of *your* pieces
  const idx = pieces.findIndex(p => p.pos.r === r && p.pos.c === c);
  if (idx === -1) return;

  const p = pieces[idx];
  if (p.owner !== me) return;

  // Respect required color if set
  if (state.requiredColorIndex !== undefined && p.colorIndex !== state.requiredColorIndex) return;

  // Locally compute targets just for user feedback; server remains authoritative
  state.selectedIndex = idx;
  state.legalTargets = legalMovesForPiece(idx);
}
