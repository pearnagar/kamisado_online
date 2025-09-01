// client/src/main.ts
import { render } from './render';
import { bindButtons, bindCanvasClicks, updateToolbar } from './input';
import { registerRenderer, checkForcedPass } from './rules';
import { MODE, state, anim, BOT } from './uiState';
import { initLocalGame } from './setup';
import { initOnlineGame } from './net/online';
import { botPlayIfNeeded } from './ai';

/* ---------------- Canvas sizing (always fit screen) ---------------- */

let canvas: HTMLCanvasElement;

/** Attach the canvas and set up responsive sizing */
export function attachCanvas(el: HTMLCanvasElement) {
  canvas = el;
  resizeBoard(); // initial size

  // Re-size on viewport & fullscreen changes
  window.addEventListener('resize', resizeBoard);
  window.addEventListener('orientationchange', resizeBoard);
  document.addEventListener('fullscreenchange', resizeBoard);
}

/** Pick the largest square that fits the viewport after UI chrome */
export function resizeBoard() {
  if (!canvas) return;

  // Cap DPR a bit for perf; remove Math.min(...) for full native DPR
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  const headerH =
    (document.querySelector('header') as HTMLElement)?.getBoundingClientRect().height || 0;
  const footerH =
    (document.querySelector('footer') as HTMLElement)?.getBoundingClientRect().height || 0;
  const toolbarH =
    (document.getElementById('toolbar') as HTMLElement)?.getBoundingClientRect().height || 0;

  const PAD = 16; // safe padding around the board

  const availW = window.innerWidth - PAD * 2;
  const availH = window.innerHeight - headerH - footerH - toolbarH - PAD * 3;

  const side = Math.max(280, Math.floor(Math.min(availW, availH)));

  // CSS layout size (logical pixels)
  canvas.style.width = `${side}px`;
  canvas.style.height = `${side}px`;

  // Actual bitmap size (device pixels) for crisp rendering
  canvas.width = Math.floor(side * dpr);
  canvas.height = Math.floor(side * dpr);

  render(); // redraw after resize
}

/* -------------------------------- Boot -------------------------------- */

window.addEventListener('load', () => {
  const el = document.getElementById('board') as HTMLCanvasElement | null;
  if (!el) {
    console.error('Canvas #board not found.');
    return;
  }

  // Canvas attach + resize behaviour
  attachCanvas(el);

  // UI bindings
  bindButtons();
  bindCanvasClicks(el);

  // Renderer callback (so rules.ts can re-render without circular deps)
  registerRenderer(() => {
    render();
    updateToolbar();
  });

  // Start the selected mode
  if (MODE === 'online') {
    initOnlineGame();   // server will push initial snapshot
  } else {
    initLocalGame();    // local pieces setup
  }

  // First paint + toolbar state
  render();
  updateToolbar();

  // Start the loop
  requestAnimationFrame(loop);
});

/* ------------------------------ Game loop ------------------------------ */

function loop() {
  // If there’s an animation, keep repainting smoothly
  if (anim.active) render();

  // Offline AI move (online is driven by server snapshots)
  if (MODE !== 'online' && BOT && state.toMove === BOT && !state.winner && !anim.active) {
    botPlayIfNeeded();
  }

  // Forced pass check (handles “blocked piece steps on itself” animation)
  if (!state.winner && !anim.active) {
    checkForcedPass();
  }

  requestAnimationFrame(loop);
}
