
import { state, isOnline, pieces } from '../uiState';
import { getMySide } from '../net/online';
import { COLORS, KANJI } from '../palette';

// Elements
const roomLabel = document.getElementById('room-label') as HTMLElement;
const roomCode = document.getElementById('room-code') as HTMLElement;
const turnPlayer = document.getElementById('turn-player') as HTMLElement;
const requiredColor = document.getElementById('required-color') as HTMLElement;

// Corrected color names based on the actual palette colors
const COLOR_NAMES = [
  'Orange',  // 0: #ff8c00
  'Blue',    // 1: #0080ff
  'Pink',    // 2: #ff0080 (was incorrectly labeled as Purple)
  'Green',   // 3: #008000 (was incorrectly labeled as Pink)
  'Yellow',  // 4: #ecec1fff
  'Purple',  // 5: #8b00ff (was incorrectly labeled as Red)
  'Red',     // 6: #ff0000 (was incorrectly labeled as Green)
  'Brown',   // 7: #8b4513
  'Silver',  // 8: #c0c0c0 (was incorrectly labeled as Gold)
  'Gold'     // 9: rgba(255, 225, 57, 0.73) (was incorrectly labeled as Silver)
];

/**
 * Update the header UI based on current game state
 */
export function updateHeader() {
  // Show room code only in online mode
  if (isOnline()) {
    roomLabel.style.display = 'inline';
    const roomId = new URLSearchParams(location.search).get('room');
    roomCode.textContent = roomId || '—';
  } else {
    roomLabel.style.display = 'none';
  }

  // Update turn indicator
  if (state.winner) {
    turnPlayer.textContent = `${state.winner} won`;
  } else {
    // In online mode, indicate if it's your turn
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
}
