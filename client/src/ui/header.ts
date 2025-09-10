
import { state, isOnline, pieces } from '../uiState';
import { getMySide } from '../net/online';
import { COLORS, KANJI } from '../palette';

// Elements
const roomLabel = document.getElementById('room-label') as HTMLElement;
const roomCode = document.getElementById('room-code') as HTMLElement;
const turnPlayer = document.getElementById('turn-player') as HTMLElement;
const requiredColor = document.getElementById('required-color') as HTMLElement;
const messageElement = document.getElementById('game-message') as HTMLElement;

// Corrected color names based on the actual palette colors
const COLOR_NAMES = [
  'Orange',  // 0: #ff8c00
  'Blue',    // 1: #0080ff
  'Pink',    // 2: #ff0080
  'Green',   // 3: #008000
  'Yellow',  // 4: #ecec1fff
  'Purple',  // 5: #8b00ff
  'Red',     // 6: #ff0000
  'Brown',   // 7: #8b4513
  'Silver',  // 8: #c0c0c0
  'Gold'     // 9: rgba(255, 225, 57, 0.73)
];

/**
 * Update the header UI based on current game state
 */
export function updateHeader() {
  console.log("Updating header, winner state:", state.winner);
  
  // Show room code only in online mode
  if (isOnline()) {
    roomLabel.style.display = 'inline';
    const roomId = new URLSearchParams(location.search).get('room');
    roomCode.textContent = roomId || '—';
  } else {
    roomLabel.style.display = 'none';
  }

  // Handle winner state
  if (state.winner) {
    console.log(`Winner detected in header: ${state.winner}`);
    
    // Update turn indicator to show the winner
    turnPlayer.textContent = `${state.winner} won!`;
    turnPlayer.style.fontWeight = 'bold';
    turnPlayer.style.color = state.winner === 'White' ? '#fff' : '#000';
    turnPlayer.style.backgroundColor = state.winner === 'White' ? '#333' : '#ddd';
    turnPlayer.style.padding = '5px 10px';
    turnPlayer.style.borderRadius = '5px';
    
    // Clear required color when game is over
    requiredColor.textContent = '—';
    
    // Create or update game over overlay
    showGameOverOverlay(state.winner);
    
    return; // Stop further updates when there's a winner
  } else {
    // Reset turn indicator styling
    turnPlayer.style.fontWeight = '';
    turnPlayer.style.color = '';
    turnPlayer.style.backgroundColor = '';
    turnPlayer.style.padding = '';
    turnPlayer.style.borderRadius = '';
    
    // Hide game over overlay if it exists
    hideGameOverOverlay();
  }

  // Update turn indicator for ongoing game
  if (isOnline()) {
    const mySide = getMySide();
    if (mySide === state.toMove) {
      turnPlayer.textContent = `${state.toMove} (You)`;
    } else {
      turnPlayer.textContent = `${state.toMove} (Opponent)`;
    }
  } else {
    turnPlayer.textContent = state.toMove;
  }

  // Update required color - directly use the color index with corrected names
  if (state.requiredColorIndex !== undefined) {
    if (state.requiredColorIndex >= 0 && state.requiredColorIndex < COLOR_NAMES.length) {
      requiredColor.textContent = COLOR_NAMES[state.requiredColorIndex];
    } else {
      requiredColor.textContent = `Unknown (${state.requiredColorIndex})`;
    }
  } else {
    requiredColor.textContent = 'Any';
  }
  
  // Clear any previous winner message
  if (messageElement) {
    messageElement.style.display = 'none';
  }
}

/**
 * Show a game over overlay with the winner
 */
function showGameOverOverlay(winner: string) {
  let overlay = document.getElementById('game-over-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '1000';
    
    const message = document.createElement('div');
    message.textContent = `${winner} wins!`;
    message.style.backgroundColor = '#fff';
    message.style.padding = '20px 40px';
    message.style.borderRadius = '10px';
    message.style.fontSize = '2em';
    message.style.fontWeight = 'bold';
    message.style.textAlign = 'center';
    
    overlay.appendChild(message);
    document.body.appendChild(overlay);
  } else {
    const message = overlay.querySelector('div');
    if (message) {
      message.textContent = `${winner} wins!`;
    }
    overlay.style.display = 'flex';
  }
  
  console.log("Game over overlay displayed for winner:", winner);
}

/**
 * Hide the game over overlay
 */
function hideGameOverOverlay() {
  const overlay = document.getElementById('game-over-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

/**
 * Create a message element if it doesn't exist
 */
function ensureMessageElement() {
  if (!document.getElementById('game-message')) {
    const messageEl = document.createElement('div');
    messageEl.id = 'game-message';
    messageEl.style.display = 'none';
    messageEl.style.position = 'absolute';
    messageEl.style.top = '50%';
    messageEl.style.left = '50%';
    messageEl.style.transform = 'translate(-50%, -50%)';
    messageEl.style.zIndex = '1000';
    messageEl.style.fontSize = '24px';
    
    document.body.appendChild(messageEl);
  }
}

// Call this once during initialization
setTimeout(ensureMessageElement, 500);

// Export a function to check if the game is over
export function isGameOver(): boolean {
  return !!state.winner;
}
