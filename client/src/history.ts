// client/src/history.ts
import type { Player } from './types';
import { state, pieces } from './uiState';
import { colorIdxAt } from '@shared/engine/boards';

/* ------------------- Action types ------------------- */

export type MoveAction = {
  kind: 'move';
  pieceIndex: number;
  from: { r: number; c: number };
  to: { r: number; c: number };
  prevToMove: Player;
  prevRequired?: number;
  newRequired?: number;
  prevWinner?: Player;
  newWinner?: Player;
  prevMessage?: string;
  pieceColorIndex: number;
};

export type PassAction = {
  kind: 'pass';
  playerWhoPassed: Player;
  blockedPieceIndex: number;
  blockedColorIndex: number;
  blockedSquareColor: number;
  prevToMove: Player;
  prevRequired?: number;
  prevMessage?: string;
};

export type Action = MoveAction | PassAction;

/* ------------------- History stacks ------------------- */

export const past: Action[] = [];
export const future: Action[] = [];

/* ------------------- Helpers ------------------- */

export function pushAction(a: Action) {
  past.push(a);
  future.length = 0; // clear redo stack
}

export function undo() {
  const a = past.pop();
  if (!a) return;
  future.push(a);

  if (a.kind === 'move') {
    const p = pieces[a.pieceIndex];
    p.pos = { ...a.from };
    state.toMove = a.prevToMove;
    state.requiredColorIndex = a.prevRequired;
    state.winner = a.prevWinner;
    state.message = a.prevMessage || '';
    state.selectedIndex = undefined;
    state.legalTargets = [];
  } else {
    state.toMove = a.prevToMove;
    state.requiredColorIndex = a.prevRequired;
    state.message = a.prevMessage || '';
    state.selectedIndex = undefined;
    state.legalTargets = [];
  }
}

export function redo() {
  const a = future.pop();
  if (!a) return;
  past.push(a);

  if (a.kind === 'move') {
    const p = pieces[a.pieceIndex];
    p.pos = { ...a.to };
    state.requiredColorIndex = a.newRequired;
    state.selectedIndex = undefined;
    state.legalTargets = [];
    if (a.newWinner) {
      state.winner = a.newWinner;
      state.message = `${a.newWinner} wins!`;
    } else {
      state.toMove = a.prevToMove === 'White' ? 'Black' : 'White';
      state.message = '';
    }
  } else {
    state.toMove = a.prevToMove === 'White' ? 'Black' : 'White';
    state.requiredColorIndex = a.blockedSquareColor;
    state.message = `Required color changes to ???`;
    state.selectedIndex = undefined;
    state.legalTargets = [];
  }
}

/* ------------------- Move recorder ------------------- */

export function recordMove(pieceIndex: number, from: { r: number; c: number }, to: { r: number; c: number }) {
  const p = pieces[pieceIndex];
  const prevToMove = state.toMove;
  const prevRequired = state.requiredColorIndex;
  const prevWinner = state.winner;
  const prevMessage = state.message;

  const newRequired = colorIdxAt(state.toMove === 'White' && pieces.length > 64 ? 10 : 8, to.r, to.c);
  const opp: Player = p.owner === 'White' ? 'Black' : 'White';
  const winsNow = (to.r === (opp === 'White' ? 0 : (state.toMove === 'White' ? pieces.length ** 0.5 - 1 : 0)));

  const action: MoveAction = {
    kind: 'move',
    pieceIndex,
    from,
    to,
    prevToMove,
    prevRequired,
    newRequired,
    prevWinner,
    newWinner: winsNow ? p.owner : undefined,
    prevMessage,
    pieceColorIndex: p.colorIndex,
  };
  pushAction(action);
}
