// client/src/setup.ts
import { pieces, state, SIZE, BOTTOM_OWNER } from './uiState';
import type { Player } from './types';
import { BOARD8, BOARD10 } from '../../shared/engine/boards';

export function initLocalGame() {
  // choose correct color-index grid
  const board = (SIZE === 10) ? BOARD10 : BOARD8;

  // clear any previous state
  pieces.length = 0;

  // owners
  const bottom: Player = BOTTOM_OWNER;
  const top: Player = (bottom === 'White') ? 'Black' : 'White';

  // top row (r = 0)
  for (let c = 0; c < SIZE; c++) {
    pieces.push({
      owner: top,
      colorIndex: board[0][c],
      pos: { r: 0, c },
    });
  }

  // bottom row (r = SIZE - 1)
  for (let c = 0; c < SIZE; c++) {
    pieces.push({
      owner: bottom,
      colorIndex: board[SIZE - 1][c],
      pos: { r: SIZE - 1, c },
    });
  }

  // reset turn/UI state
  state.toMove = 'White';                  // Kamisado: White always starts
  state.requiredColorIndex = undefined;
  state.winner = undefined;
  state.message = '';
  state.selectedIndex = undefined;
  state.legalTargets = [];
}
