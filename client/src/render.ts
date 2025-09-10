// client/src/render.ts
import { state, pieces } from './uiState';
import { BOARD8, BOARD10 } from '../../shared/engine/boards';
import { COLORS, KANJI } from './palette';
import type { Geom } from './types';
import { getHoverPosition } from './input';

// ---------- NEW: cache the last geometry for hit-testing ----------
let lastGeom: Geom | null = null;

// Let render.ts register a repaint callback without circular deps
let _render = () => {};
export function registerRenderer(fn: () => void) { _render = fn; }

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

function computeGeom(canvas: HTMLCanvasElement) {
  // Get the canvas dimensions
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Calculate the maximum board size that fits in the canvas (keep original size)
  const maxSize = Math.min(canvasWidth, canvasHeight) * 0.9;
  
  // Calculate tile size
  const tileSize = maxSize / state.size;
  const boardSize = tileSize * state.size;
  
  // Center the board horizontally and push it down vertically
  const x = (canvasWidth - boardSize) / 2;
  const y = (canvasHeight - boardSize) / 2 + 40; // Just push down by 40px
  
  const geom: Geom = { 
    size: boardSize, 
    tile: tileSize, 
    x, 
    y 
  };
  
  lastGeom = geom;
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

function drawPieces(ctx: CanvasRenderingContext2D, g: Geom) {
  const TILE = g.tile;
  const radius = TILE / 2.2; // Slightly smaller for better proportions

  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    const x = g.x + p.pos.c * TILE + TILE / 2;
    const y = g.y + p.pos.r * TILE + TILE / 2;

    // Check if this piece is selected
    const isSelected = state.selectedIndex === i;

    // Draw shadow for depth
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, radius * 0.9, 0, 2 * Math.PI);
    ctx.fill();

    // Main piece circle (color background)
    ctx.fillStyle = COLORS[p.colorIndex];
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.85, 0, 2 * Math.PI);
    ctx.fill();

    // Add gradient effect to the color
    const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius * 0.85);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.85, 0, 2 * Math.PI);
    ctx.fill();

    // Player color ring (black or white)
    const isWhite = p.owner === 'White';
    ctx.strokeStyle = isWhite ? '#ffffff' : '#000000';
    ctx.lineWidth = radius * 0.12;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.75, 0, 2 * Math.PI);
    ctx.stroke();

    // Inner ring for contrast
    ctx.strokeStyle = isWhite ? '#cccccc' : '#333333';
    ctx.lineWidth = radius * 0.06;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.65, 0, 2 * Math.PI);
    ctx.stroke();

    // Selection highlight
    if (isSelected) {
      // Outer glow
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = radius * 0.15;
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.0, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Inner selection ring
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.lineWidth = radius * 0.08;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.95, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Kanji character
    const kanjiColor = isWhite ? '#000000' : '#ffffff';
    ctx.fillStyle = kanjiColor;
    ctx.font = `bold ${radius * 0.7}px "Shippori Mincho", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add text shadow for better readability
    ctx.shadowColor = isWhite ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    ctx.fillText(KANJI[p.colorIndex], x, y);

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Add a subtle highlight on top for 3D effect
    const topGradient = ctx.createRadialGradient(x - radius * 0.2, y - radius * 0.2, 0, x, y, radius * 0.4);
    topGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    topGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = topGradient;
    ctx.beginPath();
    ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.3, 0, 2 * Math.PI);
    ctx.fill();
  }
}
function drawLegalMoves(ctx: CanvasRenderingContext2D, g: Geom) {
  if (!state.legalTargets || state.legalTargets.length === 0) return;

  const TILE = g.tile;
  const radius = TILE / 4;

  for (const target of state.legalTargets) {
    const x = g.x + target.c * TILE + TILE / 2;
    const y = g.y + target.r * TILE + TILE / 2;

    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.arc(x + 1, y + 1, radius * 0.8, 0, 2 * Math.PI);
    ctx.fill();

    // Main circle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.8, 0, 2 * Math.PI);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.8, 0, 2 * Math.PI);
    ctx.stroke();

    // Inner dot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.3, 0, 2 * Math.PI);
    ctx.fill();

    // Subtle glow effect
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.8, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }
}

function drawHoverHighlight(ctx: CanvasRenderingContext2D, g: Geom, hoverPos: { r: number; c: number } | null) {
  if (!hoverPos) return;

  const TILE = g.tile;
  const x = g.x + hoverPos.c * TILE;
  const y = g.y + hoverPos.r * TILE;

  // Subtle animated glow effect
  const time = Date.now() * 0.003;
  const alpha = 0.1 + Math.sin(time) * 0.05;

  // Gradient highlight
  const gradient = ctx.createRadialGradient(
    x + TILE / 2, y + TILE / 2, 0,
    x + TILE / 2, y + TILE / 2, TILE / 2
  );
  gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha + 0.1})`);
  gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, TILE, TILE);
  
  // Border highlight
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha + 0.2})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
}
export function render() {
  // Check for win condition before rendering
  for (const p of pieces) {
    const opponentHomeRow = p.owner === 'White' ? 0 : state.size - 1;
    if (p.pos.r === opponentHomeRow) {
      if (!state.winner) {
        console.log(`Win detected during render: ${p.owner} wins!`);
        state.winner = p.owner;
        state.message = `${p.owner} wins!`;
        
        // Dispatch event to update UI
        document.dispatchEvent(new CustomEvent('game-over', { 
          detail: { winner: p.owner } 
        }));
      }
      break;
    }
  }
  
  const canvas = document.getElementById('board') as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const g = computeGeom(canvas);

  // Clear and draw background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw board
  drawBoard(ctx, g);

  // Draw hover highlight if any
  drawHoverHighlight(ctx, g, getHoverPosition());

  
  // Draw legal moves (behind pieces)
  drawLegalMoves(ctx, g);
  
  // Draw pieces (with selection highlighting)
  drawPieces(ctx, g);
}

// Add this function to debug the rendering colors

/**
 * Debug function to log the colors used in rendering
 */
export function debugRenderColors() {
  // Import the necessary modules
  import('./render').then((renderModule) => {
    // Log all exports from the render module
    console.log("Render module exports:", Object.keys(renderModule));
    
    // Try to find color-related variables
    for (const key of Object.keys(renderModule)) {
      const value = (renderModule as any)[key];
      if (typeof value === 'object' && value !== null) {
        console.log(`${key}:`, value);
      }
    }
  });
}

// Call this once during initialization
setTimeout(debugRenderColors, 1500);
