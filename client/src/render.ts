// client/src/render.ts
import { state, pieces } from './uiState';
import { BOARD8, BOARD10 } from '../../shared/engine/boards';
import { COLORS, KANJI } from './palette';

// Save a callback that rules.ts can call to force a repaint
let _externalInvalidate = () => {};
export function registerRenderer(cb: () => void) { _externalInvalidate = cb; }

type Geom = { x: number; y: number; size: number; tile: number };

// Compute board geom from the current canvas size and write it to window
function computeGeom(canvas: HTMLCanvasElement): Geom {
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cw = canvas.width;
  const ch = canvas.height;

  const side = Math.min(cw, ch);
  const totalPad = Math.floor(side * 0.05);      // 5% padding around grid
  const gridSize = Math.floor(side - totalPad);
  const x = Math.floor((cw - gridSize) / 2);
  const y = Math.floor((ch - gridSize) / 2);
  const tile = Math.floor(gridSize / state.size);

  const geom: Geom = { x, y, size: tile * state.size, tile };
  // Expose for input.ts hit-testing
  (window as any).__boardGeom = geom;
  return geom;
}

function drawBoard(ctx: CanvasRenderingContext2D, g: Geom) {
  // Background behind grid (subtle)
  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Frame
  ctx.fillStyle = '#22242c';
  ctx.fillRect(g.x - 8, g.y - 8, g.size + 16, g.size + 16);

  // Tiles
  const board = (state.size === 10 ? BOARD10 : BOARD8);
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      const ci = board[r][c];
      ctx.fillStyle = COLORS[ci];
      ctx.fillRect(g.x + c * g.tile, g.y + r * g.tile, g.tile, g.tile);
    }
  }
}

function drawPieces(ctx: CanvasRenderingContext2D, g: Geom) {
  // Selection highlights (legal targets)
  if (state.selectedIndex !== undefined) {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const t of state.legalTargets) {
      const cx = g.x + t.c * g.tile + g.tile / 2;
      const cy = g.y + t.r * g.tile + g.tile / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(6, g.tile * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Pieces
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    const cx = g.x + p.pos.c * g.tile + g.tile / 2;
    const cy = g.y + p.pos.r * g.tile + g.tile / 2;

    const radius = Math.max(10, g.tile * 0.38);
    const fg = p.owner === 'White' ? '#fff' : '#111';
    const stroke = p.owner === 'White' ? '#e7e7e7' : '#000';

    // Disc
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = g.tile * 0.06;
    ctx.shadowOffsetY = g.tile * 0.04;

    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = Math.max(2, g.tile * 0.05);
    ctx.strokeStyle = stroke;
    ctx.stroke();

    // Kanji
    ctx.fillStyle = p.owner === 'White' ? '#333' : '#eee';
    ctx.font = `${Math.floor(radius * 0.9)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(KANJI[p.colorIndex], cx, cy + (p.owner === 'White' ? -1 : 1));

    ctx.restore();

    // Selection ring
    if (i === state.selectedIndex) {
      ctx.strokeStyle = '#00ff99';
      ctx.lineWidth = Math.max(2, g.tile * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, radius + ctx.lineWidth, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

export function render() {
  const canvas = document.getElementById('board') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const g = computeGeom(canvas);

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Board + pieces (board will show even if pieces array is temporarily empty)
  drawBoard(ctx, g);
  drawPieces(ctx, g);
}
