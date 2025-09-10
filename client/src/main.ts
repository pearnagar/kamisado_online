// client/src/main.ts
import { MODE, setSize, setBottomOwner } from './uiState';
import { initLocalGame } from './setup';
import { initInput, updateToolbar } from './input';
import { render, registerRenderer } from './render';
import { initOnlineGame } from './net/online';
import { botPlayIfNeeded } from './ai';
import { updateHeader } from './ui/header';

function getParams() {
  const qs = new URLSearchParams(window.location.search);
  const size: 8 | 10 = (qs.get('size') === '10') ? 10 : 8;
  const human = (qs.get('human') || 'white').toLowerCase();
  return { size, human: human === 'black' ? 'Black' : 'White' as 'White' | 'Black' };
}

function attachCanvas(canvas: HTMLCanvasElement) {
  // Get the canvas element's display size
  const rect = canvas.getBoundingClientRect();
  const displayWidth = rect.width;
  const displayHeight = rect.height;
  
  // Set the canvas internal size to match display size for crisp rendering
  const dpr = window.devicePixelRatio || 1;
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  
  // Scale the context to match device pixel ratio
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }
  
  // Set CSS size to match display size
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
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

    registerRenderer(() => { render(); updateToolbar(); updateHeader(); });

    // 1st paint path: size canvas, attach inputs, init local board, paint
    attachCanvas(canvas);
    initInput(canvas);
    initLocalGame();     // guarantees visible board + pieces
    updateToolbar();
    render();
    updateHeader();      // Initialize header right after first render

    // If ONLINE, connect afterwards (will replace state via snapshot)
    if (MODE === 'online') initOnlineGame();

    addEventListener('resize', onResize);
    requestAnimationFrame(loop);
  } catch (e) {
    showFatal(e);
  }
});
