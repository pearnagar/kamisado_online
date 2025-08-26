// client/src/input.ts
import { state, anim, SIZE, pieces, MODE, BOT, Piece } from './uiState'; // if your bundler needs extensions: './state.ts'
import { tryMoveTo, selectPieceAt } from './rules';
import { render } from './render';
import { undo, redo } from './history';

// Online helpers (static import; harmless when offline)
import { getMySide, sendMove } from './net/online';

const ONLINE = new URLSearchParams(location.search).get('online') === '1';

/** Bind top/bottom buttons and shortcuts */
export function bindButtons() {
  // Reset
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement | null;
  resetBtn?.addEventListener('click', () => location.reload());

  // Fullscreen
  const fsBtn = document.getElementById('fs-btn') as HTMLButtonElement | null;
  function isFullscreen() {
    // @ts-ignore vendor prefixes
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function enterFullscreen(el: HTMLElement) {
    (el.requestFullscreen || (el as any).webkitRequestFullscreen)?.call(el);
  }
  function exitFullscreen() {
    (document.exitFullscreen || (document as any).webkitExitFullscreen)?.call(document);
  }
  function updateFsButton() {
    if (!fsBtn) return;
    fsBtn.textContent = isFullscreen() ? '⛶ Exit full screen' : '⛶ Full screen';
  }
  fsBtn?.addEventListener('click', () =>
    isFullscreen() ? exitFullscreen() : enterFullscreen(document.documentElement),
  );
  document.addEventListener('fullscreenchange', () => {
    updateFsButton();
    render();
  });
  // @ts-ignore Safari
  document.addEventListener('webkitfullscreenchange', () => {
    updateFsButton();
    render();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'f' && !anim.active) {
      isFullscreen() ? exitFullscreen() : enterFullscreen(document.documentElement);
    }
  });
  updateFsButton();

  // Undo / Redo
  const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement | null;
  const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement | null;

  if (ONLINE) {
    // Server is authoritative in online mode
    if (undoBtn) {
      undoBtn.disabled = true;
      undoBtn.title = 'Disabled in online mode';
    }
    if (redoBtn) {
      redoBtn.disabled = true;
      redoBtn.title = 'Disabled in online mode';
    }
  } else {
    undoBtn?.addEventListener('click', () => {
      undo();
      render();
    });
    redoBtn?.addEventListener('click', () => {
      redo();
      render();
    });
    // Keyboard: Ctrl/Cmd+Z (undo), Ctrl+Y or Shift+Ctrl/Cmd+Z (redo)
    window.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        render();
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
        render();
      }
    });
  }
}

/** Canvas clicks (accounts for CSS scaling & DPR) */
export function bindCanvasClicks(canvas: HTMLCanvasElement) {
  canvas.addEventListener('click', (e) => {
    if (state.winner || anim.active) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const tileW = canvas.width / SIZE;
    const tileH = canvas.height / SIZE;

    const c = Math.floor(x / tileW);
    const r = Math.floor(y / tileH);
    if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) return;

    const clickedIdx = pieces.findIndex((p: Piece) => p.pos.r === r && p.pos.c === c);

    /* --------------------------- ONLINE mode --------------------------- */
    if (ONLINE) {
      const me = getMySide();

      // Only interact on my turn
      if (state.toMove !== me) return;

      // Clicked empty square while selected → send move to server
      if (state.selectedIndex !== undefined && clickedIdx === -1) {
        const sel = pieces[state.selectedIndex];
        sendMove({ r: sel.pos.r, c: sel.pos.c }, { r, c });
        // Clear local selection to avoid stale highlights while waiting for server state
        state.selectedIndex = undefined;
        state.legalTargets = [];
        render();
        return;
      }

      // Clicked a piece → only allow selecting my own piece
      if (clickedIdx !== -1) {
        const pc = pieces[clickedIdx];
        if (pc.owner !== me) return;
        selectPieceAt(r, c); // rules guard requiredColor as usual
      }
      return;
    }

    /* ------------------------- OFFLINE modes --------------------------- */
    // In singleplayer: block while it's the bot's turn and block bot piece clicks entirely
    if (MODE === 'single' && BOT) {
      if (state.toMove === BOT) return;
      if (clickedIdx !== -1 && pieces[clickedIdx].owner === BOT) return;
    }

    // If I have a selection and clicked empty → attempt move
    if (state.selectedIndex !== undefined && clickedIdx === -1) {
      tryMoveTo(r, c);
      return;
    }

    // Otherwise attempt selection (rules.ts validates ownership/required color)
    selectPieceAt(r, c);
  });
}
