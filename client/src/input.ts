// client/src/input.ts
import { state } from './uiState';
import { selectPieceAt, tryMoveTo } from './rules';
import { undo, redo } from './history';
import { resetLocalGame } from './setup';
import { KANJI } from './palette';
import { getBoardRect, boardCoordFromMouse } from './render';
import { isOnline, leaveRoom } from './net/online';

/** Initialize all UI inputs: canvas clicks + toolbar buttons + header home */
export function initInput(canvas: HTMLCanvasElement) {
  /* -------- Canvas click: select or move -------- */
  canvas.addEventListener('click', (e: MouseEvent) => {
    if (state.winner) return; // ignore after game over

    const rectPx = canvas.getBoundingClientRect();
    const board = getBoardRect(canvas);

    // Convert event client coords to canvas pixel coords
    const px = e.clientX - rectPx.left;
    const py = e.clientY - rectPx.top;

    const rc = boardCoordFromMouse({ x: px, y: py }, board);
    if (!rc) return;

    // If already selected & clicked a legal target → move; else → (re)select
    if (
      state.selectedIndex !== undefined &&
      state.legalTargets.some(t => t.r === rc.r && t.c === rc.c)
    ) {
      tryMoveTo(rc.r, rc.c);
    } else {
      selectPieceAt(rc.r, rc.c);
    }

    updateToolbar();
  });

  /* -------- Toolbar buttons -------- */
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement | null;
  const undoBtn  = document.getElementById('undo-btn')  as HTMLButtonElement | null;
  const redoBtn  = document.getElementById('redo-btn')  as HTMLButtonElement | null;
  const fsBtn    = document.getElementById('fs-btn')    as HTMLButtonElement | null;

  if (resetBtn) {
    resetBtn.onclick = () => {
      if (isOnline()) {
        // Treat "New Game" as leaving the online room and returning to local
        leaveRoom();
      } else {
        resetLocalGame();
      }
      updateToolbar();
    };
  }

  if (undoBtn) {
    undoBtn.onclick = () => {
      if (isOnline()) return; // disabled online
      undo();
      updateToolbar();
    };
  }

  if (redoBtn) {
    redoBtn.onclick = () => {
      if (isOnline()) return; // disabled online
      redo();
      updateToolbar();
    };
  }

  if (fsBtn) {
    fsBtn.onclick = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch {
        /* ignore */
      }
    };
  }

  /* -------- Header title → Home (index.html) -------- */
  const title = document.querySelector('header h1') as HTMLElement | null;
  if (title) {
    title.onclick = () => {
      window.location.href = '/';
    };
  }

  // Initial state for labels & button enables
  updateToolbar();
}

/** Update header labels and enable/disable toolbar buttons */
export function updateToolbar() {
  const online = isOnline();

  // Buttons enable/disable
  const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement | null;
  const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement | null;

  if (undoBtn) undoBtn.disabled = online;
  if (redoBtn) redoBtn.disabled = online;

  // Header labels
  const roomEl = document.getElementById('room-label');
  const turnEl = document.querySelector('#status-label strong') as HTMLElement | null;
  const reqEl  = document.querySelector('#required-label strong') as HTMLElement | null;

  if (roomEl) {
    roomEl.textContent = `Room: ${online ? '(online)' : '—'}`;
  }

  if (turnEl) {
    turnEl.textContent = state.winner ? `${state.winner} (won)` : state.toMove ?? '—';
  }

  if (reqEl) {
    reqEl.textContent =
      state.requiredColorIndex !== undefined ? KANJI[state.requiredColorIndex] : '—';
  }

  // Footer message (optional): keep whatever state.message says
  const msgEl = document.getElementById('msg');
  if (msgEl) {
    msgEl.textContent = state.message || 'Ready.';
  }
}
