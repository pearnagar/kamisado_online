// client/src/setup.ts
import { state, pieces, setSize, BOTTOM_OWNER } from './uiState';
import { BOARD8, BOARD10 } from '../../shared/engine/boards';

export function initLocalGame(size?: 8 | 10) {
  const sz = size ?? (state.size as 8 | 10);
  setSize(sz);

  pieces.length = 0;

  const bottom = BOTTOM_OWNER;
  const top: 'White' | 'Black' = bottom === 'White' ? 'Black' : 'White';

  // Bottom row index / Top row index
  const rBottom = sz - 1;
  const rTop = 0;

  const B = sz === 8 ? BOARD8 : BOARD10;

  // Bottom owner's pieces (placed on bottom row)
  for (let c = 0; c < sz; c++) {
    pieces.push({
      owner: bottom,
      colorIndex: B[rBottom][c],
      pos: { r: rBottom, c },
    });
  }

  // Top owner's pieces
  for (let c = 0; c < sz; c++) {
    pieces.push({
      owner: top,
      colorIndex: B[rTop][c],
      pos: { r: rTop, c },
    });
  }

  // White always starts (Kamisado rule)
  state.toMove = 'White';
  state.requiredColorIndex = undefined;
  state.selectedIndex = undefined;
  state.legalTargets = [];
  state.winner = undefined;
  state.message = 'New game started';
}

export function resetLocalGame() {
  initLocalGame(state.size as 8 | 10);
}
