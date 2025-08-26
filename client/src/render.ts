// client/src/render.ts
import { SIZE, state, pieces, anim } from './uiState';
import type { Piece } from './types';
import { COLORS, KANJI } from './palette';
import { colorIdxAt } from '@shared/engine/boards';

const CANVAS_ID = 'board';

function getCanvas(): HTMLCanvasElement {
  const el = document.getElementById(CANVAS_ID) as HTMLCanvasElement | null;
  if (!el) throw new Error(`#${CANVAS_ID} canvas not found`);
  return el;
}

/** Resize canvas to be pixel-perfect & square within its container */
export function resizeBoard() {
  const canvas = getCanvas();
  // Fit within the main container while remaining square
  const parent = canvas.parentElement ?? document.body;
  const pr = window.devicePixelRatio || 1;

  // Leave some space for top/bottom UI rows if present
  const parentRect = parent.getBoundingClientRect();
  const maxCss = Math.min(parentRect.width, parentRect.height);

  // CSS size (logical pixels)
  const cssSize = Math.floor(maxCss);
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;

  // Backing store size (device pixels)
  canvas.width = Math.floor(cssSize * pr);
  canvas.height = Math.floor(cssSize * pr);
}

/** Main render entry */
export function render() {
  const canvas = getCanvas();
  const ctx = canvas.getContext('2d')!;
  if (!ctx) return;

  // HUD (keep text off the board)
  updateHud();

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Tile metrics
  const tileW = canvas.width / SIZE;
  const tileH = canvas.height / SIZE;

  // Draw board tiles
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const ci = colorIdxAt(SIZE as 8 | 10, r, c);
      ctx.fillStyle = COLORS[ci];
      ctx.fillRect(c * tileW, r * tileH, tileW, tileH);
    }
  }

  // Grid lines (subtle)
  ctx.lineWidth = Math.max(1, Math.floor(Math.min(tileW, tileH) * 0.02));
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  for (let r = 0; r <= SIZE; r++) {
    const y = r * tileH + 0.5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  for (let c = 0; c <= SIZE; c++) {
    const x = c * tileW + 0.5;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }

  // Legal move highlights (draw before pieces so pieces appear on top)
  drawHighlights(ctx, tileW, tileH);

  // Draw pieces (with optional bounce animation)
  for (let i = 0; i < pieces.length; i++) {
    drawPiece(ctx, i, tileW, tileH);
  }

  // Selection ring on top
  drawSelection(ctx, tileW, tileH);
}

/* ---------------------------- HUD helpers ---------------------------- */

function updateHud() {
  const statusEl = document.getElementById('status-label');
  const reqEl = document.getElementById('required-label');

  if (statusEl) {
    const base = state.winner
      ? `${state.winner} wins!`
      : `Turn: ${state.toMove}`;
    statusEl.textContent = state.message ? `${base} — ${state.message}` : base;
  }

  if (reqEl) {
    if (state.requiredColorIndex === undefined) {
      reqEl.textContent = 'Required: —';
    } else {
      const kanji = KANJI[state.requiredColorIndex] ?? '?';
      reqEl.textContent = `Required: ${kanji}`;
    }
  }
}

/* ---------------------------- Drawing bits --------------------------- */

function drawHighlights(ctx: CanvasRenderingContext2D, tileW: number, tileH: number) {
  // Legal target dots
  if (state.legalTargets?.length) {
    const radius = Math.min(tileW, tileH) * 0.16;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(1, Math.floor(radius * 0.25));
    for (const t of state.legalTargets) {
      const cx = t.c * tileW + tileW / 2;
      const cy = t.r * tileH + tileH / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, tileW: number, tileH: number) {
  if (state.selectedIndex === undefined) return;
  const p = pieces[state.selectedIndex];
  const x = p.pos.c * tileW;
  const y = p.pos.r * tileH;

  ctx.save();
  ctx.lineWidth = Math.max(3, Math.floor(Math.min(tileW, tileH) * 0.06));
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.strokeRect(x + 2, y + 2, tileW - 4, tileH - 4);

  ctx.lineWidth = Math.max(1, Math.floor(Math.min(tileW, tileH) * 0.03));
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.strokeRect(x + 2, y + 2, tileW - 4, tileH - 4);
  ctx.restore();
}

function drawPiece(ctx: CanvasRenderingContext2D, idx: number, tileW: number, tileH: number) {
  const p: Piece = pieces[idx];
  const x = p.pos.c * tileW;
  const y = p.pos.r * tileH;

  // Animation (pass bounce): vertical offset
  let yOffset = 0;
  if (anim.active && anim.pieceIndex === idx) {
    const t = Math.min(1, (performance.now() - anim.start) / anim.duration);
    const eased = easeInOut(t);
    const amp = tileH * 0.12; // bounce amplitude
    yOffset = Math.sin(eased * Math.PI) * -amp; // up and back down
  }

  const cx = x + tileW / 2;
  const cy = y + tileH / 2 + yOffset;
  const radius = Math.min(tileW, tileH) * 0.36;

  // Disk background: black or white by owner
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = p.owner === 'White' ? '#ffffff' : '#111111';
  ctx.fill();

  // subtle rim
  ctx.lineWidth = Math.max(2, Math.floor(radius * 0.15));
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.stroke();

  // Kanji glyph in the piece's COLOR (high contrast against disk)
  ctx.fillStyle = COLORS[p.colorIndex] ?? '#ff00ff';
  ctx.font = `${Math.floor(radius * 1.3)}px "Noto Sans JP", "Yu Gothic", "Hiragino Kaku Gothic Pro", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = p.owner === 'White' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.25)';
  ctx.shadowBlur = Math.floor(radius * 0.2);
  ctx.fillText(KANJI[p.colorIndex] ?? '?', cx, cy);
  ctx.restore();
}

/* ---------------------------- Utilities --------------------------- */

function easeInOut(t: number) {
  // smootherstep
  return t * t * t * (t * (t * 6 - 15) + 10);
}
