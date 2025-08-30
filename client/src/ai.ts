// client/src/ai.ts
import { state, anim, pieces, SIZE, BOTTOM_OWNER } from './uiState';
import type { Player } from './types';
import { tryMoveTo, legalMovesForPiece } from './rules';
import { colorIdxAt } from "../../shared/engine/boards";

/* ------------------- Helpers ------------------- */

function homeRowOf(owner: Player): number {
  return owner === BOTTOM_OWNER ? (SIZE - 1) : 0;
}

function dirs(owner: Player) {
  // Same convention as rules.ts: bottom owner moves "up" (r--), top owner moves "down" (r++)
  const dr = owner === BOTTOM_OWNER ? -1 : +1;
  return [{ dr, dc: 0 }, { dr, dc: -1 }, { dr, dc: 1 }];
}

function makeMoveProgrammatically(pieceIndex: number, to: { r: number; c: number }) {
  state.selectedIndex = pieceIndex;
  state.legalTargets = legalMovesForPiece(pieceIndex);
  tryMoveTo(to.r, to.c);
}

/* ------------------- Position model ------------------- */

type PMove = { pieceIndex: number; from: { r: number; c: number }; to: { r: number; c: number } };
type Pos = {
  pieces: { owner: Player; colorIndex: number; r: number; c: number }[];
  toMove: Player;
  required?: number;
};

const posFromCurrent = (): Pos => ({
  pieces: pieces.map(p => ({ owner: p.owner, colorIndex: p.colorIndex, r: p.pos.r, c: p.pos.c })),
  toMove: state.toMove,
  required: state.requiredColorIndex,
});

const posOccupied = (pos: Pos, r: number, c: number) =>
  pos.pieces.some(p => p.r === r && p.c === c);

function posLegalMovesForPiece(pos: Pos, i: number) {
  const P = pos.pieces[i];
  const out: { r: number; c: number }[] = [];
  const maxRay = SIZE === 10 ? 7 : Number.POSITIVE_INFINITY;

  for (const d of dirs(P.owner)) {
    let steps = 0;
    let r = P.r + d.dr, c = P.c + d.dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && !posOccupied(pos, r, c) && steps < maxRay) {
      out.push({ r, c });
      steps++;
      const nr = r + d.dr, nc = c + d.dc;
      if (!(nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) || posOccupied(pos, nr, nc) || steps >= maxRay) break;
      r = nr; c = nc;
    }
  }
  return out;
}

function allLegalMoves(pos: Pos): PMove[] {
  const res: PMove[] = [];
  const forced = pos.required;
  const cand = pos.pieces
    .map((p, i) => ({ p, i }))
    .filter(x => x.p.owner === pos.toMove && (forced === undefined || x.p.colorIndex === forced));
  for (const { p, i } of cand) {
    for (const to of posLegalMovesForPiece(pos, i)) res.push({ pieceIndex: i, from: { r: p.r, c: p.c }, to });
  }
  return res;
}

function applyMove(pos: Pos, m: PMove) {
  const P = pos.pieces[m.pieceIndex];
  const prevRequired = pos.required;

  P.r = m.to.r; P.c = m.to.c;

  const opp: Player = P.owner === 'White' ? 'Black' : 'White';
  const won = (m.to.r === homeRowOf(opp)) ? P.owner : undefined;

  const newReq = colorIdxAt(SIZE as 8 | 10, m.to.r, m.to.c);
  pos.toMove = pos.toMove === 'White' ? 'Black' : 'White';
  pos.required = newReq;

  return { prevRequired, switchedTo: pos.toMove, won, newRequired: newReq };
}

function undoMove(pos: Pos, m: PMove, info: { prevRequired?: number; switchedTo: Player }) {
  const P = pos.pieces[m.pieceIndex];
  P.r = m.from.r; P.c = m.from.c;
  pos.toMove = info.switchedTo === 'White' ? 'Black' : 'White';
  pos.required = info.prevRequired;
}

/* ------------------- Evaluation & Search ------------------- */

function evaluate(pos: Pos): number {
  let s = 0, center = (SIZE - 1) / 2;
  for (const p of pos.pieces) {
    // Distance to opponent's home row (orientation-agnostic)
    const opp: Player = p.owner === 'White' ? 'Black' : 'White';
    const distToGoal = Math.abs(p.r - homeRowOf(opp));
    s += (p.owner === pos.toMove ? -(distToGoal * 4) : +(distToGoal * 4));
    s += (p.owner === pos.toMove ? 1 : -1) * (-Math.abs(p.c - center));
  }
  if (pos.required !== undefined) {
    const idx = pos.pieces.findIndex(p => p.owner === pos.toMove && p.colorIndex === pos.required);
    if (idx !== -1) {
      const n = posLegalMovesForPiece(pos, idx).length;
      s += (n === 0 ? -12 : -Math.min(n, 4));
    }
  }
  return s;
}

function search(pos: Pos, depth: number, alpha: number, beta: number, end: number): number {
  if (performance.now() >= end) return evaluate(pos);
  if (depth === 0) return evaluate(pos);

  const moves = allLegalMoves(pos);
  if (!moves.length) return evaluate(pos);

  // Simple ordering: prefer longer forward advances
  moves.sort((a, b) => Math.abs(b.to.r - b.from.r) - Math.abs(a.to.r - a.from.r));

  let best = -Infinity;
  for (const m of moves) {
    const info = applyMove(pos, m);
    if (info.won) { undoMove(pos, m, info); return 10_000; }
    const v = -search(pos, depth - 1, -beta, -alpha, end);
    undoMove(pos, m, info);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
    if (performance.now() >= end) break;
  }
  return best;
}

function findBestMove(): PMove | null {
  const root = posFromCurrent();
  const end = performance.now() + 700;       // time budget (ms)
  const legal = allLegalMoves(root);
  if (!legal.length) return null;

  let best = legal[0], bestScore = -Infinity;

  for (let d = 1; d <= 3; d++) {             // search depths 1..3 with iterative deepening
    if (performance.now() >= end) break;

    let localBest = best, localScore = -Infinity;
    const ordered = [best, ...legal.filter(x => x !== best)];

    for (const m of ordered) {
      const info = applyMove(root, m);
      if (info.won) { undoMove(root, m, info); return m; }
      const v = -search(root, d - 1, -Infinity, Infinity, end);
      undoMove(root, m, info);

      if (v > localScore) { localScore = v; localBest = m; }
      if (performance.now() >= end) break;
    }

    if (localScore > bestScore) { bestScore = localScore; best = localBest; }
  }

  return best;
}

/* ------------------- Public entry ------------------- */

export function botPlayIfNeeded() {
  if (state.winner || anim.active) return;
  const mv = findBestMove();
  if (mv) makeMoveProgrammatically(mv.pieceIndex, mv.to);
}
