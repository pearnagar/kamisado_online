// client/src/setup.ts
// Local game setup & reset helpers (used by main.ts + toolbar New Game button).

import { state, pieces, setSize } from './uiState';
import { BOARD8, BOARD10 } from '../../shared/engine/boards';

/**
 * Initialize a fresh local game with given board size.
 * @param size board size (8 or 10). If omitted, reuse current state.size.
 */
export function initLocalGame(size?: 8 | 10) {
  const sz = size ?? (state.size as 8 | 10);
  setSize(sz);

  pieces.length = 0;

  // Add White pieces (bottom)
  for (let c = 0; c < sz; c++) {
    const ci = (sz === 8 ? BOARD8[sz - 1][c] : BOARD10[sz - 1][c]);
    pieces.push({
      owner: 'White',
      colorIndex: ci,
      pos: { r: sz - 1, c },
    });
  }

  // Add Black pieces (top)
  for (let c = 0; c < sz; c++) {
    const ci = (sz === 8 ? BOARD8[0][c] : BOARD10[0][c]);
    pieces.push({
      owner: 'Black',
      colorIndex: ci,
      pos: { r: 0, c },
    });
  }

  // Reset state
  state.toMove = 'White';
  state.requiredColorIndex = undefined;
  state.selectedIndex = undefined;
  state.legalTargets = [];
  state.winner = undefined;
  state.message = 'New game started';
}

/** Reset the current local game while preserving the board size. */
export function resetLocalGame() {
  initLocalGame(state.size as 8 | 10);
}
