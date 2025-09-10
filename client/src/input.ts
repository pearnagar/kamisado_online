import { initLocalGame } from './setup';
import { undo, redo, past, future } from './history';
import { tryMoveTo, selectPieceAt } from './rules';
import { boardCoordFromMouse } from './render';
import { state, MODE } from './uiState';

// Track hover position for visual feedback
let hoverPosition: { r: number; c: number } | null = null;

// Store the render function reference to avoid circular imports
let renderFunction: (() => void) | null = null;

/** Set the render function to call for updates */
export function setRenderFunction(fn: () => void) {
  renderFunction = fn;
}

/** Clear history and start new game */
function startNewGame() {
  // Clear undo/redo history arrays
  past.length = 0;
  future.length = 0;
  
  // Initialize new local game
  initLocalGame();
  updateToolbar();
  
  // Re-render to show the new game state
  if (renderFunction) renderFunction();
}

/** Toolbar state (enable/disable) */
export function updateToolbar() {
  const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement | null;
  const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement | null;
  const newBtn = document.getElementById('reset-btn') as HTMLButtonElement | null;

  // For online games, disable undo/redo and new game
  if (MODE === 'online') {
    if (undoBtn) undoBtn.disabled = true;
    if (redoBtn) redoBtn.disabled = true;
    if (newBtn) newBtn.disabled = true;
    return;
  }

  // For local games, check if we have history to enable/disable buttons
  if (undoBtn) undoBtn.disabled = past.length === 0;
  if (redoBtn) redoBtn.disabled = future.length === 0;
  if (newBtn) newBtn.disabled = false;
}

/** Fullscreen toggle */
function toggleFullscreen() {
  const root = document.documentElement;
  if (!document.fullscreenElement) root.requestFullscreen().catch(() => {});
  else document.exitFullscreen().catch(() => {});
}

/** Get current hover position for rendering */
export function getHoverPosition() {
  return hoverPosition;
}

/** Hook up canvas + toolbar inputs */
export function initInput(canvas: HTMLCanvasElement) {
  // ----- Canvas clicks/taps -----
  const handlePoint = (clientX: number, clientY: number) => {
    const pt = boardCoordFromMouse(canvas, clientX, clientY);
    if (!pt) return;

    // First try to move (if a legal target); otherwise select
    const moved = tryMoveTo(pt.r, pt.c);
    if (!moved) selectPieceAt(pt.r, pt.c);
    
    // Update toolbar after any interaction
    updateToolbar();
  };

  canvas.addEventListener('mousedown', (e) => {
    handlePoint(e.clientX, e.clientY);
  });

  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (t) handlePoint(t.clientX, t.clientY);
  }, { passive: true });

  // ----- Mouse hover for visual feedback -----
  canvas.addEventListener('mousemove', (e) => {
    const pos = boardCoordFromMouse(canvas, e.clientX, e.clientY);
    hoverPosition = pos;
    if (renderFunction) renderFunction(); // Re-render to show hover effect
  });

  canvas.addEventListener('mouseleave', () => {
    hoverPosition = null;
    if (renderFunction) renderFunction(); // Clear hover effect
  });

  // ----- Toolbar buttons -----
  const homeBtn = document.getElementById('home-btn') as HTMLButtonElement | null;
  const newBtn  = document.getElementById('reset-btn') as HTMLButtonElement | null;
  const undoBtn = document.getElementById('undo-btn')  as HTMLButtonElement | null;
  const redoBtn = document.getElementById('redo-btn')  as HTMLButtonElement | null;
  const fsBtn   = document.getElementById('fs-btn')    as HTMLButtonElement | null;

  if (homeBtn) homeBtn.onclick = () => { 
    // Navigate to home page
    window.location.href = '/'; // or wherever your home page is
  };
  if (newBtn)  newBtn.onclick  = () => { startNewGame(); };
  if (undoBtn) undoBtn.onclick = () => { 
    undo(); 
    updateToolbar(); 
    if (renderFunction) renderFunction();
  };
  if (redoBtn) redoBtn.onclick = () => { 
    redo(); 
    updateToolbar(); 
    if (renderFunction) renderFunction();
  };
  if (fsBtn)   fsBtn.onclick   = toggleFullscreen;

  updateToolbar();
}