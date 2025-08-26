// shared/engine/boards.ts

/** 8×8 color index board */
export const BOARD8: number[][] = [
  [0,1,2,3,4,5,6,7],
  [5,0,3,6,1,4,7,2],
  [6,3,0,5,2,7,4,1],
  [3,2,1,0,7,6,5,4],
  [4,5,6,7,0,1,2,3],
  [1,4,7,2,5,0,3,6],
  [2,7,4,1,6,3,0,5],
  [7,6,5,4,3,2,1,0],
];

/** 10×10 (Mega) color index board */
export const BOARD10: number[][] = [
  [0,5,6,8,4,3,9,1,2,7],
  [1,0,3,2,8,9,5,4,7,6],
  [2,8,0,3,6,1,4,7,9,5],
  [3,6,8,0,5,2,7,9,1,4],
  [9,3,2,1,0,7,6,5,4,8],
  [8,4,5,6,7,0,1,2,3,9],
  [4,1,9,7,2,5,0,8,6,3],
  [5,9,7,4,1,6,3,0,8,2],
  [6,7,4,5,9,8,2,3,0,1],
  [7,2,1,9,3,4,8,6,5,0],
];

/** Get board matrix for a given size */
export const boardForSize = (size: 8 | 10) => (size === 10 ? BOARD10 : BOARD8);

/** Read the color index at a square */
export const colorIdxAt = (size: 8 | 10, r: number, c: number) => boardForSize(size)[r][c];
