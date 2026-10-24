/**
 * The bright island. The plate is the whole picture: sky, sea, the main
 * island, and the three islets. Houses are painted into that picture, not
 * separate cutouts, so Pibo can be swapped without covering them twice.
 * x grows right, z grows down. The picture is 32 units wide and 18 tall,
 * with a little extra sky and sea above and below.
 */
export const PLATE_SRC = "assets/painted/plate.png";
export const PLATE_PIXELS = {
  pixelWidth: 2560,
  pixelHeight: 1632,
  worldW: 32,
  worldH: 20.4,
  pad: 48,
};
export const WALK_MASK_SRC = "assets/painted/walk-mask.png";

// Buildings live in the plate. An empty list keeps the old cutouts from
// drawing on top of them.
export const PAINTED_SPRITES = [];

export const LAYOUT = {
  start: { x: -0.8, z: 2.3 },
  home: { x: -8.0, z: 0.2 },
  tealHouse: { x: 0.25, z: -2.4 },
  lighthouse: { x: 8.5, z: -5.5 },
  lighthousePad: { x: 8.5, z: -2.8 },
  arcade: { x: 13.5, z: 1.2 },
  arcadeDoor: { x: 13.1, z: 3.55 },
  library: { x: -12.25, z: -5.9 },
  libraryDoor: { x: -12.25, z: -3.3 },
  companion: { x: -14, z: 1 },
  pino: { x: -13.5, z: 1.75 },
};

export const PLACEMENTS = PAINTED_SPRITES.map((sprite) => ({
  id: sprite.id,
  asset: sprite.id,
  x: sprite.x,
  z: sprite.z,
  depthBias: sprite.depthBias || 0,
}));
