// client/src/main.ts
import { resizeBoard, render } from './render';
import { bindButtons, bindCanvasClicks } from './input';
import { registerRenderer, checkForcedPass } from './rules';
import { botPlayIfNeeded } from './ai';
import { MODE, BOT, state, anim } from './uiState';
import { initLocalGame } from './setup';
import { initOnlineGame } from './net/online';   // ← add this

window.addEventListener('load', () => {
  const canvas = document.getElementById('board') as HTMLCanvasElement | null;
  if (!canvas) throw new Error('#board canvas not found');

  resizeBoard();
  window.addEventListener('resize', resizeBoard);

  bindButtons();
  bindCanvasClicks(canvas);

  registerRenderer(() => { render(); });

  if (MODE === 'online') {
    initOnlineGame();        // ← online: wait for server snapshots
  } else {
    initLocalGame();         // ← offline: initialize pieces locally
  }

  render();
  requestAnimationFrame(gameLoop);
});

function gameLoop() {
  if (anim.active) render();

  if (MODE !== 'online' && BOT && state.toMove === BOT && !state.winner && !anim.active) {
    botPlayIfNeeded();
  }

  if (!state.winner && !anim.active) {
    checkForcedPass();
  }

  requestAnimationFrame(gameLoop);
}
