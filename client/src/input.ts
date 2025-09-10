// client/src/input.ts
import { initLocalGame } from './setup';
import { undo, redo } from './history';
import { tryMoveTo, selectPieceAt } from './rules';
import { boardCoordFromMouse } from './render';
import { state } from './uiState';

/** Toolbar state (enable/disable) */
export function updateToolbar() {
  const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement | null;
  const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement | null;

  if (undoBtn) undoBtn.disabled = false; // if you track stacks, toggle here
  if (redoBtn) redoBtn.disabled = false;
}

/** Fullscreen toggle */
function toggleFullscreen() {
  const root = document.documentElement;
  if (!document.fullscreenElement) root.requestFullscreen().catch(() => {});
  else document.exitFullscreen().catch(() => {});
}

/** Hook up canvas + toolbar inputs */
export function initInput(canvas: HTMLCanvasElement) {
  // ----- Canvas clicks/taps -----
  const handlePoint = (clientX: number, clientY: number) => {
    const pt = boardCoordFromMouse(canvas, clientX, clientY); // <-- 3 args
    if (!pt) return;

    // First try to move (if a legal target); otherwise select
    const moved = tryMoveTo(pt.r, pt.c);
    if (!moved) selectPieceAt(pt.r, pt.c);
  };

  canvas.addEventListener('mousedown', (e) => {
    handlePoint(e.clientX, e.clientY);
  });

  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (t) handlePoint(t.clientX, t.clientY);
  }, { passive: true });

  // ----- Toolbar buttons -----
  const newBtn  = document.getElementById('reset-btn') as HTMLButtonElement | null;
  const undoBtn = document.getElementById('undo-btn')  as HTMLButtonElement | null;
  const redoBtn = document.getElementById('redo-btn')  as HTMLButtonElement | null;
  const fsBtn   = document.getElementById('fs-btn')    as HTMLButtonElement | null;

  if (newBtn)  newBtn.onclick  = () => { initLocalGame(); updateToolbar(); };
  if (undoBtn) undoBtn.onclick = () => { undo(); updateToolbar(); };
  if (redoBtn) redoBtn.onclick = () => { redo(); updateToolbar(); };
  if (fsBtn)   fsBtn.onclick   = toggleFullscreen;

  updateToolbar();
}
