// client/src/main.ts
import { MODE, setSize, setBottomOwner, state } from './uiState';
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

// Ensure we don't miss an exception during boot
window.addEventListener('error', ev => showFatal(ev.error ?? ev.message));
window.addEventListener('unhandledrejection', ev => showFatal(ev.reason ?? 'Unhandled promise rejection'));

// Listen for game-over events
document.addEventListener('game-over', (e) => {
  const customEvent = e as CustomEvent<{winner: string}>;
  console.log('Game over event received:', customEvent.detail);
  const { winner } = customEvent.detail;
  
  // Update UI to show game over state
  const turnElement = document.getElementById('turn-player');
  if (turnElement) {
    turnElement.textContent = `${winner} won!`;
    turnElement.style.fontWeight = 'bold';
  }
  
  // Check if overlay already exists
  const existingOverlay = document.getElementById('game-over-overlay');
  if (existingOverlay) {
    existingOverlay.style.display = 'flex';
    return;
  }
  
  // Create a game over overlay
  const overlay = document.createElement('div');
  overlay.id = 'game-over-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '1000';
  
  const message = document.createElement('div');
  message.textContent = `${winner} wins!`;
  message.style.backgroundColor = '#fff';
  message.style.padding = '20px 40px';
  message.style.borderRadius = '10px';
  message.style.fontSize = '2em';
  message.style.fontWeight = 'bold';
  
  // Add a close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.marginTop = '20px';
  closeButton.style.padding = '10px 20px';
  closeButton.style.fontSize = '1em';
  closeButton.style.cursor = 'pointer';
  closeButton.style.display = 'block';
  closeButton.style.margin = '20px auto 0';
  
  closeButton.addEventListener('click', () => {
    overlay.style.display = 'none';
  });
  
  const container = document.createElement('div');
  container.style.textAlign = 'center';
  container.appendChild(message);
  container.appendChild(closeButton);
  
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  
  // We don't need to set state.winner here as it should already be set
  // in the rules.ts file when the win condition is detected
});

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
