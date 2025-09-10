// client/src/ai.ts
import { legalMovesForPiece, tryMoveTo } from './rules';
import { BOT, state, anim, pieces } from './uiState';
import { isGameOver } from './ui/header';

/**
 * Find a legal move for the bot to play
 * This function respects the required color constraint and makes smarter choices
 */
function findBotMove(): { pieceIndex: number; to: { r: number; c: number } } | null {
  // Check if game is already over
  if (state.winner) {
    console.log("Game is already over, bot will not move");
    return null;
  }

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
  // First, check if the game is already over by examining the board
  if (checkForWin()) {
    console.log("Win detected, game is over");
    return;
  }
  
  if (!BOT) return;                    // no bot configured (hotseat)
  if (state.toMove !== BOT) return;    // not bot's turn
  if (anim.active) return;             // wait for animation to finish
  
  // Double-check if game is already over
  if (state.winner) {
    console.log("Game is already over, bot will not play");
    return;
  }

  const mv = findBotMove();            // find the best move
  if (!mv) return;                     // no legal moves available

  // Apply the move using the same mechanism as the UI
  state.selectedIndex = mv.pieceIndex;
  state.legalTargets = legalMovesForPiece(mv.pieceIndex);
  tryMoveTo(mv.to.r, mv.to.c);
  
  // Check if this move resulted in a win
  checkForWin();
}

/**
 * Check if any player has won the game by examining the board state
 * @returns true if a player has won, false otherwise
 */
function checkForWin(): boolean {
  // First check if winner is already set in state
  if (state.winner) {
    return true;
  }
  
  // Check if any piece has reached the opponent's home row
  for (const p of pieces) {
    const opponentHomeRow = p.owner === 'White' ? 0 : state.size - 1;
    
    if (p.pos.r === opponentHomeRow) {
      console.log(`WIN DETECTED in AI: ${p.owner} has a piece at opponent's home row`);
      
      // Update game state
      state.winner = p.owner;
      state.message = `${p.owner} wins!`;
      state.requiredColorIndex = undefined; // Clear required color on win
      
      // Dispatch event to update UI
      document.dispatchEvent(new CustomEvent('game-over', { 
        detail: { winner: p.owner } 
      }));
      
      return true;
    }
  }
  
  // If we get here, no win condition was found
  return false;
}
