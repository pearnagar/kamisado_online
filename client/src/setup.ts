// client/src/setup.ts
import { pieces, state, BOTTOM_OWNER, SIZE } from './uiState';
import { BOARD8, BOARD10 } from '../../shared/engine/boards';

export function initLocalGame() {
  // reset state
  pieces.length = 0;
  state.requiredColorIndex = undefined;
  state.selectedIndex = undefined;
  state.legalTargets = [];
  state.winner = undefined;
  state.message = 'Ready.';
  state.toMove = 'White';

  const board = SIZE === 10 ? BOARD10 : BOARD8;
  const bottom = BOTTOM_OWNER;
  const top = bottom === 'White' ? 'Black' : 'White';

  const topRow = 0;
  const botRow = SIZE - 1;

  for (let c = 0; c < SIZE; c++) {
    pieces.push({ owner: bottom, colorIndex: board[botRow][c], pos: { r: botRow, c } });
    pieces.push({ owner: top,    colorIndex: board[topRow][c], pos: { r: topRow, c } });
  }
}
