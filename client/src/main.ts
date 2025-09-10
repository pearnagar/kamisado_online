// client/src/main.ts
import { MODE, setSize, setBottomOwner } from './uiState';
import { initLocalGame } from './setup';
import { initInput, updateToolbar } from './input';
import { render, registerRenderer } from './render';
import { initOnlineGame } from './net/online';
import { botPlayIfNeeded } from './ai';

function getParams() {
  const qs = new URLSearchParams(window.location.search);
  const size: 8 | 10 = (qs.get('size') === '10') ? 10 : 8;
  const human = (qs.get('human') || 'white').toLowerCase();
  return { size, human: human === 'black' ? 'Black' : 'White' as 'White' | 'Black' };
}

function attachCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssSide = Math.max(600, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.90)); // מינימום 600px
  const px = Math.floor(cssSide * dpr);

  canvas.style.width  = `${cssSide}px`;
  canvas.style.height = `${cssSide}px`;
  canvas.width  = px;
  canvas.height = px;
}


function onResize() {
  const canvas = document.getElementById('board') as HTMLCanvasElement | null;
  if (canvas) attachCanvas(canvas);
}

function loop() {
  try {
    render();
    if (MODE !== 'online') botPlayIfNeeded();
  } catch (e) {
    showFatal(e);
  }
  requestAnimationFrame(loop);
}

function showFatal(err: unknown) {
  console.error(err);
  const footer = document.getElementById('msg');
  if (footer) footer.textContent = `⚠️ ${String(err)}`;
}

// Ensure we don’t miss an exception during boot
window.addEventListener('error', ev => showFatal(ev.error ?? ev.message));
window.addEventListener('unhandledrejection', ev => showFatal(ev.reason ?? 'Unhandled promise rejection'));

window.addEventListener('load', () => {
  try {
    const canvas = document.getElementById('board') as HTMLCanvasElement | null;
    if (!canvas) throw new Error('Canvas #board not found');

    const { size, human } = getParams();
    setSize(size);
    setBottomOwner(human);

    registerRenderer(() => { render(); updateToolbar(); });

    // 1st paint path: size canvas, attach inputs, init local board, paint
    attachCanvas(canvas);
    initInput(canvas);
    initLocalGame();     // guarantees visible board + pieces
    updateToolbar();
    render();

    // If ONLINE, connect afterwards (will replace state via snapshot)
    if (MODE === 'online') initOnlineGame();

    addEventListener('resize', onResize);
    requestAnimationFrame(loop);
  } catch (e) {
    showFatal(e);
  }
});
