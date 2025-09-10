// client/src/ai.ts
import { legalMovesForPiece, tryMoveTo } from './rules';
import { BOT, state, anim, pieces } from './uiState';

/**
 * Find a legal move for the bot to play
 * This function respects the required color constraint and makes smarter choices
 */
function findBotMove(): { pieceIndex: number; to: { r: number; c: number } } | null {
  // If there's a required color, we must use a piece of that color
  if (state.requiredColorIndex !== undefined) {
    // Find the piece with the required color that belongs to the bot
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      if (piece.owner === BOT && piece.colorIndex === state.requiredColorIndex) {
        const moves = legalMovesForPiece(i);
        if (moves.length > 0) {
          // Find the best move - prefer moves that advance toward opponent's home row
          const bestMoves = moves.sort((a, b) => {
            // For White, lower row is better; for Black, higher row is better
            if (BOT === 'White') {
              return a.r - b.r; // White wants to go up (lower r)
            } else {
              return b.r - a.r; // Black wants to go down (higher r)
            }
          });
          
          return { pieceIndex: i, to: bestMoves[0] };
        }
        break; // If we found the piece but it has no moves, we're stuck
      }
    }
    
    // If we get here with a required color but couldn't find a move,
    // the bot should pass (handled by game rules)
    return null;
  } 
  // No required color - can use any piece
  else {
    // Find all pieces that belong to the bot and have legal moves
    const possibleMoves: { pieceIndex: number; to: { r: number; c: number }; score: number }[] = [];
    
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      if (piece.owner === BOT) {
        const moves = legalMovesForPiece(i);
        
        for (const move of moves) {
          let score = 0;
          
          // Prefer moves that advance toward opponent's home row
          if (BOT === 'White') {
            score -= move.r * 10; // White wants to go up (lower r)
          } else {
            score += move.r * 10; // Black wants to go down (higher r)
          }
          
          // Bonus for moves that could lead to a win
          const winRow = BOT === 'White' ? 0 : state.size - 1;
          if (move.r === winRow) {
            score += 1000;
          }
          
          possibleMoves.push({ pieceIndex: i, to: move, score });
        }
      }
    }
    
    // Sort by score (highest first) and return the best move
    if (possibleMoves.length > 0) {
      possibleMoves.sort((a, b) => b.score - a.score);
      return possibleMoves[0];
    }
  }
  
  return null;
}

/**
 * Make the bot play a move if it's the bot's turn
 */
export function botPlayIfNeeded() {
  if (!BOT) return;                    // no bot configured (hotseat)
  if (state.toMove !== BOT) return;    // not bot's turn
  if (anim.active) return;             // wait for animation to finish
  if (state.winner) return;            // game is over

  const mv = findBotMove();            // find the best move
  if (!mv) return;                     // no legal moves available

  // Apply the move using the same mechanism as the UI
  state.selectedIndex = mv.pieceIndex;
  state.legalTargets = legalMovesForPiece(mv.pieceIndex);
  tryMoveTo(mv.to.r, mv.to.c);
}
