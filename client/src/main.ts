// client/src/main.ts
import { MODE, SIZE, BOTTOM_OWNER, setSize, setBottomOwner } from './uiState';
import { initLocalGame } from './setup';
import { initInput, updateToolbar } from './input';
import { render, registerRenderer } from './render';
import { initOnlineGame } from './net/online';
import { botPlayIfNeeded } from './ai';

/* ------------ Canvas sizing (no render here) ------------ */
function attachCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const sideCSS = Math.max(100, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.92));
  const px = Math.max(100, Math.floor(sideCSS * dpr));
  canvas.style.width = `${sideCSS}px`;
  canvas.style.height = `${sideCSS}px`;
  canvas.width = px;
  canvas.height = px;
}

function onResize() {
  const canvas = document.getElementById('board') as HTMLCanvasElement | null;
  if (!canvas) return;
  attachCanvas(canvas);
  render();
}

/* ------------ Render loop ------------ */
function loop() {
  render();
  // IMPORTANT: only allow the bot to act in offline (single-player) mode.
  if (MODE !== 'online') botPlayIfNeeded();
  requestAnimationFrame(loop);
}

window.addEventListener('load', () => {
  const canvas = document.getElementById('board') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas #board not found');
    return;
  }

  // Prime state from uiState (uiState already read URL params)
  setSize(SIZE);
  setBottomOwner(BOTTOM_OWNER);

  // Let rules.ts trigger paints without importing render.ts directly
  registerRenderer(() => {
    render();
    updateToolbar();
  });

  // Layout canvas first
  attachCanvas(canvas);

  // Hook inputs and resize
  initInput(canvas);
  window.addEventListener('resize', onResize);

  if (MODE === 'online') {
    // ONLINE: do not start a local game, do not run the bot.
    // Show an empty/neutral board; online module will push the first snapshot.
    updateToolbar();
    render();                 // draws background until server snapshot arrives
    initOnlineGame();         // this will set pieces/state from the server
  } else {
    // OFFLINE (single-player or hotseat): start a fresh local game.
    initLocalGame();          // MUST create pieces on home rows
    updateToolbar();
    render();
  }

  requestAnimationFrame(loop);
});
