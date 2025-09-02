// client/src/uiState.ts
// Central reactive state for the game, shared by render, input, rules, etc.

import type { Player } from './types';

/** Which mode we’re running in. Set once at page load. */
export const MODE: 'offline' | 'online' =
  (window.location.pathname.includes('online') ? 'online' : 'offline');

/** Current board size (8 or 10). */
export let SIZE: 8 | 10 = 8;

/** Change board size (used by setup.ts). */
export function setSize(sz: 8 | 10) {
  SIZE = sz;
  state.size = sz;
}

/** Active pieces (both players). */
export const pieces: {
  owner: Player;
  colorIndex: number;
  pos: { r: number; c: number };
}[] = [];

/** Global animation state (for pass-step bounce). */
export const anim: {
  active: boolean;
  kind?: 'passStep';
  pieceIndex?: number;
  start: number;
  duration: number;
} = {
  active: false,
  start: 0,
  duration: 350,
};

/** Core mutable state. */
export const state: {
  size: 8 | 10;
  toMove: Player;
  requiredColorIndex?: number;
  selectedIndex?: number;
  legalTargets: { r: number; c: number }[];
  winner?: Player;
  message: string;
} = {
  size: SIZE,
  toMove: 'White',
  requiredColorIndex: undefined,
  selectedIndex: undefined,
  legalTargets: [],
  winner: undefined,
  message: 'Ready.',
};

/** If BOT is non-null, offline games have a computer opponent. */
export const BOT: Player | null = null; // for now, always human vs human in offline
