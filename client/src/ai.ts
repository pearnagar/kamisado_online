// client/src/ai.ts
import { BOT, state, anim } from './uiState';
import { legalMovesForPiece, tryMoveTo } from './rules';

// Replace this stub with your existing search if you have one:
function pickAnyLegal(): { pieceIndex: number; to: { r: number; c: number } } | null {
  for (let i = 0; i < 64; i++) {
    if (!state.requiredColorIndex && state.selectedIndex !== undefined) break;
  }
  // simple enumerator:
  const indices = [...Array(32).keys()];
  for (const pi of indices) {
    // guard when pieces array is shorter
    try {
      const moves = legalMovesForPiece(pi);
      if (moves.length) return { pieceIndex: pi, to: moves[0] };
    } catch { /* ignore invalid indices */ }
  }
  return null;
}

export function botPlayIfNeeded() {
  if (!BOT) return;                    // no bot configured (hotseat)
  if (state.toMove !== BOT) return;    // not bot's turn
  if (anim.active) return;             // wait for animation to finish
  if (state.winner) return;

  const mv = pickAnyLegal();           // or your AI search result here
  if (!mv) return;

  // programmatic move uses the same guardrails as the UI:
  state.selectedIndex = mv.pieceIndex;
  state.legalTargets = legalMovesForPiece(mv.pieceIndex);
  tryMoveTo(mv.to.r, mv.to.c);
}
