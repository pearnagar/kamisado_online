// client/src/render.ts
import { state, pieces } from './uiState';
import { BOARD8, BOARD10 } from '../../shared/engine/boards';
import { COLORS, KANJI } from './palette';

// ---------- NEW: cache the last geometry for hit-testing ----------
type Geom = { x: number; y: number; size: number; tile: number };
let lastGeom: Geom | null = null;

// Save a callback that rules.ts can call to force a repaint
let _externalInvalidate = () => {};
export function registerRenderer(cb: () => void) { _externalInvalidate = cb; }

// ---------- NEW: expose mouse→board conversion ----------
/** Convert a mouse client position to board row/col, or null if outside. */
export function boardCoordFromMouse(canvas: HTMLCanvasElement, clientX: number, clientY: number)
  : { r: number; c: number } | null
{
  if (!lastGeom) return null;
  const rect = canvas.getBoundingClientRect();
  const gx = clientX - rect.left - lastGeom.x;
  const gy = clientY - rect.top  - lastGeom.y;

  if (gx < 0 || gy < 0) return null;
  const r = Math.floor(gy / lastGeom.tile);
  const c = Math.floor(gx / lastGeom.tile);

  if (r < 0 || c < 0 || r >= state.size || c >= state.size) return null;
  return { r, c };
}

// Compute board geom from the current canvas size and write it to window
function computeGeom(canvas: HTMLCanvasElement): Geom {
  const cw = canvas.width, ch = canvas.height;
  const side = Math.min(cw, ch);
  const totalPad = Math.floor(side * 0.05);      // 5% padding
  const gridSize = Math.max(1, Math.floor(side - totalPad));
  const size = (state.size === 10 || state.size === 8) ? state.size : 8;
  const tile = Math.max(1, Math.floor(gridSize / size));
  const sizePx = tile * size;
  const x = Math.floor((cw - sizePx) / 2);
  const y = Math.floor((ch - sizePx) / 2);

  const geom: Geom = { x, y, size: sizePx, tile };
  (window as any).__boardGeom = geom; // optional debug
  lastGeom = geom;                    // ---------- NEW: cache it ----------
  return geom;
}

function drawBoard(ctx: CanvasRenderingContext2D, g: Geom) {
  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.fillStyle = '#22242c';
  ctx.fillRect(g.x - 8, g.y - 8, g.size + 16, g.size + 16);

  const board = (state.size === 10 ? BOARD10 : BOARD8);
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      const ci = board[r][c];
      ctx.fillStyle = COLORS[ci];
      ctx.fillRect(g.x + c * g.tile, g.y + r * g.tile, g.tile, g.tile);
    }
  }
}

// ...rest of your file unchanged...
export function render() {
  // console.log('[render] tick'); // keep if you’re debugging
  const canvas = document.getElementById('board') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const g = computeGeom(canvas); // ---------- keeps `lastGeom` fresh ----------

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBoard(ctx, g);
  // your drawPieces(ctx, g) etc.
}
