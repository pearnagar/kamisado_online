// client/src/uiState.ts
import type { Player } from './types'; // if your bundler needs extensions: './types.ts'

/** URL params */
const params = new URLSearchParams(location.search);
const sizeParam = params.get('size');
const modeParam = params.get('mode');
const onlineParam = params.get('online');
const humanSideParam = (params.get('human') || '').toLowerCase(); // 'white' | 'black'

/** Board size */
export const SIZE: 8 | 10 = (sizeParam === '10' ? 10 : 8);

/** Mode */
export const MODE: 'single' | 'multi' | 'online' =
  onlineParam === '1' ? 'online' : (modeParam === 'multi' ? 'multi' : 'single');

/** Which side is at the bottom (human sits at bottom in offline modes; in online pass via URL if needed) */
export const BOTTOM_OWNER: Player =
  (humanSideParam === 'black') ? 'Black' : 'White';

/** Top owner derived from bottom owner */
export const TOP_OWNER: Player = (BOTTOM_OWNER === 'White') ? 'Black' : 'White';

/** Bot side (only in singleplayer; bot is the opposite of human/bottom) */
export const BOT: Player | null = (MODE === 'single') ? (BOTTOM_OWNER === 'White' ? 'Black' : 'White') : null;

/** Pieces the renderer reads (UI copy) */
export type Pos = { r: number; c: number };
export type Piece = { owner: Player; colorIndex: number; pos: Pos };
export const pieces: Piece[] = [];

/** UI game state (selection, highlights, HUD text) */
export type GameUIState = {
  toMove: Player;
  requiredColorIndex?: number;
  selectedIndex?: number;
  legalTargets: { r: number; c: number }[];
  winner?: Player;
  message?: string;
};
export const state: GameUIState = {
  toMove: 'White',            // White starts
  requiredColorIndex: undefined,
  selectedIndex: undefined,
  legalTargets: [],
  winner: undefined,
  message: '',
};

/** Tiny animation state (used by render.ts for bounce/pass, etc.) */
export type AnimKind = 'pulse' | 'passStep';
export const anim = {
  active: false,
  pieceIndex: -1,
  start: 0,
  duration: 420,
  kind: 'passStep' as AnimKind,
};
