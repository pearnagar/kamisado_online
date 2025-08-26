// client/src/main.ts
import { resizeBoard, render } from './render';
import { bindButtons, bindCanvasClicks } from './input';
import { registerRenderer, checkForcedPass } from './rules';
import { botPlayIfNeeded } from './ai';
import { MODE, BOT, state, anim } from './uiState';

/* -------------------- Setup -------------------- */

window.addEventListener('load', () => {
  const canvas = document.getElementById('board') as HTMLCanvasElement | null;
  if (!canvas) throw new Error('#board canvas not found');

  // Resize to fit viewport
  resizeBoard();
  window.addEventListener('resize', resizeBoard);

  // Bind UI controls
  bindButtons();
  bindCanvasClicks(canvas);

  // Register render callback with rules.ts
  registerRenderer(() => {
    render();
  });

  // Initial draw
  render();

  // Kick off loop
  requestAnimationFrame(gameLoop);
});

/* -------------------- Loop -------------------- */

function gameLoop() {
  // Render continuously if animating
  if (anim.active) render();

  // Bot turn handling (singleplayer only)
  if (MODE === 'single' && BOT && state.toMove === BOT && !state.winner && !anim.active) {
    botPlayIfNeeded();
  }

  // Check for forced pass (blocked piece) once per turn
  if (!state.winner && !anim.active) {
    checkForcedPass();
  }

  requestAnimationFrame(gameLoop);
}
