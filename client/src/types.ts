// client/src/types.ts

/** Players / sides */
export type Player = 'White' | 'Black';

/** Board coordinate */
export type Pos = { r: number; c: number };

/** Canvas geometry for rendering the board */
export type Geom = {
  size: number; // canvas dimension
  tile: number; // tile size in pixels
  x: number;    // board top-left x
  y: number;    // board top-left y
};

/** UI-side piece shape (note: engine uses a different "PieceCore") */
export type Piece = {
  owner: Player;
  colorIndex: number;  // index into your color palette / board color map
  pos: Pos;            // current position on the board
};

/** Optional: game mode type used by the client */
export type Mode = 'single' | 'multi' | 'online';

/** Optional: target square used in selection and move lists */
export type Square = { r: number; c: number };
