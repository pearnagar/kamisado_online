// client/src/main.ts
import { MODE, state } from './uiState';
import { initLocalGame } from './setup';
import { initInput, updateToolbar } from './input';
import { render, registerRenderer } from './render';
import { initOnlineGame } from './net/online';

// Attach & size the canvas to the viewport, keeping it square and pixel-aligned.
function attachCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  const headerH = 48;  // matches game.html header padding/height
  const footerH = 40;  // matches game.html footer padding/height
  const usableW = window.innerWidth;
  const usableH = Math.max(0, window.innerHeight - headerH - footerH);

  const cssSide = Math.floor(Math.min(usableW, usableH));
  const pixelSide = Math.max(1, Math.floor(cssSide * dpr));

  canvas.style.width = `${cssSide}px`;
  canvas.style.height = `${cssSide}px`;
  canvas.width = pixelSide;
  canvas.height = pixelSide;

  // First render immediately after sizing
  render();
}

function onResize() {
  const canvas = document.getElementById('board') as HTMLCanvasElement | null;
  if (!canvas) return;
  attachCanvas(canvas);
}

function loop() {
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('load', () => {
  const canvas = document.getElementById('board') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas #board not found.');
    return;
  }

  // Allow rules.ts to trigger re-render
  registerRenderer(() => {
    render();
    updateToolbar();
  });

  // Size canvas and do an initial paint
  attachCanvas(canvas);

  // Wire inputs (buttons + clicks)
  initInput(canvas);

  // Always create a visible board immediately
  initLocalGame(8);

  // If this is the online page, start socket after we have something on screen
  if (MODE === 'online') {
    initOnlineGame();
  }

  // First status update
  updateToolbar();

  // Repaint on resize
  window.addEventListener('resize', onResize);

  // Animation loop (high-frequency re-paint keeps animations smooth)
  requestAnimationFrame(loop);
});
