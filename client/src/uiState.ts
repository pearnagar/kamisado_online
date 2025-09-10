// client/src/uiState.ts
import type { Player } from './types';

const qs = new URLSearchParams(location.search);

// ---- mode/size/human --------------------------------------------------------
export const MODE: 'offline' | 'online' =
  (qs.get('mode') || '').toLowerCase() === 'online' ? 'online' : 'offline';

export let SIZE: 8 | 10 = (qs.get('size') === '10') ? 10 : 8;
export function setSize(sz: 8 | 10) { SIZE = sz; state.size = sz; }

export let BOTTOM_OWNER: Player =
  (qs.get('human') || 'white').toLowerCase() === 'black' ? 'Black' : 'White';
export function setBottomOwner(p: Player) { BOTTOM_OWNER = p; }

// ---- runtime state ----------------------------------------------------------
export const pieces: { owner: Player; colorIndex: number; pos: { r: number; c: number } }[] = [];

export const anim = {
  active: false,
  kind: undefined as undefined | 'passStep',
  pieceIndex: undefined as number | undefined,
  start: 0,
  duration: 350,
};

export const state = {
  size: SIZE as 8 | 10,
  toMove: 'White' as Player,            // Kamisado rule
  requiredColorIndex: undefined as number | undefined,
  selectedIndex: undefined as number | undefined,
  legalTargets: [] as { r: number; c: number }[],
  winner: undefined as Player | undefined,
  message: 'Ready.',
};

// ---- BOT selection (single-player only) -------------------------------------
const botOn = (qs.get('bot') || '') === '1';
export const BOT: Player | null =
  (MODE === 'offline' && botOn) ? (BOTTOM_OWNER === 'White' ? 'Black' : 'White') : null;

// helpers
export const isOnline = () => MODE === 'online';
export const isBotsTurn = () => BOT !== null && state.toMove === BOT;
